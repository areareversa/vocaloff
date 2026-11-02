"use client";

/**
 * Armazenamento local-first do VocalOff.
 *
 * O áudio NUNCA vai para o Postgres. O banco guarda só metadados e o caminho
 * relativo (`storagePath`) dentro da pasta que o usuário escolher no dispositivo.
 *
 * 1. Se o navegador suportar File System Access (Chrome/Edge/Android), pedimos
 *    permissão e criamos a pasta `VocalOff` dentro da pasta escolhida.
 * 2. Se não suportar (Safari/Firefox), gravamos no IndexedDB do próprio navegador.
 *
 * Em ambos os casos o conteúdo sobrevive a fechar o navegador e reiniciar o PC.
 */

import { openDB, type IDBPDatabase } from "idb";

export type StorageType = "device" | "idb" | "remote";
export type PermissionStatus = "granted" | "prompt" | "denied" | "unsupported";

type FsPermission = { mode: "read" | "readwrite" };

interface FsWritable {
  write(data: Blob | BufferSource | string): Promise<void>;
  close(): Promise<void>;
  abort?(): Promise<void>;
}

interface FsFileHandle {
  createWritable(options?: { keepExistingData?: boolean }): Promise<FsWritable>;
  getFile(): Promise<File>;
}

export interface FsDirectoryHandle {
  name: string;
  getDirectoryHandle(name: string, options?: { create?: boolean }): Promise<FsDirectoryHandle>;
  getFileHandle(name: string, options?: { create?: boolean }): Promise<FsFileHandle>;
  removeEntry(name: string, options?: { recursive?: boolean }): Promise<void>;
  queryPermission?(descriptor?: FsPermission): Promise<PermissionStatus>;
  requestPermission?(descriptor?: FsPermission): Promise<PermissionStatus>;
}

declare global {
  interface Window {
    showDirectoryPicker?: (options?: {
      id?: string;
      mode?: "read" | "readwrite";
      startIn?: string;
    }) => Promise<FsDirectoryHandle>;
  }
}

const DB_NAME = "vocaloff";
const DB_VERSION = 1;
const ROOT_KEY = "root";
const FOLDER_LABEL_KEY = "vocaloff:folder";

interface StoreSchema {
  handles: { key: string; value: FsDirectoryHandle };
  files: { key: string; value: { path: string; blob: Blob; mime: string; savedAt: number } };
}

let dbPromise: Promise<IDBPDatabase<StoreSchema>> | null = null;

function getDb() {
  if (!dbPromise) {
    dbPromise = openDB<StoreSchema>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains("handles")) db.createObjectStore("handles");
        if (!db.objectStoreNames.contains("files")) db.createObjectStore("files", { keyPath: "path" });
      },
    });
  }
  return dbPromise;
}

export function supportsDeviceFolder() {
  return typeof window !== "undefined" && typeof window.showDirectoryPicker === "function";
}

/* -------------------------------------------------------------------------- */
/* Pasta no dispositivo                                                       */
/* -------------------------------------------------------------------------- */

async function storedRoot(): Promise<FsDirectoryHandle | null> {
  try {
    const db = await getDb();
    const handle = await db.get("handles", ROOT_KEY);
    return handle ?? null;
  } catch {
    return null;
  }
}

/** Abre (ou cria) a pasta VocalOff dentro da pasta escolhida pelo usuário. */
export async function connectFolder(): Promise<{ folderName: string }> {
  if (!supportsDeviceFolder()) {
    throw new Error("Este navegador não deixa escolher pasta. Vamos usar o armazenamento do próprio navegador (IndexedDB).");
  }
  const parent = await window.showDirectoryPicker!({
    id: "vocaloff-music",
    mode: "readwrite",
    startIn: "music",
  });
  const folder = await parent.getDirectoryHandle("VocalOff", { create: true });
  const db = await getDb();
  await db.put("handles", folder, ROOT_KEY);
  const folderName = `${parent.name}/VocalOff`;
  try {
    localStorage.setItem(FOLDER_LABEL_KEY, folderName);
    await navigator.storage?.persist?.();
  } catch {
    /* storage persist é best-effort */
  }
  return { folderName };
}

export async function folderStatus(): Promise<{
  supported: boolean;
  folderName: string | null;
  permission: PermissionStatus;
}> {
  if (!supportsDeviceFolder()) {
    return { supported: false, folderName: null, permission: "unsupported" };
  }
  const root = await storedRoot();
  if (!root) {
    return { supported: true, folderName: null, permission: "prompt" };
  }
  let permission: PermissionStatus = "granted";
  if (root.queryPermission) {
    permission = await root.queryPermission({ mode: "readwrite" });
  }
  return {
    supported: true,
    folderName: labelFor(root),
    permission,
  };
}

/** Pede a permissão de novo. Precisa ser chamado a partir de um clique. */
export async function ensureFolderPermission(): Promise<FsDirectoryHandle | null> {
  const root = await storedRoot();
  if (!root) return null;
  const descriptor: FsPermission = { mode: "readwrite" };
  if (root.queryPermission && (await root.queryPermission(descriptor)) === "granted") {
    return root;
  }
  if (root.requestPermission && (await root.requestPermission(descriptor)) === "granted") {
    return root;
  }
  return null;
}

function labelFor(root: FsDirectoryHandle) {
  try {
    return localStorage.getItem(FOLDER_LABEL_KEY) ?? root.name;
  } catch {
    return root.name;
  }
}

