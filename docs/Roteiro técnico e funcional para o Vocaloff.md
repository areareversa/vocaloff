# Roteiro técnico e funcional para o Vocaloff

**Base da análise:** inspeção autorizada do uso normal em `https://app.powertom.com.br`, em 2 de novembro de 2026. O relatório descreve somente o que ficou observável na interface, nos assets públicos e nas requisições disparadas pela navegação. Não inclui bypass de autenticação, enumeração agressiva, exploração de endpoints administrativos, tentativa de acesso ao repositório privado ou cópia de código/conteúdo.

## 1. Conclusão principal

O PowerTom é uma aplicação web/PWA voltada para músicos que tocam ao vivo. A proposta central é entregar uma banda/playback multipista no celular: o usuário escolhe uma música, abre as pistas, ajusta tom e velocidade, silencia ou coloca instrumentos em solo, consulta letra/cifra e organiza tudo em shows.

A arquitetura observável é predominantemente client-side: o navegador carrega um bundle JavaScript, catálogos JSON públicos e arquivos de áudio hospedados em CDN. O catálogo observado contém 8.046 músicas. As preferências, ajustes de músicas e parte dos dados de shows são descritos na própria interface como salvos no aparelho, o que indica uso de armazenamento local e cache offline. A entrega HTTP informa `Server: Vercel`, mas isso não prova qual é o repositório Git conectado.

Para o Vocaloff, a recomendação é usar a mesma categoria de produto, mas com identidade visual, textos, modelo de dados, código, conteúdo musical e fluxo próprios. O diferencial deve ser uma experiência de palco mais direta, preparação offline mais explícita e colaboração/backup melhor resolvidos.

## 2. Roteiro de demonstração do app observado

### Cena 1 — Entrada e onboarding

Abrir `/app/library`. O app mostra um onboarding escuro com a mensagem equivalente a “A banda inteira no seu celular”, explicando que o músico escolhe qualquer música e liga ou desliga cada instrumento no mixer. Há avanço por etapas e opção de pular.

**O que o usuário entende:** não é apenas um player estéreo; é uma base de acompanhamento com controle individual de instrumentos.

**Oportunidade para o Vocaloff:** trocar o onboarding genérico por uma demonstração interativa de 20 segundos: escolher uma faixa de exemplo, desligar voz-guia, mudar meio tom e entrar no modo palco.

### Cena 2 — Biblioteca

A página `/app/library` tem navegação lateral para Músicas, Player, Shows, Palco e Config. No topo há busca por música/artista, botão para adicionar música e filtros por Favoritos, Blocos prontos e gêneros. Foram observadas categorias como Forró, Sertanejo, Rock/Pop Internacional, Rock Nacional, MPB, Pagode, Piseiro, Gospel, Arrocha, Axé e Brega.

A página inicial também exibe uma saudação, a “Música do dia”, atalhos para Afinador, Metrônomo, Meus VS e Pedidos Pix, área de músicas do usuário, shows, repertórios prontos e blocos prontos. Há 378 blocos prontos visíveis no catálogo e repertórios prontos de 12 músicas.

**Padrão de UX:** descoberta rápida, muitos atalhos e conteúdo pronto para reduzir o tempo até o primeiro play.

**Melhoria Vocaloff:** incluir filtros por BPM, tonalidade, dificuldade, formação do músico e “preparada para offline”; permitir busca tolerante a acentos e mostrar imediatamente tom, duração, BPM e quantidade de pistas.

### Cena 3 — Escolha da faixa de teste

Foi aberta a “Música do dia”: “Spc Medley Marrom Bombom Poderosa”, de Alexandre Pires. A seleção leva para `/app/player` e inicia a preparação das pistas. Enquanto os arquivos chegam, o app informa o progresso e oferece uma prévia rápida.

### Cena 4 — Player multipista

A tela `/app/player` mostra capa, título, artista, ações de adicionar ao show, gravar, favoritar, baixar MP3 e baixar pistas. Há um cartão de ajuda que explica o produto.

