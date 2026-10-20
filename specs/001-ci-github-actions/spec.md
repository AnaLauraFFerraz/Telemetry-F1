# Feature Specification: CI do front no GitHub Actions

**Feature Branch**: `001-ci-github-actions`

**Created**: 2026-10-20

**Status**: Draft

**Input**: User description (texto integral do pedido, para que a spec não dependa da conversa):

> CI do front no GitHub Actions, seguindo o padrão já adotado na API (TelemetryF1_API, spec 002). Objetivo: todo pull request para a main e todo push na main passam por uma verificação automática, e a main só aceita merge com a verificação aprovada.
>
> Contexto medido num checkout limpo (worktree da main, sem .env e sem node_modules, no Windows, Node 22.23.1): npm ci, tsc -b, npm run lint, npm test e npm run build passam. O runner Linux ainda não foi testado. O script de teste lista 4 arquivos à mão, então um teste novo fora da lista nunca roda. O node --test sai com código 0 quando um glob não encontra nenhum arquivo. Não existe script de typecheck (os tipos só são verificados dentro do build) nem declaração da versão do Node (engines ou .nvmrc). Não existe .github/.
>
> Requisitos:
> - Verificação automática em cada PR para a main e em cada push na main, com o resultado visível no PR.
> - Verificação de tipos, lint, testes e build como checks separados, todos executados mesmo quando um falha, para a lista de checks do PR mostrar sozinha o que falhou.
> - A CI só chama scripts do package.json. Deve existir um script de typecheck, para que localmente se rode exatamente o que a CI roda.
> - Qualquer arquivo de teste dentro de src/ é encontrado automaticamente, sem lista de arquivos no script, e o conjunto é o mesmo no Windows (cmd) e no Linux (sh). Uma descoberta vazia faz a verificação falhar.
> - A versão do Node vem de uma fonte única lida pelo ambiente local (eu uso fnm) e pela CI, com um mínimo declarado no package.json.
> - Nenhum segredo e nenhum arquivo fora do git: sem .env, sem a API rodando, sem nada configurado no GitHub. O workflow pede só permissão de leitura do conteúdo.
> - Os nomes dos checks são contrato com a proteção da main e com o selo do README.
> - A main fica protegida por um ruleset, com os mesmos critérios da API: merge só por PR, 0 aprovações, todos os checks obrigatórios, branch atualizada, histórico linear, bloqueio de push forçado e de exclusão, lista de bypass vazia e só "Rebase and merge". A configuração é tarefa manual minha, depois da primeira execução. A documentação inclui o procedimento de último recurso da API.
> - O README ganha um selo com o status da CI na main, sem números que desatualizam.
>
> Fora do escopo: deploy e demo pública; correção das vulnerabilidades apontadas pelo npm audit (vai para uma triagem separada) e qualquer gate de audit; verificação automática do contrato de tipos com a API; cobertura de testes; a emenda da constituição (PR separado, depois que a CI funcionar, como foi feito na API).
>
> Pontos para o /speckit-clarify:
> - Layout dos checks e o build: jobs separados para typecheck, lint, test e build (o build continua com tsc -b, repetindo a verificação de tipos), ou o build sem o tsc. Minha preferência inicial é manter o tsc no build.
> - Versão mínima do Node: subir para 22.17 se a guarda de descoberta vazia usar o fs.globSync estável, como na API, ou outra solução que mantenha 22.6.
> - Se o node --experimental-strip-types tem alguma limitação relevante para a descoberta com glob e para o alias @/ (hoje só usado em import type).

## Clarifications

### Session 2026-10-20

Decisões confirmadas pela dona do repositório:

