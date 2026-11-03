# Revisão factual das rotas PowerTom para orientar a evolução do Vocaloff

**Data da consulta:** 2026-11-02  
**Escopo:** registro do que foi efetivamente observado nas rotas web fornecidas do PowerTom, sem copiar ativos, sem enumerar APIs ou endpoints de backend e sem inferir detalhes de armazenamento, publicação ou funcionamento que não tenham sido exibidos.

## Como ler este documento

Este relatório separa três tipos de afirmação:

- **Observação:** conteúdo visível ou comportamento efetivamente verificado durante a navegação.
- **Desconhecido:** aspecto que não foi exibido, testado ou confirmado; não deve ser tratado como fato.
- **Proposta:** recomendação funcional para o Vocaloff, derivada de padrões observáveis na interface ou de uma necessidade explícita de validação futura. Propostas não são afirmações sobre o PowerTom.

A revisão foi somente de leitura. Não houve login, envio de formulário, upload, criação de show, reprodução, busca efetiva de conteúdo, alteração, salvamento ou exclusão de dados. Na entrada `/app`, o único clique realizado foi em **“Pular”**, o que levou a interface para `/app/library`; por isso, as observações posteriores da entrada inicial referem-se à biblioteca que a própria interface abriu.

## Sumário das rotas analisadas

| Rota web verificada | Status observado | Nível de evidência nesta revisão |
|---|---|---|
| [`/app`][1] | Carregou publicamente, sem login, bloqueio, tela em branco ou erro; após “Pular”, abriu a biblioteca. | **Alto** para a UI introdutória e os destinos visíveis; **inexistente** para publicação ou armazenamento público. |
| [`/app/library`][2] | Carregou sem login, redirecionamento ou erro; o tour introdutório permaneceu sobreposto. | **Alto** para textos, categorias e ações visíveis; **inexistente** para publicação ou armazenamento público. |
| [`/app/player`][3] | Carregou sem redirecionamento para login; apresentou o Player sem música selecionada. | **Alto** para o estado inicial e o tutorial; reprodução e persistência não foram testadas. |
| [`/app/shows`][4] | Carregou publicamente após uma breve espera; as primeiras visualizações ficaram escuras, e uma visualização posterior ficou legível. | **Alto** para os elementos visíveis; criação, salvamento e reprodução não foram acionados. |
| [`/app/performance`][5] | Carregou diretamente, mas o controle **“Sair”** indicava uma sessão já ativa; acesso público sem autenticação não foi confirmado. | **Médio** para o conteúdo da tela; **baixo/inexistente** para comportamento de visitante e armazenamento. |
| [`/app/settings`][6] | A rota carregou, mas a viewport ficou preta/vazia; nenhum elemento de interface foi detectado. | **Baixo**: somente a carga da rota e o título da aba foram observados. |

A tabela resume apenas as rotas web observadas. Ela não representa uma enumeração de endpoints de API, rotas ocultas ou serviços de backend.

## 1. Entrada do aplicativo — `/app`

**Fonte:** [`https://app.powertom.com.br/app`][1]

### Observações

- A abertura exibiu o título **“Player Profissional”**.
- A tela inicial mostrou **Músicas**, **Player**, **Shows**, **Palco**, **Sua Biblioteca** e **Config**.
- Foi exibido um aviso introdutório com o texto **“A banda inteira no seu celular”** e os botões **“Pular”** e **“Próximo”**.
- O único clique realizado foi em **“Pular”**. Depois disso, o navegador foi para `https://app.powertom.com.br/app/library`, rota que a interface abriu.
- Na biblioteca aberta foram observados **8.046 músicas**, busca por música ou artista, categorias musicais, repertórios prontos e blocos prontos.
- Também apareceram **Afinador**, **Metrônomo**, **Meus VS**, **Pedidos Pix**, **Suas músicas** e **Seus shows**.
- Havia a opção visível **“Adicionar minha música”** e o cartão **“Adicionar meus VS — pistas, .zip ou música inteira”**.
- A área de shows exibiu **“Novo show”** e uma mensagem sobre gorjeta via Pix nos shows, com QR code na mesa.

### Desconhecidos e limites

- Não foram acessados links adicionais a partir dessa entrada.
- Não foram testados reprodução, busca efetiva, upload, criação de show ou qualquer ação de alteração.
- Não foram usados APIs, tokens, rotas ocultas ou dados privados.
- O armazenamento e a publicação musical pública não foram demonstrados. A presença de uma biblioteca interna, de **“8.046 músicas”** e de ações para adicionar músicas ou VS não comprova disponibilidade pública desses arquivos.
- Não há conclusão sobre o backend, o esquema de dados, o local de armazenamento ou a distribuição do conteúdo.