O transporte oferece voltar ao início, voltar 5 segundos, tocar/pausar, avançar 5 segundos, parar e Loop A-B. Quando os metadados estão disponíveis, surgem marcadores clicáveis de partes, como Verso, Refrão e Final, com o tempo de cada trecho.

O bloco de tom permite alterar em semitons e oferece valores rápidos. A velocidade tem presets de 0,5x a 1,5x. O app diferencia configurações como FINO e ajustes de tom, além de informar que as mudanças ficam salvas naquela música.

O mixer mostra 23 pistas para a faixa observada. Cada pista tem volume, pan, mute e solo. Aparecem instrumentos como Baixo, Banjo, Bells, Cavaco, Voz Guia, Metais, Click, Sintetizador, Bateria, Teclado, Regência, Repique, Cordas, Surdo, Percussão e Tantã. Existem presets como Tudo ligado, Sem voz guia, Acústico e Só ritmo.

Também há a opção de separar a saída: instrumental em um canal e click/contagem/regência no outro, pensada para mesa e retorno. Isso é uma decisão de produto especialmente importante para uso profissional.

No lado direito ficam as abas Letra e Cifra. O app tenta encontrar a letra, permite busca manual e oferece “Colar a letra”.

**Melhoria Vocaloff:**

- Exibir um botão “Preparar offline” por faixa/show, com status verificável.
- Mostrar claramente quais pistas já estão disponíveis e quais ainda estão carregando.
- Permitir salvar um preset de mixer por formação: voz e violão, banda completa, igreja, duo etc.
- Permitir edição de marcadores de partes e criação de setlists sem sair do player.
- Manter letra/cifra em painel retrátil e com rolagem sincronizada.
- Ter modo de baixa latência e indicador de saída estéreo antes do show.
- Confirmar no visual quando uma alteração foi persistida localmente.

### Cena 5 — Shows e repertórios

A página `/app/shows` permite criar um show e apresenta repertórios prontos, cada um com 12 músicas. Foram observados modelos para barzinho voz e violão, sertanejo, piseiro e forró, pagode, MPB/pop nacional, flashback internacional, rock nacional, casamento, aniversário/confraternização e louvor/adoração.

Cada repertório oferece “Usar e ajustar” e “Tocar”. O texto orienta criar o show, ajustar tom/mixer por música e iniciar o show para passar de uma música à outra.

**Melhoria Vocaloff:** criar um assistente de montagem em três passos: escolher objetivo/local, escolher duração e revisar o setlist. Mostrar duração total, energia por bloco, tom de cada música e alerta de repetição de artista.

### Cena 6 — Modo Palco

A rota `/app/performance` abre uma tela de modo palco. Sem show criado, ela informa que é preciso escolher o show atual e oferece montar o primeiro show. A intenção do fluxo é tocar uma música após a outra com o mínimo de interface.

Nas configurações, o comportamento pode seguir para a próxima música automaticamente, inserir pausa entre músicas, equalizar volume e usar contagem antes de começar. Há suporte documentado para pedal Bluetooth ou teclado: espaço toca/pausa, seta direita avança e seta esquerda volta.

**Melhoria Vocaloff:** fazer o modo palco assumir tela cheia, alto contraste, botões grandes e bloqueio acidental de navegação. Exibir próxima música, tom, BPM, tempo de pausa e status offline no mesmo painel.

### Cena 7 — Configurações e uso offline

A página `/app/settings` informa que tudo fica salvo no aparelho. Há preferências de voz masculina/feminina/não ajustar, instrumentos que o músico toca ao vivo, avanço automático, pausa entre faixas, volume igualado, contagem antes de começar e controle por pedal/teclado.

A seção de armazenamento mostra uso local e limite, com opção de liberar espaço. A seção de backup salva shows, ajustes, cifras, letras, favoritos e preferências em um arquivo; músicas importadas precisam ser adicionadas novamente. Há instalação como app na tela inicial e uma central de ajuda.

