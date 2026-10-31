# VocalOff

Player de palco com separação de stems por IA: envie uma música, receba vocais / bateria /
baixo / guitarra / teclado separados e toque com mixer por pista, tom e velocidade
independentes, setlists e Modo Palco.

## Stack

- **Next.js 16** (App Router, Cache Components, Turbopack) + React 19 + TypeScript
- **Tailwind CSS v4**
- **Neon** (Postgres serverless) + **Drizzle ORM**
- **Better Auth** (email/senha + Google)
- **Cloudflare R2** (S3 compatível) para áudio, bucket privado com URL assinada
- Worker Python + Demucs para separação (`worker/`)

## Rodando local

```bash
npm install
cp .env.example .env.local     # preencha DATABASE_URL, BETTER_AUTH_SECRET, R2_*
npm run db:push                # cria as tabelas no Neon
npm run dev
```

Abra http://localhost:3000.

## Scripts

| Comando | O que faz |
|---|---|
| `npm run dev` | dev server (Turbopack) |
| `npm run build` | build de produção |
| `npm run db:generate` | gera migration a partir do schema |
| `npm run db:push` | aplica o schema direto no banco |
| `npm run db:studio` | Drizzle Studio |

## Documentação

- [`docs/architecture.md`](docs/architecture.md) — arquitetura, fluxo de separação e modelo de dados
- [`docs/re/powertom.md`](docs/re/powertom.md) — engenharia reversa da referência de produto (Power Tom)

## Deploy

App na **Vercel**; worker de separação em host com CPU/GPU (Railway, Fly ou VPS). Variáveis de
ambiente em `.env.example`.