## 2. Biblioteca musical — `/app/library`

**Fonte:** [`https://app.powertom.com.br/app/library`][2]

### Observações

A rota abriu sem redirecionamento para login, bloqueio, página em branco ou erro. A tela exibiu **“Início”** e **“8.046 músicas”**. O tour introdutório permaneceu sobreposto, com a mensagem **“A banda inteira no seu celular”**, explicando que seria possível escolher músicas da biblioteca e ligar ou desligar instrumentos no mixer.

Foram observados:

- Campo de busca com o placeholder **“Buscar música ou artista”**.
- Categorias e contagens visíveis: **Blocos prontos (378)**, **Forró (1773)**, **Sertanejo (1223)**, **Rock / Pop Internacional (1187)**, **Rock Nacional (1151)**, **MPB (1080)**, **Pagode (954)**, **Piseiro (290)**, **Gospel (192)**, **Arrocha (135)**, **Axé (37)** e **Brega (24)**.
- Seções **“Música do dia”**, **“Suas músicas”**, **“Seus shows”**, **“Repertórios prontos”** e **“Blocos prontos”**.
- Atalhos **Afinador**, **Metrônomo**, **Meus VS** e **Pedidos Pix**.
- Em **“Suas músicas”**, as opções **“Adicionar”** e **“Adicionar meus VS — pistas, .zip ou música inteira”**.
- Repertórios prontos: **Barzinho voz e violão**, **Sertanejo de barzinho**, **Piseiro e forró**, **Pagode**, **MPB e pop nacional**, **Flashback internacional**, **Rock nacional**, **Casamento (cerimônia e festa)**, **Aniversário e confraternização** e **Louvor e adoração**. Cada modelo indicava **12 músicas**.
- Em **“Seus shows”**, **“Ver todos”**, **“Novo show”** e a mensagem sobre ganhar gorjeta via Pix nos shows.
- **Ajuda** e **0/15 conquistas**.
- A lista visível mostrou blocos e faixas com títulos, artistas, quantidades e imagens de capa. Exemplos exibidos: blocos de Thiaguinho, Ferrugem e Wesley Safadão; e faixas como **“A Dama e o Vagabundo 124 110”**, **“A Loira a Ruiva e a Morena”** e **“Abre Abre”**.

Foram tentadas duas interações de leitura:

1. Um clique no filtro visível **“Forró”**, sem mudança visual observável porque o tour continuava sobreposto.
2. Preenchimento temporário da busca com **“Wesley Safadão”**, seguido da limpeza do campo; não houve mudança observável de conteúdo ou URL e nenhuma ação de gravação foi executada.

### Desconhecidos e limites

- O tour não foi dispensado nessa entrada para evitar alterar o estado da interface.
- Não foi confirmado se as categorias, contagens, capas, faixas ou repertórios são acessíveis para qualquer visitante, para usuários autenticados ou para ambos além do estado observado.
- As opções de adicionar músicas e VS não comprovam que os arquivos sejam armazenados ou publicados publicamente.
- A página não informa, no conteúdo observado, o local de armazenamento, a política de visibilidade, a distribuição ou o licenciamento dos arquivos musicais.

## 3. Player — `/app/player`

**Fonte principal:** [`https://app.powertom.com.br/app/player`][3]

Também eram visíveis no menu os destinos web [`/app/library`][2], [`/app/shows`][4], [`/app/performance`][5] e [`/app/settings`][6]. Esses destinos foram registrados como links de navegação visíveis, não como endpoints de API.

### Observações

- O título visível era **“Player Profissional”**.
- O estado central era **“Escolha uma música”**.
- O texto dizia: **“Abra uma música da biblioteca ou de um show para ajustar tom, mixer, letra e cifra.”**
- Havia os botões **“Abrir biblioteca”** e **“Meus shows”**.
- O tutorial visível repetia **“A banda inteira no seu celular”** e descrevia a escolha de uma música e o controle individual de instrumentos no mixer.
- O tutorial tinha **“Pular”** e **“Próximo”**. O clique em **“Pular”** o dispensou, mantendo a tela em `/app/player`.
- A interface declarava que uma música aberta poderia permitir ajuste de tom, mixer, letra e cifra.
- O tutorial descrevia reprodução com playback e controle individual de instrumentos no mixer.

