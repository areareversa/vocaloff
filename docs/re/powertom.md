# Engenharia reversa — Power Tom (`app.powertom.com.br/app`)

> Alvo: SPA pública `https://app.powertom.com.br/app`
> Data da análise: 2026-10-31
> Ferramenta: REA (Reverse Engineer Anything) 6.7.0 — `analyze_javascript_application`
> Evidence principal: `ev_52ee0ff04aa2b863b1767d3abeab4a3846d6421ada6d2070fd28b78c1b3e4590`
> SHA-256 do artefato analisado: `78e4a84b6bd3f0ae6f0f97f778729cf007d09c2bfd4dfd1cbcd47f06f90dce2a`
> Artefatos locais: `C:\dev\powertom-re\site` (16 arquivos JS/CSS + catálogos)

Todas as afirmações abaixo são **observações estáticas** (sintaxe inerte, sem executar o
bundle) ou **dados públicos baixados por HTTP** (`catalog.json`). Nada foi executado,
nenhum login foi feito, nenhuma requisição autenticada foi disparada.

---

## 1. Identidade do alvo

| Item | Valor |
|---|---|
| Tipo | SPA React + Vite, PWA instalável |
| HTML | `index.html` com `<div id="root">`, `manifest.webmanifest`, `theme-color #0a0a0a` |
| Bundles | `index-C6g-AVvK.js` (505 KB), `react-DBppNnuG.js`, `vendor-DuT6DMMI.js`, `supabase-Dy_j3I-W.js` |
| Chunks lazy | `Activate`, `Admin`, `Ajuda`, `Demo`, `Experimente`, `Ferramentas`, `Importar`, `Pedidos`, `PublicRequest`, `RequestView`, `SharedShow` |
| Fonte | Sem sourcemaps publicados (`.map` retorna o `index.html` — fallback do SPA) |
| Backend | Supabase (`jdxjsbnfphojlbosrnjd.supabase.co`) |
| Áudio | Cloudflare R2 público (`pub-81339f96e6c746e8ac25fbe60e95563c.r2.dev`) com fallback `audio.powertom.com.br` |
| Pagamentos | Cakto (`pay.cakto.com.br`) + `seguroamplopay.com.br` |
| Letras | lrclib.net (busca direta do browser) |
| Cifras | API própria: `/api/cifra`, `/api/cover` (provável proxy do CifraClub) |
| Analytics | Meta Pixel `1599136611278409` |

Rotas observadas (Evidence `endpoint` nodes):

```
/login  /app  /app/library  /app/performance  /app/pedidos  /trial  /demo  /experimente
/ativar/:code  /s/:id (show compartilhado)  /p/:id (pedidos públicos)
/app/shows  /app/shows/:id  /app/player  /app/library  /app/importar
/app/ferramentas  /app/settings  /app/ajuda  /app/admin
```

---

## 2. Modelo de dados do catálogo (observado em `/catalog.json`)

`/catalog.json` = **8.046 músicas** (4,3 MB). `/experimente.json` = catálogo reduzido do trial.
`/demo-catalog.json` = catálogo da demo.

Cada música:

| Campo | Significado | Cobertura |
|---|---|---|
| `n` | nome completo de busca ("TITULO ARTISTA TOM BPM") | 8046/8046 |
| `s` | slug | 8046 |
| `g` | gênero | 8046 |
| `st` | lista de arquivos de stem (ex.: `bass.mp3`, `voz-guia.mp3`, `~click-106.mp3`) | 8046 |
| `t` | título | 8046 |
| `a` | artista | 6471 |
| `d` | duração em segundos | 7716 |
| `li` | **id de letra no lrclib** (número, não texto) | 4909 |
| `k` | tom (ex.: `B`, `F`) | 1358 |
| `b` | BPM | 1459 |
| `v` | variação/versão | 701 |
| `m` | compasso | 378 |
| `lv` | flag de loudness já normalizado | 2008 |
| `x` | flag de disponibilidade/ativo | 8033 |

Gêneros e volume: `rock-pop-mpb` 3442 · `atualizacoes` 2733 · `pagode` 921 · `forro` 758 · `gospel` 192.