export function getFolderLabel() {
  try {
    return localStorage.getItem(FOLDER_LABEL_KEY);
  } catch {
    return null;
  }
}

/* -------------------------------------------------------------------------- */
/* Escrita / leitura de arquivos                                             */
/* -------------------------------------------------------------------------- */

function splitPath(path: string) {
  const clean = path.replace(/^\/+/, "").replace(/\\/g, "/");
  const parts = clean.split("/").filter(Boolean);
  const fileName = parts.pop() ?? "audio.mp3";
  return { dirs: parts, fileName };
}

async function directoryFor(root: FsDirectoryHandle, dirs: string[], create: boolean) {
  let dir = root;
  for (const part of dirs) {
    dir = await dir.getDirectoryHandle(part, { create });
  }
  return dir;
}

/** Grava um blob na pasta do dispositivo ou, no fallback, no IndexedDB. */
export async function saveBlob(path: string, blob: Blob): Promise<StorageType> {
  const root = await ensureFolderPermission();
  if (root) {
    const { dirs, fileName } = splitPath(path);
    const dir = await directoryFor(root, dirs, true);
    const handle = await dir.getFileHandle(fileName, { create: true });
    const writable = await handle.createWritable();
    await writable.write(blob);
    await writable.close();
    return "device";
  }
  const db = await getDb();
  await db.put("files", {
    path,
    blob,
    mime: blob.type || "audio/mpeg",
    savedAt: Date.now(),
  });
  return "idb";
}

/** Lê um arquivo salvo localmente (pasta do dispositivo tem prioridade). */
export async function readBlob(path: string): Promise<Blob | null> {
  const root = await storedRoot();
  if (root) {
    const permission = root.queryPermission
      ? await root.queryPermission({ mode: "read" })
      : "granted";
    if (permission === "granted") {
      try {
        const { dirs, fileName } = splitPath(path);
        const dir = await directoryFor(root, dirs, false);
        const handle = await dir.getFileHandle(fileName);
        return await handle.getFile();
      } catch {
        /* arquivo não existe mais nesse caminho — tenta o IndexedDB */
      }
    }
  }
  try {
    const db = await getDb();
    const row = await db.get("files", path);
    return row?.blob ?? null;
  } catch {
    return null;
  }
}

export async function readBlobUrl(path: string): Promise<string | null> {
  const blob = await readBlob(path);
  return blob ? URL.createObjectURL(blob) : null;
}

export async function removeBlob(path: string) {
  try {
    const db = await getDb();
    await db.delete("files", path);
  } catch {
    /* ignore */
  }
  const root = await storedRoot();
  if (!root) return;
  const permission = root.queryPermission
    ? await root.queryPermission({ mode: "readwrite" })
    : "granted";
  if (permission !== "granted") return;
  try {
    const { dirs, fileName } = splitPath(path);
    const dir = await directoryFor(root, dirs, false);
    await dir.removeEntry(fileName);
  } catch {
    /* já não existe */
  }
}

export async function removeSongFiles(songId: string) {
  const root = await storedRoot();
  const permission = root?.queryPermission
    ? await root.queryPermission({ mode: "readwrite" })
    : root
      ? "granted"
      : "denied";
  if (root && permission === "granted") {
    try {
      const songsDir = await root.getDirectoryHandle("songs");
      await songsDir.removeEntry(songId, { recursive: true });
    } catch {
      /* sem pasta */
    }
  }
  try {
    const db = await getDb();
    const keys = await db.getAllKeys("files");
    await Promise.all(
      keys.filter((key) => String(key).startsWith(`songs/${songId}/`)).map((key) => db.delete("files", key as IDBValidKey)),
    );
  } catch {
    /* sem idb */
  }
}

/** Baixa o áudio de uma URL (via proxy same-origin) e grava no dispositivo. */
export async function saveFromUrl(url: string, path: string): Promise<{ storage: StorageType; bytes: number }> {
  const res = await fetch(url, { credentials: "include" });
  if (!res.ok) throw new Error(`Falha ao baixar áudio (${res.status})`);
  const blob = await res.blob();
  if (!blob.size) throw new Error("Áudio vazio");
  const storage = await saveBlob(path, blob);
  return { storage, bytes: blob.size };
}

/* -------------------------------------------------------------------------- */
/* Utilidades                                                                 */
/* -------------------------------------------------------------------------- */

export function slugify(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60) || "faixa";
}

export function extensionFor(name: string, fallback = "mp3") {
  const match = /\.([a-z0-9]{2,5})$/i.exec(name);
  return match ? match[1].toLowerCase() : fallback;
}

export function songPath(songId: string, fileName: string) {
  return `songs/${songId}/${fileName}`;
}

export function stemPath(songId: string, kind: string, ext = "mp3") {
  return `songs/${songId}/stems/${kind}.${ext}`;
}

export async function storageEstimate() {
  try {
    const estimate = await navigator.storage?.estimate?.();
    return {
      usage: estimate?.usage ?? 0,
      quota: estimate?.quota ?? 0,
    };
  } catch {
    return { usage: 0, quota: 0 };
  }
}

export function formatBytes(bytes?: number | null) {
  if (!bytes || bytes <= 0) return "—";
  const units = ["B", "KB", "MB", "GB"];
  let value = bytes;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit += 1;
  }
  return `${value.toFixed(value >= 10 || unit === 0 ? 0 : 1)} ${units[unit]}`;
}