### Desconhecidos e limites

- Nenhuma música foi aberta.
- Reprodução, ajuste de tom, mixer, letra, cifra, seleção de instrumentos, salvamento e recuperação de configurações não foram testados.
- Os textos da interface não foram tratados como prova de que esses comportamentos funcionam em todos os estados ou para todos os usuários.
- A menção à biblioteca ou a um show não informa se os arquivos são públicos, privados, compartilhados ou armazenados em algum local específico.

## 4. Shows — `/app/shows`

**Fonte:** [`https://app.powertom.com.br/app/shows`][4]

### Observações

As primeiras visualizações exibiram uma viewport escura sem elementos. Após uma nova visualização para aguardar o carregamento, a interface ficou legível e carregou sem redirecionamento para login.

Foram observados:

- Título **“Seus shows”** e o texto **“Monte o repertório, ajuste cada música e toque no palco.”**
- Botões **“Novo”** e **“Criar meu show”**.
- Seção **“Seu primeiro show em 1 minuto”**, com instruções para criar um show ou usar um repertório pronto, ajustar tom e mixer de cada música e tocar **“Iniciar show”**.
- Dez repertórios prontos: **Barzinho voz e violão**, **Sertanejo de barzinho**, **Piseiro e forró**, **Pagode**, **MPB e pop nacional**, **Flashback internacional**, **Rock nacional**, **Casamento (cerimônia e festa)**, **Aniversário e confraternização** e **Louvor e adoração**.
- Cada modelo informava **“12 músicas”**, seu gênero ou uso e exibia **“Usar e ajustar”** e **“Tocar”**.
- Cartão **“A banda inteira no seu celular”**, mencionando escolher uma música da biblioteca, ligar ou desligar instrumentos no mixer e tocar com playback.
- Aviso **“Pedidos e Gorjeta via Pix”**, descrevendo QR code na mesa e gorjeta no Pix.
- Menu com links visíveis para **Músicas**, **Player**, **Shows**, **Palco** e **Config**.

### Desconhecidos e limites

- Nenhum botão de criação, ajuste ou reprodução foi acionado.
- Não foi confirmado o que acontece depois de **“Novo”**, **“Criar meu show”**, **“Usar e ajustar”**, **“Tocar”** ou **“Iniciar show”**.
- A afirmação visível de que o ajuste de tom e mixer fica salvo foi registrada como texto da interface; não foi testada a persistência nem o local desse salvamento.
- **“Sua Biblioteca”** apareceu como texto de menu, mas não teve URL explicitamente exposta no conteúdo extraído dessa rota.
- Não há evidência visível de publicação ou distribuição pública de música; esse aspecto permanece desconhecido.

## 5. Modo Palco — `/app/performance`

**Fonte:** [`https://app.powertom.com.br/app/performance`][5]

### Observações

- A rota carregou diretamente e o conteúdo ficou visível.
- A tela tinha o título **“Modo Palco”**.
- O texto dizia **“Escolha o show que você vai tocar agora.”**
- Nenhum show ou repertório apareceu listado na área principal visível.
- Havia o botão **“Montar meu primeiro show”**.
- Havia a dica **“em \"Shows\" há repertórios prontos para tocar na hora.”**
- Foi visível um controle com dica/aria-label **“Sair”**, representado por um ícone X.

### Status de acesso e limites

O controle **“Sair”** indica que uma sessão já aparentava estar ativa no navegador. Portanto, embora a rota tenha carregado, o acesso público sem autenticação não foi confirmado. Não foi feito login, logout ou tentativa de contornar controles de acesso.

O botão **“Montar meu primeiro show”** não foi acionado porque poderia iniciar criação ou alteração de dados. Não foram acionados controles de navegação ou encerramento de sessão. A palavra **“Shows”** presente na dica foi tratada somente como texto explicativo, e não como uma rota pública adicional.

### Desconhecidos

- Não foi possível confirmar o comportamento da rota para visitante não autenticado.
- Não foi possível saber por que nenhum show apareceu, se isso representa uma conta sem shows ou outro estado da interface.
- Não foi exibida informação sobre armazenamento ou publicação pública de música.
- Não foram examinados endpoints, tokens, dados privados ou rotas não fornecidas ou não visivelmente vinculadas.

## 6. Configurações — `/app/settings`

**Fonte:** [`https://app.powertom.com.br/app/settings`][6]

### Observações