**Melhoria Vocaloff:** oferecer backup criptografado opcional na nuvem, histórico de versões, restauração seletiva e diagnóstico “o que ainda depende de internet”.

### Cena 8 — Pedidos e gorjeta via Pix

A rota `/app/pedidos` apresenta um recurso comercial de QR code na mesa. O público pode escolher músicas do repertório, mandar pedido para o WhatsApp e enviar gorjeta para uma chave Pix. A tela de teste do público oferece músicas, motivo da dedicatória, nome, recado e valores sugeridos.

**Melhoria Vocaloff:** separar claramente pedido, gorjeta e pagamento; permitir ao músico aceitar, recusar ou colocar em fila; registrar histórico; exibir QR code por show e não apenas por conta; evitar armazenar dados financeiros sensíveis no cliente.

## 3. Tecnologias observáveis

| Camada | Evidência observada | Implicação para o Vocaloff |
|---|---|---|
| Front-end | Bundle separado `react-DBppNnuG.js` e uso de componentes React observável no bundle | React é uma hipótese forte e adequada para a UI do Vocaloff |
| Build | Assets com hash, `type="module"`, `modulepreload` e bundle principal `index-C6g-AVvK.js` | Pipeline moderno de bundling; Vite é provável, mas não foi declarado de forma conclusiva |
| Estilo | CSS único com hash; fonte Inter via Google Fonts | Design system escuro, responsivo e tipografia Inter |
| PWA | `manifest.webmanifest`, `sw.js`, display standalone, ícones e registro de service worker | Instalação no celular e funcionamento parcial sem internet |
| Conteúdo | `/catalog.json` público com 8.046 itens e `/repertorios.json` | Catálogo pode ser versionado e distribuído como dados estáticos |
| Áudio | Host `audio.powertom.com.br` e fallback R2 público observado no bundle | CDN/object storage é indicado para pistas; Vocaloff deve usar URLs assinadas para conteúdo privado |
| Capas | URLs do iTunes/Apple Music e fallback `/api/cover` | Capas devem respeitar licenças e políticas de uso |
| Letras | LRCLIB (`/api/search` e `/api/get/{id}` externos) e proxy local `/api/lyrics` | Usar provedor licenciado ou conteúdo do usuário; não depender de fonte sem garantia jurídica |
| Cifras | Proxy local `/api/cifra?title=&artist=` | Endpoint de consulta por título/artista; necessidade de fonte/licença própria |
| Hosting | Header HTTP `Server: Vercel` | Indica hospedagem na Vercel, não o repositório de origem |
| Analytics | Facebook Pixel no HTML público | Para o Vocaloff, usar consentimento e política de privacidade adequados |
| Persistência | Interface declara dados salvos no aparelho; bundle usa stores e cache nomeados | IndexedDB/localStorage/service worker são hipóteses técnicas fortes; validar na implementação própria |

## 4. Endpoints e recursos públicos observados

A lista abaixo é o inventário do que apareceu no HTML, no bundle público e na navegação normal. Não deve ser interpretada como documentação completa do back-end.

### Rotas de interface

- `/app/library` — biblioteca e catálogo.
- `/app/player` — player sem faixa selecionada.
- `/app/shows` — shows e repertórios prontos.
- `/app/shows/{id-ou-slug}` — detalhe de show, rota indicada no bundle.
- `/app/performance` — modo palco.
- `/app/settings` — configurações.
- `/app/pedidos` — pedidos e gorjeta Pix.
- `/app/ajuda` — central de ajuda.
- `/app/ferramentas?t=afinador` — afinador.
- `/app/ferramentas?t=metronomo` — metrônomo.
- `/app/importar` — importação de músicas/pistas.
- `/app/admin` — rota declarada no bundle, mas não investigada nem acessada como área administrativa.

