import { relations, sql } from "drizzle-orm";
import {
  boolean,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  real,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

/* -------------------------------------------------------------------------- */
/* Better Auth core tables                                                    */
/* -------------------------------------------------------------------------- */

export const user = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").notNull().default(false),
  image: text("image"),
  role: text("role").notNull().default("user"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const session = pgTable(
  "session",
  {
    id: text("id").primaryKey(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    token: text("token").notNull().unique(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
  },
  (t) => [index("session_user_id_idx").on(t.userId)],
);

export const account = pgTable(
  "account",
  {
    id: text("id").primaryKey(),
    accountId: text("account_id").notNull(),
    providerId: text("provider_id").notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    idToken: text("id_token"),
    accessTokenExpiresAt: timestamp("access_token_expires_at", { withTimezone: true }),
    refreshTokenExpiresAt: timestamp("refresh_token_expires_at", { withTimezone: true }),
    scope: text("scope"),
    password: text("password"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("account_user_id_idx").on(t.userId)],
);

export const verification = pgTable("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

/* -------------------------------------------------------------------------- */
/* Domain enums                                                               */
/* -------------------------------------------------------------------------- */

export const songStatus = pgEnum("song_status", [
  "uploading",
  "queued",
  "separating",
  "ready",
  "failed",
]);

export const stemKind = pgEnum("stem_kind", [
  "vocals",
  "drums",
  "bass",
  "guitar",
  "piano",
  "other",
  "instrumental",
  "click",
  "backing",
]);

export const jobStatus = pgEnum("job_status", [
  "queued",
  "running",
  "succeeded",
  "failed",
  "canceled",
]);

export const planCode = pgEnum("plan_code", ["free", "pro", "studio"]);

/* -------------------------------------------------------------------------- */
/* Songs, stems and separation jobs                                           */
/* -------------------------------------------------------------------------- */

export const songs = pgTable(
  "songs",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    artist: text("artist"),
    durationSec: real("duration_sec"),
    bpm: integer("bpm"),
    keyNote: text("key_note"),
    coverUrl: text("cover_url"),
    sourceKey: text("source_key").notNull(),
    sourceMime: text("source_mime"),
    sourceBytes: integer("source_bytes"),
    status: songStatus("status").notNull().default("uploading"),
    isPublic: boolean("is_public").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("songs_user_id_idx").on(t.userId), index("songs_status_idx").on(t.status)],
);

export const stems = pgTable(
  "stems",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    songId: text("song_id")
      .notNull()
      .references(() => songs.id, { onDelete: "cascade" }),
    kind: stemKind("kind").notNull(),
    label: text("label").notNull(),
    storageKey: text("storage_key").notNull(),
    durationSec: real("duration_sec"),
    loudnessLufs: real("loudness_lufs"),
    bytes: integer("bytes"),
    position: integer("position").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("stems_song_id_idx").on(t.songId),
    uniqueIndex("stems_song_kind_idx").on(t.songId, t.kind),
  ],
);

export const separationJobs = pgTable(
  "separation_jobs",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    songId: text("song_id")
      .notNull()
      .references(() => songs.id, { onDelete: "cascade" }),
    status: jobStatus("status").notNull().default("queued"),
    model: text("model").notNull().default("htdemucs_ft"),
    progress: real("progress").notNull().default(0),
    attempts: integer("attempts").notNull().default(0),
    error: text("error"),
    workerId: text("worker_id"),
    startedAt: timestamp("started_at", { withTimezone: true }),
    finishedAt: timestamp("finished_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("jobs_status_idx").on(t.status),
    index("jobs_song_id_idx").on(t.songId),
  ],
);

/* -------------------------------------------------------------------------- */
/* Setlists, shares and per-user song preferences                             */
/* -------------------------------------------------------------------------- */

export const setlists = pgTable(
  "setlists",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("setlists_user_id_idx").on(t.userId)],
);

export const setlistItems = pgTable(
  "setlist_items",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    setlistId: text("setlist_id")
      .notNull()
      .references(() => setlists.id, { onDelete: "cascade" }),
    songId: text("song_id")
      .notNull()
      .references(() => songs.id, { onDelete: "cascade" }),
    position: integer("position").notNull().default(0),
    note: text("note"),
  },
  (t) => [index("setlist_items_setlist_idx").on(t.setlistId)],
);

export const shares = pgTable(
  "shares",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    slug: text("slug").notNull().unique(),
    setlistId: text("setlist_id").references(() => setlists.id, { onDelete: "cascade" }),
    songId: text("song_id").references(() => songs.id, { onDelete: "cascade" }),
    createdBy: text("created_by")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("shares_slug_idx").on(t.slug)],
);

export const songPrefs = pgTable(
  "song_prefs",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    songId: text("song_id")
      .notNull()
      .references(() => songs.id, { onDelete: "cascade" }),
    transpose: integer("transpose").notNull().default(0),
    speed: real("speed").notNull().default(1),
    lyricsOffsetMs: integer("lyrics_offset_ms").notNull().default(0),
    mixer: jsonb("mixer")
      .$type<Record<string, { volume: number; muted: boolean }>>()
      .notNull()
      .default(sql`'{}'::jsonb`),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("song_prefs_user_song_idx").on(t.userId, t.songId)],
);

/* -------------------------------------------------------------------------- */
/* Billing                                                                    */
/* -------------------------------------------------------------------------- */

export const subscriptions = pgTable(
  "subscriptions",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    plan: planCode("plan").notNull().default("free"),
    status: text("status").notNull().default("active"),
    provider: text("provider"),
    providerRef: text("provider_ref"),
    currentPeriodEnd: timestamp("current_period_end", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("subscriptions_user_idx").on(t.userId)],
);

/* -------------------------------------------------------------------------- */
/* Relations                                                                  */
/* -------------------------------------------------------------------------- */

export const songsRelations = relations(songs, ({ one, many }) => ({
  user: one(user, { fields: [songs.userId], references: [user.id] }),
  stems: many(stems),
  jobs: many(separationJobs),
}));

export const stemsRelations = relations(stems, ({ one }) => ({
  song: one(songs, { fields: [stems.songId], references: [songs.id] }),
}));

export const separationJobsRelations = relations(separationJobs, ({ one }) => ({
  song: one(songs, { fields: [separationJobs.songId], references: [songs.id] }),
}));

export const setlistsRelations = relations(setlists, ({ one, many }) => ({
  user: one(user, { fields: [setlists.userId], references: [user.id] }),
  items: many(setlistItems),
}));

export const setlistItemsRelations = relations(setlistItems, ({ one }) => ({
  setlist: one(setlists, { fields: [setlistItems.setlistId], references: [setlists.id] }),
  song: one(songs, { fields: [setlistItems.songId], references: [songs.id] }),
}));

export type Song = typeof songs.$inferSelect;
export type Stem = typeof stems.$inferSelect;
export type SeparationJob = typeof separationJobs.$inferSelect;
export type Setlist = typeof setlists.$inferSelect;
export type PlanCode = (typeof planCode.enumValues)[number];