- A rota foi aberta diretamente.
- Não houve redirecionamento observável para login, mensagem visível de bloqueio ou erro.
- A viewport ficou preta/vazia; nenhum elemento de interface foi detectado.
- O título da página/aba era **“Player Profissional”**.

### Desconhecidos e limites

- Nenhum recurso de configuração pôde ser confirmado.
- Nenhum menu, link, formulário ou item de navegação ficou visível.
- Não é possível concluir, a partir dessa tela, quais configurações existem, se estão disponíveis para visitantes ou se houve falha de carregamento.
- Não houve investigação de endpoints de backend, rotas ocultas, tokens ou dados privados.
- Não foi exibida interface sobre armazenamento ou publicação musical.

## Rotas web observadas não são endpoints de API

As URLs registradas nesta revisão são rotas de interface web explicitamente fornecidas ou visíveis no navegador:

- `https://app.powertom.com.br/app`
- `https://app.powertom.com.br/app/library`
- `https://app.powertom.com.br/app/player`
- `https://app.powertom.com.br/app/shows`
- `https://app.powertom.com.br/app/performance`
- `https://app.powertom.com.br/app/settings`

Elas foram usadas somente para visualizar páginas e estados de UI. A revisão **não** enumerou, inspecionou ou inferiu endpoints HTTP de backend, APIs públicas ou privadas, rotas internas, chamadas de rede, tokens, esquemas de banco, buckets, filas ou integrações. Menções a links de menu como **Músicas**, **Player**, **Shows**, **Palco** e **Config** devem ser entendidas como navegação da interface, não como evidência de uma API correspondente.

## Onde o conteúdo musical público é armazenado?

**Resposta factual:** não identificado.

Nas telas observadas, não houve evidência de um local de armazenamento ou de publicação pública de conteúdo musical. A interface mostrou uma biblioteca interna com **“8.046 músicas”**, **“Sua Biblioteca”**, **“Adicionar minha música”** e **“Adicionar meus VS — pistas, .zip ou música inteira”**. Também mencionou músicas da biblioteca ou de um show, repertórios, playback, letra e cifra. Nada disso, isoladamente, comprova que os arquivos adicionados estejam publicamente disponíveis, que sejam distribuídos fora da aplicação ou que estejam armazenados em um local específico.

Assim, a conclusão permitida pelos dados é: **o armazenamento e a publicação pública da música permanecem desconhecidos e não foram identificados nesta revisão**. Não se deve deduzir um provedor, banco, bucket, CDN, endpoint ou política de visibilidade a partir dessas observações.

## Implicações funcionais para o Vocaloff

As recomendações abaixo são **propostas**, não descrições do PowerTom nem requisitos já confirmados. Elas derivam somente de elementos que foram observados na UI e devem ser validadas antes de implementação.

### Propostas baseadas em padrões observados

