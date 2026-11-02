# Roteiro Técnico e Funcional do VocalOff

## Visão Geral

VocalOff é um aplicativo **Next.js 16 + Vercel + Neon PostgreSQL** para separação de stems musicais, copiando e superando as funções do Power Tom. O aplicativo permite que usuários tirem a voz de músicas, tenham um mixer por pista, controles independentes de tom e velocidade, e modo palco para apresentações.

---

## 1. Armazenamento e Persistência

### 1.1 Estrutura de Dados (Banco de Dados - Neon PostgreSQL)

#### Tabela `songs`
| Coluna | Tipo | Descrição |
|--------|------|-----------|
| `id` | UUID | Chave primária |
| `userId` | Text | FK para usuário (Better Auth) |
| `title` | Texto | Título da música |
| `artist` | Texto | Artista/banda |
| `durationSec` | Inteiro | Duração em segundos |
| `bpm` | Inteiro | Batidas por minuto |
| `keyNote` | Texto | Nota musical |
| `coverUrl` | Texto | URL da capa |
| `sourceKey` | Texto | Caminho/identificador do áudio |
| `sourceMime` | Texto | Tipo MIME (audio/mpeg) |
| `sourceBytes` | Inteiro | Tamanho em bytes |
| `status` | Enum | uploading / queued / separating / ready / failed |
| `isPublic` | Boolean | Se é da biblioteca pública |
| `storageType` | Texto | device / idb / remote |
| `storagePath` | Texto | Caminho relativo no dispositivo/IDB |
| `folderName` | Texto | Nome da pasta escolhida pelo usuário |
| `sourceUrl` | Texto | URL de origem (YouTube, catálogo) |
| `license` | Texto | Licença da música |
| `attribution` | Texto | Crédito de atribuição |
| `catalogId` | Texto | ID do catálogo público |
| `createdAt` | Carimbo de data/hora | Data de criação |
| `updatedAt` | Carimbo de data/hora | Data da última atualização |

#### Tabela `stems`
| Coluna | Tipo | Descrição |
|--------|------|-----------|
| `id` | UUID | Chave primária |
| `songId` | UUID | FK para songs |
| `kind` | Enum | vocals / drums / bass / guitar / piano / other / instrumental |
| `label` | Texto | Nome da pista (ex: "Bateria", "Vocal") |
| `storageKey` | Texto | Caminho onde o stem foi salvo |
| `storageType` | Texto | device / idb / remote |
| `mime` | Texto | Tipo MIME do stem |
| `durationSec` | Real | Duração do stem |
| `bytes` | Inteiro | Tamanho em bytes |
| `position` | Inteiro | Ordem da pista |
| `createdAt` | Carimbo de data/hora | Data de criação |

#### Índices
- `songs_user_id_idx` em `songs.userId`
- `songs_status_idx` em `songs.status`
- `songs_catalog_id_idx` em `songs.catalog_id` (para buscas públicas)

---

### 1.2 Armazenamento Local-First (Browser)

**Nunca armazena áudio no banco de dados.** O áudio fica no navegador do usuário de três formas:

1. **File System Access API** (Chrome/Edge/Android): Usuário escolhe uma pasta (ex: "VocalOff") no dispositivo. Os arquivos MP3 são gravados nessa pasta e persistem mesmo após fechar o navegador. `navigator.storage.persist()` garante que os dados sobrevivam à limpeza de storage.

2. **IndexedDB** (Fallback para Safari/Firefox): Quando o navegador não suporta File System Access, usa-se o `idb` (v8.0.4 instalado) para gravar Blobs em uma database chamada "vocaloff". Também persiste entre sessões, mas com cota de armazenamento do navegador.

3. **Remote/URL** (YouTube/catálogo): Apenas o caminho/URL é guardado no banco. O áudio permanece na fonte original.

#### Fluxo de salvamento de uma música:

```text
Uploader (Upload Page)
    ↓
Validação de arquivo/título/artista
    ↓
showDirectoryPicker({id: 'vocaloff', mode: 'readwrite'}) → pasta "VocalOff"
    ↓
saveBlob(path: "songs/{songId}/source.mp3", blob: áudio)
    ↓
POST /api/songs com: storageType="device", storagePath="songs/{songId}/source.mp3"
    ↓
Banco recebe apenas metadados + caminho → NÃO recebe áudio
    ↓
Usuário fecha e reabre o navegador → áudio ainda está na pasta do dispositivo
```

---

### 1.3 Rotas API Principais

| Rota | Método | Descrição |
|------|--------|-----------|
| `/api/songs` | GET | Lista músicas do usuário logado com stems aninhados |
| `/api/songs` | POST | Salva nova música (com stems opcional) |
| `/api/songs/[id]` | DELETE | Remove música e arquivos locais |
| `/api/youtube?url=` | GET | Retorna metadados do YouTube (oEmbed) - **NÃO extrai áudio** |
| `/api/public/audio?u=` | GET | Proxy allowlistado para áudio do ccMixter (Range header suportado) |