### Dados e APIs do próprio domínio

- `GET /catalog.json` — catálogo de músicas e pistas. O arquivo público retornou 8.046 itens. Os objetos observados usam campos compactos como nome, slug, gênero, lista de stems, artista, duração e metadados.
- `GET /repertorios.json` — repertórios prontos.
- `GET /experimente.json` — catálogo alternativo referenciado pelo bundle para contexto de experiência/teste.
- `GET /api/cover?artist={artist}&title={title}` — busca/normalização de capa por artista e título; respostas de capa e 404 foram observadas na biblioteca.
- `GET /api/cifra?title={title}&artist={artist}` — consulta de cifra por título e artista; o bundle trata 404 como “não encontrado”.
- `GET /api/lyrics?artist={artist}&title={title}&duration={seconds}` — consulta de letra, com duração opcional para melhorar a correspondência; a resposta esperada contém letra simples, letra sincronizada, fonte e duração.
- `GET /sw.js` — service worker público responsável por cache de páginas, assets, catálogo e ícones; o áudio é tratado pelo app de armazenamento offline.
- `GET /manifest.webmanifest` — manifesto PWA, idioma pt-BR, `start_url` em `/app/library`, modo standalone e tema escuro.
- `GET /assets/index-C6g-AVvK.js` — bundle principal público.
- `GET /assets/react-DBppNnuG.js` e `GET /assets/vendor-DuT6DMMI.js` — bundles públicos de React e dependências.
- `GET /assets/index-C_Qco1bI.css` — CSS principal público.

### Serviços externos e CDN

- `GET https://lrclib.net/api/search?q={query}` — busca externa de letras, filtrada para resultados não instrumentais com letra simples ou sincronizada.
- `GET https://lrclib.net/api/get/{id}` — busca externa de uma letra por identificador.
- `GET https://audio.powertom.com.br/...` — pistas de áudio por stem. O bundle também referencia um domínio R2 público como fallback para caminhos de áudio.
- `GET https://is1-ssl.mzstatic.com/...` — capas observadas em resultados da biblioteca.
- `GET https://fonts.googleapis.com/...` — fonte Inter.
- Facebook Pixel via `https://connect.facebook.net/en_US/fbevents.js` e chamadas de medição associadas.
- `https://pay.cakto.com.br/...` — link de compra observado no bundle para o recurso comercial de gorjeta Pix; não foi executada compra.

### O que não foi observado

Não foi observada uma API pública de login, banco de dados, CRUD de usuário ou endpoint REST autenticado durante a sessão sem login. Também não foi possível afirmar a existência de um repositório Git público do app. A rota `/app/admin` aparece no bundle, mas não foi explorada por não ser necessária para o objetivo e por poder representar área restrita.

## 5. Origem do repositório

A hospedagem informa Vercel, porém o HTML, o manifesto e os bundles não expõem o nome do repositório, organização Git ou commit. A pesquisa pública encontrou um perfil GitHub chamado `tom-power`, mas os repositórios visíveis são projetos não relacionados ao Player Profissional; isso não é evidência de autoria do PowerTom. Portanto, a resposta tecnicamente correta é: **o repositório de origem não pôde ser identificado por fontes públicas e não deve ser inferido a partir do domínio Vercel**.

Para o Vocaloff, use um repositório próprio, com organização definida, CI/CD separado e trilha de auditoria. Não copie o bundle desminificado, textos, catálogo, áudio, letras, capas, marca ou estrutura visual proprietária do PowerTom.

## 6. Arquitetura recomendada para o Vocaloff

### MVP

1. SPA React com TypeScript e design system próprio.
2. Catálogo de faixas em banco de dados, com busca por título, artista, gênero, BPM e tom.
3. Player Web Audio com múltiplas pistas, ganho, pan, mute, solo, velocidade e transposição quando tecnicamente possível.
4. PWA com service worker e IndexedDB para metadados, preferências e cache de faixas autorizadas.
5. Shows/setlists com ordem, pausa, tom, preset de mixer e estado offline.
6. Modo palco com tela cheia, teclado/pedal e avanço automático.
7. Letras e cifras provenientes de fonte licenciada ou importadas pelo próprio músico.
8. Importação de arquivos do usuário com validação, processamento assíncrono e armazenamento privado.

