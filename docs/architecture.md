# VocalOff — arquitetura

## Visão

VocalOff é um **player de palco com separação de stems por IA**. O usuário envia uma música,
recebe stems separados (vocais, bateria, baixo, guitarra, teclado, outros) e toca com mixer
por pista, tom e velocidade independentes, setlists e Modo Palco.

Referência de produto (não de código): Power Tom (`docs/re/powertom.md`).

## Stack

| Camada | Escolha | Motivo |
|---|---|---|
| App | Next.js 16 (App Router, Cache Components) | deploy nativo na Vercel, RSC + Server Actions |
| UI | Tailwind CSS v4 + lucide-react | dark-first, sem runtime de CSS |
| Banco | Neon (Postgres serverless) + Drizzle ORM | driver HTTP, branch por preview, migrations versionadas |
| Auth | Better Auth (email/senha + Google) | sessões no Postgres, adapter Drizzle |
| Storage | Cloudflare R2 (S3 compatível) | egress zero para áudio, URLs assinadas |
| Fila/jobs | tabela `separation_jobs` no Neon | sem infra extra; worker faz `SELECT ... FOR UPDATE SKIP LOCKED` |
| Separação | worker Python + Demucs (`worker/`) | Demucs não roda em função serverless |
| Deploy app | Vercel | preview por PR + produção |
| Deploy worker | Railway/Fly/VPS com GPU opcional | processo longo, CPU/GPU dedicada |

## Fluxo de upload e separação

```
browser ──PUT (URL assinada)──▶ R2 users/{uid}/songs/{songId}/source.mp3
   │
   ├─▶ POST /api/songs            (cria song + job "queued")
   │
worker ──claim job──▶ Neon
   ├─ baixa source do R2
   ├─ roda Demucs (htdemucs_ft, 6 stems)
   ├─ normaliza loudness (ffmpeg loudnorm) e mede LUFS
   ├─ sobe stems em WAV/Opus para R2 (privado)
   └─ marca song "ready" + cria registros em `stems`
   │
browser ──polling /api/songs/{id}/status──▶ toca via Web Audio
```

Regras:
- Bucket **privado**; playback só com URL assinada de curta duração (`/api/stems/{id}/url`).
- Limite de upload por plano (ex.: 30 MB free, 100 MB pro).
- Job tem `attempts`, `workerId`, `error`; retry com backoff.
- Nada de catálogo de terceiros: só conteúdo enviado pelo usuário (evita problema de licenciamento).

## Modelo de dados

`user`, `session`, `account`, `verification` (Better Auth)
`songs` — música do usuário + status de separação
`stems` — uma linha por pista, com `kind` enum e `storage_key`
`separation_jobs` — fila/estado do worker
`setlists`, `setlist_items` — repertório ordenado
`shares` — link público de setlist/música
`song_prefs` — mixer, transpose, speed, offset de letra por usuário/música
`subscriptions` — plano e status de cobrança

## Player (client)

- **Fonte única de verdade de tempo**: `AudioContext.currentTime` + âncora
  (`anchorCtxTime`, `anchorPos`); cada stem é um `AudioBufferSourceNode` agendado no mesmo
  instante, com `playbackRate = speed`.
- **Tom**: worklet de time-stretch/pitch-shift (SoundTouch/WASM) no bus harmônico; bus de
  ritmo (drums/baixo) sem processamento quando só a velocidade muda, para não perder transiente.
- **Fallback**: se o worklet não carregar, só velocidade (`preservesPitch` via `<audio>`), com aviso.
- **Persistência**: mixer/tom/velocidade salvos em `song_prefs` (debounce 500 ms).
- **Modo Palco**: Wake Lock API, trava de tela, emenda de faixas, atalhos de teclado/pedal.
- **Offline**: Cache Storage + IndexedDB para stems já baixados de um setlist.

## Segurança (o que o Power Tom não faz)

- Ativação/plano **sempre no servidor** (`subscriptions` + verificação em Server Action/Route Handler).
- Stems em bucket privado com URL assinada e expiração.
- Autorização por `userId` em toda query (Drizzle com filtro explícito).
- Rate limit por usuário nas rotas de upload/URL.

## Próximos passos

1. Neon + `DATABASE_URL`, rodar `npm run db:push`.
2. Vercel: importar repo, configurar env, deploy de preview.
3. Upload assinado + criação de job (`/api/songs`, `/api/songs/[id]/status`).
4. Worker Demucs (`worker/`) com claim de job e upload dos stems.
5. Player: mixer + velocidade; depois pitch-shift por worklet.
6. Modo Palco, setlists, compartilhamento, billing.