Stems por música: mediana ~10–13, máximo observado **204**. Ou seja: **não é separação
AI de 4 stems**, é um acervo de **multipistas reais** (VS/playback de estúdio), com nomes
livres (`bacurinha-01.mp3`, `cx-reverse.mp3`, `virada.mp3`, `pedal.mp3`, `tc-2.mp3`).
O prefixo `~` marca stem opcional; `@nome` e `nome::arquivo` são aliases de exibição.

Convenção de caminho no R2 (observada em `cp()`):

```
stems/{genero}/{slug}/{arquivo}      // e "opt/stems/..." para opcionais
```

---

## 3. Motor de áudio (o diferencial técnico)

Observações no bundle principal:

- **Web Audio API** com grafo próprio: `AudioContext` (23 refs), `OfflineAudioContext` (6),
  `createBufferSource` (7), `BiquadFilter`, `AnalyserNode`, `GainNode`.
- **Pitch/time-stretch via AudioWorklet** — o app instancia um processador com
  `schedule({ active, input, output, semitones, rate })` e compensa latência
  (`stretchLatency`, `rhythmDelay.delayTime`). Há fallback com aviso
  "Este aparelho não suporta mudar o tom."
- **Buses separados**: `mixBus` (harmonia/voz, passa pelo stretch) e `rhythmBus`
  (drums/percussão/baixo). Quando só o tempo muda, o ritmo vai por um segundo
  processador ou por um delay para não perder transiente.
- **Reprodução multi-stem sincronizada**: cada stem é decodificado em chunks
  (`{ at, buffer }`) e agendado em `AudioBufferSourceNode` com âncora
  (`anchorCtxTime`/`anchorPos`) e `playbackRate = speed`.
- **Pitch efetivo** = `_pitch - 12*log2(_speed)` (mantém o tom quando muda a velocidade).
- **Captura/gravação**: AudioWorklet `pt-capture` (2048 frames), fallback
  `createScriptProcessor`, auto-stop em `8*60` s (`Dv`), `MediaRecorder` + `getUserMedia`
  para gravar o músico tocando junto.
- Preferência de memória por stem (`memBytes`, `keepStereo`) — indício de gestão de RAM
  para músicas com dezenas de pistas em celular.

---

## 4. Inventário funcional (extraído das strings de UI + help)

**Player / palco**
- Mixer por pista: mute/solo/volume por stem, persistido por música.
- "O que você toca ao vivo": instrumento do usuário abre mutado em todas as músicas.
- Tom: ±½ tom por toque; **letra e cifra transpõem junto**; salvo por música.
- Velocidade: 0,5×–1× sem mudar o tom; "treino progressivo" (+5% por repetição até 100%).
- Loop de trecho, marcadores de seção, trecho salvo para tocar só ele no show.
- Contagem/click, bipes no BPM, "regência" (4 bipes).
- Modo Palco: tela não apaga (Wake Lock), trava com cadeado (segurar 1 s),
  luzes que pulsam com o áudio, plateia virtual (aplausos), avanço automático,
  show emendado (sem gap entre músicas), atalhos de teclado/pedal Bluetooth.
- Equalização de volume entre músicas (loudness normalization — flag `lv` no catálogo).
- Gravação do músico + exportar/compartilhar (WhatsApp/Stories); vídeo quando suportado.

**Conteúdo**
- Cifra + letra sincronizada, com offset (±) e "Começou".
- Busca de letra via lrclib, cache local `palco-lyrics-cache-v2/v3/v4`.
- Colar letra/cifra manualmente; cifra salva no aparelho e transpõe junto.
- Capa via `/api/cover`, cifra via `/api/cifra?title=&artist=`.
- Biblioteca, favoritos, gêneros, busca.

**Shows / repertório**
- Setlists (`palco-setlist`, `palco-show`), reordenar por drag, repertório pronto,
  compartilhar com a banda por link público (`/s/:id`), offline prep
  ("Preparar para tocar sem internet") via Cache Storage + IndexedDB.
- Backup/restore em arquivo.

**Importação**
- Adicionar música própria: stems soltos, `.zip` de VS, MP3/WAV/M4A, pasta inteira no desktop.
- Editar música: nome, artista, tom, BPM, capa, renomear/remover/adicionar pistas.
- Detecção automática de tipo de pista por nome (`drums|bass|guitar|voice|choir|brass|strings|keys|synth|percussion|acoustic`).