### Backend sugerido

- API TypeScript com autenticação e autorização por usuário/organização.
- PostgreSQL para usuários, faixas, shows, presets e auditoria.
- Object storage privado para áudio, com URLs assinadas e expiração.
- Worker para normalização de áudio, geração de waveform, validação de duração e metadados.
- CDN para distribuição dos arquivos autorizados.
- Observabilidade para falhas de download, latência, uso offline e erros de reprodução.

### Diferenciais de produto

- Modo “ensaio” e modo “palco” separados.
- Preparação offline com checklist por show.
- Presets por formação e por instrumento do músico.
- Transição automática com pré-carregamento da próxima música.
- Controle remoto opcional para tablet/celular.
- Fila de pedidos com aprovação do artista.
- Backup criptografado e restauração seletiva.
- Métricas de uso sem coletar áudio ou dados desnecessários.

## 7. Roteiro de desenvolvimento em fases

**Fase 1 — Fundação:** definir identidade do Vocaloff, modelo de faixa/stem, player estéreo/multipista mínimo, catálogo próprio e navegação Biblioteca/Player/Shows/Config.

**Fase 2 — Uso profissional:** tom, velocidade, mute/solo/pan, marcadores de partes, presets de mixer, modo palco, pausa entre músicas e suporte a teclado/pedal.

**Fase 3 — Confiabilidade:** cache offline, tela de preparação, download resiliente, limites de armazenamento, backup/restauração e diagnóstico de conectividade.

**Fase 4 — Conteúdo e monetização:** importação licenciada, repertórios próprios, pedidos, gorjetas e painel do músico. Pagamentos devem usar provedor adequado; não armazenar chave Pix, cartão ou credenciais de forma insegura no cliente.

**Fase 5 — Melhoria contínua:** telemetria com consentimento, testes de performance em celulares modestos, acessibilidade, sincronização entre dispositivos e colaboração.

## 8. Critérios de aceite do MVP

O músico deve conseguir abrir um show preparado sem internet, iniciar a primeira faixa em menos de cinco segundos, ajustar o tom sem perder sincronismo, desligar voz-guia ou click individualmente, avançar para a próxima música pelo pedal/teclado, consultar letra/cifra armazenada e restaurar suas configurações em outro aparelho.

A interface deve deixar explícitos o estado offline, o tom atual, a próxima música, o nível de carregamento e os controles que afetam a saída para a mesa. Nenhum recurso crítico do palco deve depender silenciosamente de uma requisição externa.

## Referências públicas

[1]: https://app.powertom.com.br/app/library "PowerTom — Biblioteca"
[2]: https://app.powertom.com.br/app/player "PowerTom — Player"
[3]: https://app.powertom.com.br/app/shows "PowerTom — Shows"
[4]: https://app.powertom.com.br/app/performance "PowerTom — Modo Palco"
[5]: https://app.powertom.com.br/app/settings "PowerTom — Configurações"
[6]: https://app.powertom.com.br/app/pedidos "PowerTom — Pedidos e Gorjeta Pix"
[7]: https://app.powertom.com.br/catalog.json "PowerTom — Catálogo público"
[8]: https://app.powertom.com.br/repertorios.json "PowerTom — Repertórios públicos"
[9]: https://app.powertom.com.br/manifest.webmanifest "PowerTom — Manifesto PWA"
[10]: https://github.com/tom-power "GitHub — perfil público encontrado na pesquisa"
[11]: https://lrclib.net/api/search?q=Alexandre%20Pires%20Spc%20Medley "LRCLIB — API pública de busca de letras"