- Q: O build mantém o `tsc -b`, repetindo a verificação de tipos? → A: Sim. Quatro checks separados (tipos, lint, testes, build); uma falha de tipos pode reprovar dois checks (tipos e build), e isso é comportamento esperado, documentado.
- Q: Qual a versão mínima do Node? → A: 22.17, porque a guarda de descoberta vazia usa o `fs.globSync` estável, o mesmo mecanismo de glob que o `node --test` usa. Uma guarda com outro mecanismo poderia discordar do runner.
- Q: O `--experimental-strip-types` tem limitação para a descoberta por glob e para o alias `@/`? → A: Não se decide na spec. O plano verifica com evidência, rodando comandos, essas duas limitações e se a versão de Node fixada já remove tipos sem a flag; o resultado vai para o `research.md`.
- Q: Como a versão do Node é fixada? → A: Um único Node fixado (major 22) num arquivo lido pelo fnm e pela CI; `engines.node` no `package.json` como mínimo declarado; sem matriz de versões.
- Q: O cache de dependências é opcional? → A: Não. Está decidido: o cache nativo do setup do Node, com chave no `package-lock.json`.
- Q: Em quais sistemas a CI roda? → A: Só Linux. A paridade com o Windows vem da descoberta de testes feita pelo próprio Node (glob entre aspas, sem expansão do shell) e é verificada localmente na máquina da dona do repositório.
- Q: Quando o ruleset é aplicado? → A: Pela dona do repositório, depois do merge do PR desta feature, para não travar PRs abertos a partir da `main` antiga.
- Q: Qual a referência do SC-005? → A: A primeira execução verde, com teto de 5 minutos; acima disso, o `research.md` registra a causa e a ação tomada.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Cada PR e cada push na main são verificados sozinhos (Priority: P1)

Quem abre um pull request para a `main` vê, na própria página do PR, quatro verificações separadas (tipos, lint, testes e build), cada uma com seu resultado. O mesmo conjunto roda em todo push na `main`. Quando uma falha, as outras continuam e terminam, então a lista de checks do PR mostra sozinha o que falhou, sem abrir logs para descobrir.

**Why this priority**: É o núcleo da feature. Sem a verificação automática não há o que proteger, e hoje os gates da constituição (`npm test`, `npm run lint`, `npm run build` antes de cada commit) dependem só de disciplina manual.

**Independent Test**: Abrir um PR de teste para a `main` com uma falha de lint proposital e uma falha de tipos proposital em arquivos diferentes. A lista de checks deve mostrar Lint, Tipos e Build reprovados (o build repete a verificação de tipos) e Testes com seu próprio resultado, e nenhum check cancelado por causa de outro.

**Acceptance Scenarios**:

1. **Given** um PR para a `main` sem problemas, **When** o PR é aberto ou recebe novos commits, **Then** os quatro checks rodam e todos terminam aprovados.
2. **Given** um PR em que só o lint falha, **When** a verificação termina, **Then** apenas o check de lint aparece reprovado e os outros três têm resultado próprio, executados até o fim.
3. **Given** um PR com um erro de tipos, **When** a verificação termina, **Then** os checks de tipos e de build aparecem reprovados (o build mantém o `tsc -b`), enquanto lint e testes têm resultado próprio. Isso é comportamento esperado e está documentado.
4. **Given** um push direto ou um merge que chega na `main`, **When** o push é recebido, **Then** os mesmos quatro checks rodam sobre o commit resultante.
5. **Given** um checkout limpo, sem `.env`, sem API rodando e sem nada configurado no GitHub além do workflow, **When** a verificação roda, **Then** ela chega ao resultado sem pedir segredo, variável ou serviço externo.

---

### User Story 2 - Qualquer teste novo em src/ roda automaticamente (Priority: P1)

Quem escreve um arquivo de teste dentro de `src/` não precisa lembrar de registrá-lo em lista nenhuma. O conjunto de testes é descoberto automaticamente e é o mesmo no Windows (cmd) e no Linux (sh). Se a descoberta não achar nenhum arquivo, a verificação falha em vez de passar em silêncio.

**Why this priority**: Hoje o script de teste lista 4 arquivos à mão: um teste novo fora da lista nunca roda e ninguém é avisado. Com CI isso daria uma falsa sensação de cobertura. O comportamento de sair com código 0 quando o glob não encontra nada tem o mesmo efeito.

**Independent Test**: Adicionar um arquivo `*.test.ts` com uma asserção falsa em qualquer subpasta de `src/` e rodar o script de teste: ele deve falhar. Remover todos os arquivos de teste: ele também deve falhar.

**Acceptance Scenarios**:

1. **Given** um novo arquivo de teste em qualquer subpasta de `src/`, **When** o script de teste roda, **Then** o arquivo é executado sem alteração em `package.json`.
2. **Given** a mesma árvore de arquivos, **When** o script roda no Windows (cmd) e no Linux (sh), **Then** o conjunto de arquivos executados é idêntico.
3. **Given** que a descoberta não encontra nenhum arquivo de teste, **When** o script roda, **Then** ele termina com falha e uma mensagem em português dizendo que nenhum teste foi encontrado.
4. **Given** os arquivos de teste que já existem no repositório, **When** o script roda, **Then** todos os testes existentes continuam passando, sem mudança de comportamento.

---

### User Story 3 - Os mesmos comandos da CI rodam na máquina local (Priority: P2)

Quem desenvolve consegue rodar, no próprio computador, exatamente o que a CI roda, chamando os mesmos scripts do `package.json`, incluindo um script de verificação de tipos que hoje não existe. A versão do Node vem de uma única fonte, lida tanto pelo ambiente local (fnm) quanto pela CI, e o `package.json` declara a versão mínima aceita.

**Why this priority**: Evita o "passa aqui, falha lá". Depende da Story 1 para ter sentido, mas entrega valor sozinha: dá a quem desenvolve um comando único para cada gate.

**Independent Test**: Num checkout limpo, rodar localmente cada script de verificação (tipos, lint, testes, build) e comparar o resultado com o do check de mesmo nome na CI. Trocar a versão na fonte única e confirmar que fnm e a CI passam a usar a nova.

**Acceptance Scenarios**:

1. **Given** um checkout limpo, **When** quem desenvolve roda o script de tipos, **Then** apenas a verificação de tipos executa, sem gerar o bundle de produção.
2. **Given** a definição de cada check na CI, **When** ela é lida, **Then** cada check chama somente um script do `package.json`, sem comandos próprios embutidos no workflow.
3. **Given** o arquivo único que fixa o Node (major 22), **When** o fnm entra na pasta do projeto e quando a CI prepara o ambiente, **Then** ambos resolvem a mesma versão major, sem matriz de versões.
4. **Given** uma versão de Node abaixo de 22.17 (o mínimo declarado em `engines.node`), **When** alguém roda `npm install` ou `npm ci`, **Then** o npm avisa que o ambiente não atende ao mínimo.
5. **Given** uma segunda execução da CI sem mudança no `package-lock.json`, **When** as dependências são instaladas, **Then** o cache de dependências é restaurado em vez de baixar tudo de novo.

---

### User Story 4 - A main só aceita merge com a verificação aprovada (Priority: P2)

Depois do merge do PR desta feature, e portanto depois de a CI já ter rodado, a dona do repositório configura manualmente um ruleset na `main` com os mesmos critérios da API (aplicá-lo só depois do merge evita travar PRs abertos a partir da `main` antiga). A documentação do repositório descreve o procedimento passo a passo, os nomes exatos dos checks exigidos e o procedimento de último recurso para quando a proteção precisar ser contornada.

**Why this priority**: Fecha o objetivo ("a main só aceita merge com a verificação aprovada"), mas depende de a CI existir e já ter rodado, porque o GitHub só oferece como obrigatórios os checks que já executaram. A configuração em si é manual e fica fora do código.

**Independent Test**: Seguindo só a documentação, configurar o ruleset num repositório com a CI já executada; tentar mergear um PR com check reprovado, fazer push direto na `main`, push forçado e exclusão da branch: todos devem ser recusados.

**Acceptance Scenarios**:

1. **Given** o ruleset ativo, **When** alguém tenta mergear um PR com qualquer check reprovado ou ainda pendente, **Then** o merge é bloqueado.
2. **Given** o ruleset ativo, **When** alguém tenta push direto na `main`, push forçado ou exclusão da branch, **Then** a operação é recusada, inclusive para a dona do repositório (lista de bypass vazia).
3. **Given** um PR com a branch desatualizada em relação à `main`, **When** se tenta mergear, **Then** o GitHub exige atualizar a branch antes.
4. **Given** um PR aprovado nos checks, **When** se abre o menu de merge, **Then** só "Rebase and merge" está disponível, mantendo o histórico linear.
5. **Given** a documentação, **When** alguém a lê, **Then** encontra os critérios do ruleset, os nomes exatos dos checks e o procedimento de último recurso completo, sem precisar abrir a API.