1. **Separar biblioteca, player, shows e modo palco.** A navegação observada distingue Músicas, Player, Shows e Palco. O Vocaloff pode avaliar uma separação equivalente para reduzir ambiguidade entre selecionar conteúdo, montar repertório, tocar e operar em apresentação.
2. **Oferecer busca por música ou artista.** O campo **“Buscar música ou artista”** foi observado na biblioteca. Para o Vocaloff, isso é uma proposta de busca textual; filtros, ordenação e indexação devem ser definidos posteriormente, sem assumir qualquer comportamento não testado.
3. **Organizar o catálogo por categorias com contagens.** Categorias como Forró, Sertanejo, MPB, Pagode e outras, acompanhadas de contagens, foram exibidas. O Vocaloff pode considerar categorias e contagens como uma opção de descoberta, desde que a taxonomia, a atualização das contagens e a visibilidade sejam especificadas.
4. **Diferenciar repertórios prontos, blocos e músicas individuais.** A biblioteca e a área de shows exibiram repertórios prontos, blocos e faixas. Uma proposta para o Vocaloff é modelar a experiência de descoberta em níveis, sem copiar nomes, capas, faixas ou outros ativos observados.
5. **Permitir montagem de shows a partir de repertório.** A tela de Shows exibiu criação de show, repertórios prontos, **“Usar e ajustar”** e **“Tocar”**. Para o Vocaloff, pode-se validar um fluxo de seleção de repertório e composição de um show, mas os passos, permissões e efeitos de salvar precisam ser definidos como requisitos próprios.
6. **Concentrar controles de apresentação em um Player.** O Player apresentou ajuste de tom, mixer, letra e cifra como possibilidades associadas a uma música. O Vocaloff pode avaliar quais controles são realmente necessários, priorizando uma experiência simples e testando cada controle independentemente.
7. **Avaliar mixagem por instrumento e playback.** O tutorial e os cartões mencionaram ligar ou desligar instrumentos no mixer e tocar com playback. Isso pode ser uma proposta de controle de stems ou partes musicais no Vocaloff, mas não autoriza assumir formatos de arquivo, disponibilidade de stems ou arquitetura técnica.
8. **Separar estado de edição de estado de palco.** A existência de **Modo Palco** e da ação para escolher o show a tocar sugere, como proposta, um modo operacional com menos controles de edição. A necessidade e o desenho desse modo devem ser validados com usuários do Vocaloff.
9. **Tratar o status de visibilidade da música como requisito explícito.** Como a revisão não identificou onde ou se músicas adicionadas ficam públicas, o Vocaloff deve especificar claramente, por música e por show, se o conteúdo é privado, compartilhado ou público. Essa é uma proposta de produto, não uma característica observada no PowerTom.
10. **Comunicar o resultado das ações de arquivo e persistência.** A interface exibiu ações para adicionar músicas/VS e informou que ajustes de tom e mixer ficam salvos, mas essas ações não foram testadas. Para o Vocaloff, é recomendável definir mensagens de sucesso, erro, processamento e visibilidade para upload, salvamento e publicação, caso essas capacidades sejam adotadas.
11. **Evitar copiar ativos.** Os exemplos de títulos, artistas, capas, categorias e repertórios foram registrados apenas como evidência de conteúdo visível. O Vocaloff deve criar conteúdo, taxonomia, identidade visual e ativos próprios ou usar material devidamente autorizado.

### Hipóteses que não devem ser tratadas como fatos

- Não é fato que a biblioteca seja pública em toda a sua extensão; apenas foi observado que a rota carregou e mostrou conteúdo naquele contexto.
- Não é fato que músicas adicionadas por usuários sejam públicas, privadas ou compartilháveis; o status não foi exibido.
- Não é fato que o ajuste de tom e mixer seja persistido em um backend específico; somente o texto da interface afirmava que o ajuste fica salvo.
- Não é fato que a tela de Modo Palco sem shows represente uma conta nova, uma conta vazia ou uma falha de carregamento.
- Não é fato que o conteúdo musical tenha sido disponibilizado por uma API pública; APIs não foram enumeradas.

## Limitações e próximos passos para uma revisão autorizada

A revisão atual foi deliberadamente não invasiva e limitada à UI pública ou ao estado já ativo no navegador. Para aumentar a evidência sem extrapolar autorização, os próximos passos podem ser:

1. Obter autorização explícita do responsável pelo sistema para testar uma conta de avaliação e os fluxos de visitante e usuário autenticado.
2. Confirmar, em ambiente autorizado, o comportamento de **Adicionar minha música**, **Adicionar meus VS**, busca, filtros, abertura de música, reprodução, mixer, ajuste de tom, letra, cifra, criação de show e **Iniciar show**.
3. Verificar, com dados de teste não protegidos, quais estados de visibilidade existem para uma música ou show e se há publicação ou compartilhamento público.
4. Testar a persistência declarada de ajustes de tom e mixer, documentando apenas o comportamento observado, sem presumir a implementação.
5. Repetir a abertura de `/app/settings` em ambiente autorizado para distinguir uma tela realmente vazia de um carregamento incompleto.
6. Confirmar o comportamento da rota `/app/performance` para visitante sem sessão, já que o estado observado tinha o controle **“Sair”**.
7. Somente se houver autorização específica, documentar chamadas de rede ou contratos de integração. Mesmo nesse caso, separar rotas web, endpoints de API, dados de teste e dados privados, sem publicar segredos ou tokens.
8. Para o Vocaloff, transformar as propostas deste relatório em requisitos próprios, validar com usuários e realizar testes de acessibilidade, estados vazios, erros, upload, persistência e controle de visibilidade.

## Referências

[1]: https://app.powertom.com.br/app "Entrada do aplicativo"
[2]: https://app.powertom.com.br/app/library "Biblioteca musical"
[3]: https://app.powertom.com.br/app/player "Player"
[4]: https://app.powertom.com.br/app/shows "Shows"
[5]: https://app.powertom.com.br/app/performance "Modo Palco"
[6]: https://app.powertom.com.br/app/settings "Configurações"