**Ferramentas**
- Afinador (microfone, corda fica verde), metrônomo, tap tempo.

**Comercial**
- Trial (`/trial`, `trial-v1`), demo (`/demo`, `/demo-catalog.json`), "Experimente" (`/experimente`).
- Ativação por código (`/ativar/:code`), produtos:
  - `app-vitalicio-r7m4xq` → app completo (vitalício)
  - `multipistas-k8r3vd` → Pacote Multipistas (download dos stems em `.zip`) — R$ 67
  - `pedidos-pix-7q4m2k` → "Pedidos e Gorjeta via Pix" — R$ 27
- Checkout Cakto: `pay.cakto.com.br/ygt9oqx_1225675`, `/mjhxvqz_1239757`, `/e2y8utm_1239819`.
- Pedidos públicos: QR code na mesa → `/p/:id` (hash) → "Peça sua música".
- Admin (`/app/admin`) lê/escreve Supabase `approved_buyers` (`email`, `plan`,
  `created_at`; planos `basic | professional | advanced | pro_max`).

**Persistência local** (Evidence `storage` nodes)
`palco-show`, `palco-setlist`, `palco-lyrics-cache-v2/v3/v4`, `onboarding-v1`,
`sound-tip-closed`, `unlocks-v1`, `trial-v1`, `cifras-v1` (IndexedDB), `caches.open` (PWA).

---

## 5. Achados de segurança / arquitetura

1. **Ativação 100% no cliente.** Os códigos de produto estão no bundle
   (`ap = {"pedidos-pix-7q4m2k","multipistas-k8r3vd","app-vitalicio-r7m4xq"}`) e o
   estado fica em `localStorage.unlocks-v1`. Qualquer usuário libera o app vitalício
   sem pagar (`localStorage.setItem('unlocks-v1', ...)`). Não há validação server-side.
2. **Anon key do Supabase no bundle** (esperado em Supabase, mas significa que a
   segurança depende inteiramente de RLS). A tabela `approved_buyers` é consultada
   pelo admin no cliente — se a RLS estiver permissiva, a lista de compradores vaza
   e pode ser alterada.
3. **Catálogo completo exposto** em `/catalog.json` (8.046 músicas, nomes de arquivos
   de stem). Os stems em R2 são públicos e previsíveis por convenção de caminho.
4. **Preços e produtos hardcoded** no bundle (`op = {pedidos:"R$ 27", multipistas:"R$ 67"}`).
5. Sem sourcemaps e sem ofuscação real — só minificação Vite.

Nada disso é "vulnerabilidade crítica" para o negócio do ponto de vista de dados
sensíveis, mas **o modelo de cobrança é contornável por design**.

---

## 6. Limitações desta análise (declaradas pelo REA)

- `assets/react-DBppNnuG.js`: worker esgotou heap durante a análise semântica (fatos
  estáticos e de módulo retidos).
- `assets/supabase-Dy_j3I-W.js`: grafo semântico excedeu o orçamento do resultado pai
  (fatos estáticos retidos).
- Grafo incompleto por construção; ausência de fato ≠ ausência no app.
- Nada foi executado: nenhuma conclusão aqui afirma comportamento em runtime.
- Backend (Supabase schema/RLS, `/api/cifra`, `/api/cover`) permanece **desconhecido** —
  só o contrato consumido pelo cliente foi observado.

---

## 7. Implicações para o VocalOff

O Power Tom **não separa stems**: ele distribui multipistas já separados em estúdio.
O "mais que isso" do VocalOff (separar qualquer música) é exatamente a peça que o
Power Tom **não tem** — e é o nosso diferencial, não uma cópia.

Reaproveitáveis como **padrões de produto** (não como código):
mixer por stem persistido, tom/velocidade independentes com transposição de cifra/letra,
Modo Palco (wake lock + trava + emenda), offline prep, setlists compartilháveis,
importação de arquivos próprios, backup/restore, ferramentas (afinador/metrônomo).

O que devemos fazer **diferente**:
- ativação e planos validados no servidor (Neon) — nunca no cliente;
- stems em storage privado com URL assinada;
- pipeline de separação assíncrono (fila + worker) em vez de catálogo pré-renderizado.