---

### User Story 5 - O README mostra o estado da CI na main (Priority: P3)

Quem abre o README vê um selo com o status atual da CI na `main` (aprovada ou reprovada), sem nenhum número que envelheça, como contagem de testes ou cobertura.

**Why this priority**: Visibilidade, sem efeito sobre a proteção. Depende do nome do workflow, que faz parte do contrato.

**Independent Test**: Abrir o README renderizado no GitHub depois da primeira execução na `main`: o selo aparece e reflete o resultado do último run. Provocar uma falha na `main` (num fork ou branch de teste com o mesmo workflow) e confirmar que o selo muda.

**Acceptance Scenarios**:

1. **Given** a última execução na `main` aprovada, **When** o README é aberto, **Then** o selo indica aprovado.
2. **Given** a última execução na `main` reprovada, **When** o README é aberto, **Then** o selo indica reprovado.
3. **Given** o README, **When** é lido, **Then** não contém nenhuma contagem de testes, percentual ou outro número que dependa do estado do código.

---

### Edge Cases

- Um arquivo de teste com erro de sintaxe: o script de teste deve falhar, não ignorar o arquivo.
- Pasta vazia ou arquivos de teste fora de `src/`: não são descobertos; a regra é "qualquer teste dentro de `src/`". Se só houver arquivos fora de `src/`, a descoberta vazia faz o script falhar.
- PR vindo de um fork: o workflow não tem acesso a segredos e não precisa deles; deve rodar com permissão somente de leitura do conteúdo.
- Falha de um check (por exemplo, tipos) não pode cancelar os outros: os quatro executam sempre.
- Renomear um check depois que o ruleset estiver ativo deixa o PR esperando um check que nunca roda; os nomes são contrato e só mudam junto com o ruleset e o selo.
- O ruleset só pode exigir checks que já rodaram uma vez; por isso a configuração vem depois da primeira execução e não faz parte da entrega de código.
- O build mantém o `tsc -b` e repete a verificação de tipos; uma falha de tipos reprova dois checks ao mesmo tempo (tipos e build). É esperado e fica documentado.
- A CI não usa filtros de caminho: um PR que só mexe em documentação também roda os quatro checks, senão um check obrigatório nunca reportaria e o merge ficaria bloqueado.
- Vulnerabilidades reportadas pelo `npm audit` (27 hoje) não reprovam nenhum check.
- A CI roda só em Linux e esse runner ainda não foi testado: caminhos, maiúsculas/minúsculas em nomes de arquivo e fim de linha podem se comportar diferente do Windows, onde a dona do repositório desenvolve. A paridade é verificada localmente no Windows e confirmada pela primeira execução na CI.

## Requirements *(mandatory)*

### Functional Requirements

**Verificação automática**

- **FR-001**: Todo pull request para a `main` DEVE disparar a verificação automática, com o resultado visível na página do PR.
- **FR-002**: Todo push na `main` DEVE disparar a mesma verificação.
- **FR-003**: A verificação DEVE expor quatro checks separados: tipos, lint, testes e build.
- **FR-023**: O check de build DEVE manter o `tsc -b` no script de build, repetindo a verificação de tipos; uma falha de tipos reprovar os checks de tipos e de build é comportamento esperado e DEVE estar documentado.
- **FR-024**: A CI DEVE rodar somente em Linux, sem matriz de sistemas operacionais, e sem filtros de caminho (todo PR para a `main` roda os quatro checks).
- **FR-004**: Os quatro checks DEVEM executar até o fim independentemente do resultado dos outros; a falha de um não cancela nem pula os demais.
- **FR-005**: Cada check DEVE chamar apenas um script do `package.json`; o workflow não contém comandos de verificação próprios.
- **FR-006**: A verificação DEVE rodar num checkout limpo, sem `.env`, sem variáveis `VITE_*`, sem a API rodando, sem WebSocket aberto, sem arquivos de pastas ignoradas e sem qualquer segredo ou configuração no GitHub.
- **FR-007**: O workflow DEVE solicitar somente permissão de leitura do conteúdo do repositório.
- **FR-008**: A verificação NÃO DEVE incluir gate de `npm audit`, cobertura de testes, verificação do contrato de tipos com a API, deploy nem demo pública.