---

## 2. Funcionalidades Implementadas

### 2.1 Upload de Música

- **Duas abas**: "Arquivo" (device) e "Link do YouTube"
- **Arquivo**: Input `<type="file">` aceita MP3, WAV, M4A, OGG, FLAC
  - Preview de duração ao selecionar arquivo
  - Título/artista podem ser editados manualmente
  - Salva na pasta do dispositivo ou IDB
- **YouTube**: 
  - Usuário cola link do YouTube
  - `oEmbed` retorna título, autor, miniatura, embedUrl
  - **Aviso honesto**: "O YouTube fornece apenas metadados. Para separar, anexe áudio do dispositivo."
  - Dois botões de ação:
    - "Salvar só a referência" → música com metadados apenas (status `queued`)
    - "Anexar o arquivo de áudio" → abre seletor de arquivo para juntar com o YouTube

### 2.2 Biblioteca Pública

- **225 faixas** Creative Commons do ccMixter (licenças: Attribution, Attribution Share-Alike, CC0, Public Domain)
- **33 tracks** com stems separados (vocals, bass, drums, piano, guitar, etc.)
- **192 tracks** mix completa (single audio file)
- Interface com:
  - Busca por título, artista, tags
  - Filtro por gênero
  - Toggle "Só com pistas separadas"
  - Badge visual: "Com stems" ou "Mix completa"
  - Preview de áudio (via proxy `/api/public/audio`)
  - Botão "Baixar e usar":
    - Track COM stems → grava stems no dispositivo + POST /api/songs
    - Track SEM stems → grava mix completa + POST /api/songs

### 2.2 Player (Player Page)

- **Áudio real** do dispositivo (File System Access ou IndexedDB)
- **Mixer por pista** quando houver stems:
  - N elementos `<audio>` sincronizados
  - Controles individuais de volume, mute, solo por pista
  - Velocidade global aplicada a todas as pistas
- **Controles universais**: play/pause, seek, velocidade (0.5x a 1.5x), volume global
- **Modo stem isolado**: botão SOLO para isolar uma pista específica
- **Fallayt**: Track sem stems → player de áudio único com speed/volume
- **YouTube iframe**: Se a música for só referência YouTube, mostra iframe embutido

### 2.3 Minha Biblioteca (User Library)

- Lista todas as músicas do usuário logado
- Cada música mostra:
  - Capa/arte
  - Título + artista
  - Status (uploading / queued / separating / ready / failed)
  - Badge de armazenamento (Pasta do dispositivo / IndexedDB / Link)
  - Número de stems (quando applicable)
- Ações por música:
  - **Tocar** → abre player `/player?id={id}`
  - **Baixar** → salva arquivo MP3 na pasta do dispositivo (via Blob URL)
  - **Excluir** → remove da biblioteca + apaga arquivo local

---

## 3. Fluxos de Usuário (User Flows)

### Fluxo 1: Primeira vez usando o app

1. Usuário entra em `vocaloff.vercel.app`
2. Clica em "Entrar" (Better Auth com Google/e-mail/senha)
3. Vai para `"minha biblioteca"` → está vazia
4. Clica em **"Enviar música"**
5. **Opção A**: Seleciona um MP3 do dispositivo → preview de duração → preenche título/artista → clica em "Salvar na minha biblioteca"
6. **Opção B**: Cola link do YouTube → vê preview do vídeo → clica em "Salvar só a referência" ou "Anexar áudio" → seleciona MP3 do dispositivo → música salva
7. Música aparece em `"minha biblioteca"` → pode tocar, baixar ou excluir

### Fluxo 2: Baixando da biblioteca pública

1. Clica em **"Biblioteca pública"** 
2. Navega/filtra as 225 tracks
3. Vê badge "Com stems" ou "Mix completa"
4. Clica em "Baixar e usar"
5. Se track COM stems: sistema grava cada stem na pasta do dispositivo + salva metadados no banco
   Se track SEM stems: sistema grava o áudio único + salva metadados
6. Música agora aparece em `"minha biblioteca"` e pode ser tocada no player com mixer (se tiver stems)

### Fluxo 3: Player com mixer

1. Usuário clica em "Tocar" em uma música de sua biblioteca
2. Player carrega áudio do dispositivo
3. Se música tiver stems: aparecem controles de volume/mute/solo por pista
4. Usuário pode:
   - Ajustar volume de cada pista independentemente
   - Mutar/solo pistas individuais
   - Mudar velocidade (0.5x a 1.5x)
   - Buscar em qualquer posição da música
   - Exportar/setlist (feature future)

---

## 3. Tecnologia Stack

| Camada | Tecnologia | Motivo |
|--------|------------|--------|
| **App** | Next.js 16 (App Router, Turbopack) | Deploy nativo Vercel, RSC + Server Components |
| **UI** | Tailwind CSS v4 + lucide-react | Dark-first, sem runtime de CSS |
| **Banco** | Neon (Postgres serverless) + Drizzle ORM | Driver HTTP, branches por preview, migrations versionadas |
| **Auth** | Better Auth (e-mail/senha + Google) | Sessões no Postgres, adapter Drizzle |
| **Storage** | Local-First: FS Access + IndexedDB | Áudio nunca no Postgres; metadados sim |
| **Deploy** | Vercel | Zero config, edge-ready |

### 3.1 Bibliotecas Principais

- `idb@8.0.4` - IndexedDB wrapper client
- `drizzle-orm@0.45.4` - ORM para PostgreSQL
- `@neondatabase/serverless@1.2.0` - Driver serverless Postgres
- `better-auth@1.7.14` - Autenticação (e-mail + Google)
- `lucide-react@1.66.0` - Ícones (substituí Youtube por MonitorPlay/Music)
- `zod@4.6.7` - Validação de schema
- `clsx` + `tailwind-merge` - ClassName utilities

---

## 4. Próximos Passos (Roadmap Futuro)

### 4.1 Features de Curto Prazo (1-2 sprints)

- [ ] **Exportar setlists**: Usuário pode criar conjuntos de músicas com ordem e nome
- [ ] **Temas claro/dark/system**: Auto-detecta preferência do sistema operacional
- [ ] **Atalhos de teclado**: Espaço para play/pause, setas para seek, numbers para seleção de stem
- [ ] **Melhorar preview do YouTube**: Thumbnail maior + info do canal

### 4.2 Features de Médio Prazo (1-3 meses)

- [ ] **IA de separação de stems**: Integrar com worker Remocli/Coqui/noisernet no Railway (processamento assíncrono)
- [ ] **Importar de SoundCloud**: Além do YouTube, suporte a links SoundCloud
- [ ] **Colaboração**: Usuários podem compartilhar setlists públicas
- [ ] **Aplicativo PWA**: Add to home screen nos dispositivos móveis

### 4.3 Features de Longo Prazo (3-6 meses)

- [ ] **API pública**: Terceiros podem integrar com VocalOff via API REST
- [ ] **Análise de áudio**: Display visualizador de frequência em tempo real
- [ ] **Modo offline avançado**: Cache inteligente de tracks mais usadas
- [ ] **Integração com Apple Music/Spotify**: Importar playlists existentes

---

## 5. Limitações Conhecidas

1. **YouTube**: Apenas metadados - áudio deve ser fornecido pelo usuário (por questões de ToS e estabilidade do servidor)
2. **Separation real**: Não há processamento IA de stems no momento - stems vêm de fontes CC já separadas (ccMixter, FMA, etc.) ou são simples arquivos de áudio únicos
3. **Storage**: File System Access API só funciona em Chrome/Edge/Android; Safari/Firefox usam IndexedDB com cota limitada
4. **Sem áudio no banco**: Por design - o banco apenas guarda caminhos e metadados

---

## 6. Convenções do Projeto

### 6.1 Nomenclatura de Arquivos

- Componentes: `src/components/*`
- Páginas: `src/app/*` (App Router)
- APIs: `src/app/api/*`
- Libs/utilitárias: `src/lib/*`
- Dados estáticos: `src/data/*`
- Schemas DB: `src/db/schema.ts`

### 6.2 Convenções de Código

- **TypeScript em todo lugar** - `tsc --noEmit` deve passar limpo
- **Build limpo** - `next build` sem erros de TypeScript
- **Sem áudio no banco** - Apenas metadados e caminhos
- **Honestidade com YouTube** - Nunca prometer separação real de tracks do YouTube
- **CC only** - Biblioteca pública só tem conteúdo Creative Commons licenciado

### 6.3 Rotas Definidas

```
GET  /                  - Página inicial
GET  /app               - Minha biblioteca (requer login)
GET  /upload            - Upload de música
GET  /library           - Biblioteca pública CC
GET  /player?id=xx      - Player de música
GET  /library?relevant - Filtrar tracks com stems
POST /api/songs         - Salvar nova música
DELETE /api/songs/[id]  - Remover música
GET  /api/youtube?url=  - Metadados YouTube
GET  /api/public/audio?u= - Proxy áudio ccMixter
```

---

## 7. Contato e Manutenção

- **Desenvolvedor**: Areareversa
- **Email**: areareversa@gmail.com
- **Deploy**: vocaloff.vercel.app
- **GitHub**: github.com/areareversa/vocaloff
- **Licença**: MIT (exceto tracks CC que mantêm suas licenças originais)

---
*Documento gerado em 02/11/2026. Reflete o estado atual do códigobase na versão 0.1.0.*