**Scripts e testes**

- **FR-009**: DEVE existir um script de verificação de tipos que cubra o mesmo que o `tsc -b` cobre hoje (`src/` e `vite.config.ts`) sem gerar o bundle.
- **FR-010**: O script de teste NÃO DEVE listar arquivos à mão; todo arquivo de teste dentro de `src/` DEVE ser descoberto automaticamente.
- **FR-011**: A descoberta DEVE produzir o mesmo conjunto de arquivos no Windows (cmd) e no Linux (sh): o glob DEVE ser passado entre aspas ao `node --test`, que o resolve por conta própria, sem depender de expansão feita pelo shell. A paridade com o Windows é verificada localmente na máquina da dona do repositório.
- **FR-012**: Uma descoberta vazia DEVE fazer o script de teste terminar com falha e mensagem clara em português. A guarda DEVE usar o `fs.globSync` estável, o mesmo mecanismo de glob do `node --test`, para não discordar do runner.
- **FR-013**: Os testes existentes DEVEM continuar passando sem mudança de comportamento, respeitando as convenções do projeto (testes só de funções puras, import relativo com `.ts`, `@/` apenas em `import type`).

**Versão do Node**

- **FR-014**: A versão do Node usada na CI e no ambiente local (fnm) DEVE vir de um único arquivo do repositório que fixa o major 22; não há matriz de versões.
- **FR-015**: O `package.json` DEVE declarar `engines.node` com mínimo 22.17 (primeira versão em que o `fs.globSync` usado pela guarda é estável). Isso substitui o "Node.js ≥ 22.6" hoje citado no `CLAUDE.md` e na constituição; a emenda da constituição segue em PR separado (fora do escopo), e o `CLAUDE.md` DEVE ser atualizado nesta entrega.
- **FR-025**: A instalação de dependências na CI DEVE usar o cache nativo do setup do Node, com chave no `package-lock.json`.
- **FR-026**: O plano DEVE verificar com evidência, rodando comandos, (a) se o `--experimental-strip-types` tem limitação para a descoberta por glob, (b) se tem limitação para o alias `@/` e (c) se a versão de Node fixada já remove tipos sem a flag, e registrar o resultado no `research.md`.

**Contrato dos nomes**

- **FR-016**: Os nomes do workflow e dos quatro checks DEVEM ser estáveis e únicos, e DEVEM estar listados na documentação, pois são contrato com o ruleset da `main` e com o selo do README.

**Proteção da main (documentação e passo manual)**

- **FR-017**: A documentação DEVE descrever o ruleset da `main` com exatamente estes critérios, os mesmos da API: merge somente por PR; 0 aprovações exigidas; os quatro checks obrigatórios; branch atualizada antes do merge; histórico linear; bloqueio de push forçado; bloqueio de exclusão; lista de bypass vazia; apenas "Rebase and merge" habilitado.
- **FR-018**: O README deste repositório DEVE descrever por inteiro o procedimento de último recurso, sem depender de ler a API: (1) se o GitHub Actions estiver indisponível, esperar primeiro; (2) somente em último caso, desativar o ruleset deste repositório, mergear, reativar o ruleset na hora e registrar o motivo no PR. A API é citada apenas como origem do procedimento, nunca como substituto do texto.
- **FR-019**: A configuração do ruleset é um passo manual da dona do repositório, feito depois do merge do PR desta feature (a CI já terá rodado, então os checks são listáveis, e PRs abertos a partir da `main` antiga não ficam travados); o código desta feature não a aplica.

**README**

- **FR-020**: O README DEVE ganhar um selo de status da CI referente à `main`.
- **FR-021**: O README NÃO DEVE conter contagens de testes, cobertura ou qualquer outro número que desatualize.
- **FR-022**: Se a feature alterar um item listado em "Known limitations/pitfalls", ele DEVE ser removido do `CLAUDE.md` e do README na mesma entrega; a documentação descreve apenas o que existe no código.

### Key Entities

- **Workflow de CI**: a definição versionada da verificação automática: quando dispara, que permissões pede e quais checks produz.
- **Check**: uma verificação nomeada e independente (tipos, lint, testes, build) com resultado próprio por commit. O nome é contrato.
- **Ruleset da main**: a proteção configurada manualmente no GitHub que exige PR, checks aprovados, branch atualizada e histórico linear.
- **Fonte única da versão do Node**: o arquivo do repositório que fixa o major 22, de onde o fnm e a CI leem a versão, complementado pelo mínimo 22.17 em `engines.node` no `package.json`.
- **Selo de status**: o indicador no README do último resultado da CI na `main`.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% dos PRs para a `main` e 100% dos pushes na `main` têm os quatro resultados de check visíveis no GitHub, sem nenhuma ação manual.
- **SC-002**: Com uma falha introduzida em apenas um dos quatro gates, quem revisa identifica qual gate falhou olhando só a lista de checks do PR, sem abrir logs.
- **SC-003**: Um novo arquivo de teste em qualquer subpasta de `src/` é executado na primeira rodada, em 0 edições de arquivos de configuração.
- **SC-004**: O conjunto de testes executados é idêntico no Windows (verificado localmente) e no Linux (CI): mesma lista de arquivos, mesmo total de testes.
- **SC-005**: A primeira execução verde da CI é a referência de tempo e termina em até 5 minutos, incluindo a instalação das dependências. Se passar de 5 minutos, o `research.md` registra a causa e a ação tomada.
- **SC-006**: Seguindo só a documentação, a dona do repositório configura o ruleset sem consultar outra fonte, e todas as tentativas de merge com check reprovado, push direto, push forçado e exclusão da `main` são recusadas.
- **SC-007**: A verificação não depende de nenhum segredo, variável de ambiente ou serviço externo: 0 itens configurados no GitHub além do próprio workflow e do ruleset.
- **SC-008**: Os scripts que a CI chama produzem o mesmo resultado quando rodados localmente no mesmo commit.

## Assumptions

- A origem do padrão é a spec 002 do repositório `TelemetryF1_API`. Cada decisão herdada dela está escrita nesta spec (checks separados e sempre executados, CI chamando só scripts do `package.json`, permissão só de leitura, critérios do ruleset, procedimento de último recurso, selo sem números, constituição emendada em PR separado); a API é citada como origem, nunca como substituto do texto. Onde o front diverge, esta spec registra o motivo.
- Os nomes exatos do workflow e dos checks serão fixados no plano; a spec exige apenas que sejam estáveis, únicos e documentados. Seguindo a convenção do projeto (identificadores em inglês), a sugestão inicial é Typecheck, Lint, Test e Build.
- O repositório é público ou o plano do GitHub permite rulesets e Actions sem custo adicional para este uso.
- A configuração do ruleset acontece depois do merge do PR desta feature: o GitHub só lista como obrigatórios checks que já rodaram (a CI roda no próprio PR da feature), e aplicar antes travaria PRs abertos a partir da `main` antiga.
- A emenda da constituição (mencionar CI, versão do Node) é um PR separado, depois que a CI funcionar, como foi feito na API.
- Dependências são instaladas a partir do `package-lock.json` já versionado; as 27 vulnerabilidades do `npm audit` seguem para uma triagem separada.
- Linha de base medida em 2026-10-20 no Windows com Node 22.23.1, num checkout limpo da `main`: instalação, tipos, lint, build e os testes existentes (4 arquivos, 16 testes) passam sem `.env`. Os números são só referência datada, não requisito. O comportamento no runner Linux ainda não foi medido; validá-lo faz parte desta feature.
- Mensagens de erro e comentários novos seguem pt-BR; identificadores, nomes de arquivo e commits em inglês.
- Nenhum commit ou PR deste trabalho leva `Co-Authored-By` nem rodapé "Generated with" (CLAUDE.md e constituição).

## Verificações delegadas ao plano

- As limitações do `--experimental-strip-types` para a descoberta por glob e para o alias `@/` (hoje usado só em `import type`), e se o Node fixado já remove tipos sem a flag, não são decididas aqui: o plano as verifica rodando comandos e registra a evidência no `research.md` (FR-026).
