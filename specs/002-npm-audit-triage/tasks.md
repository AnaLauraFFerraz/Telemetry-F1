---

description: "Tarefas da spec 002: triagem e correção das vulnerabilidades do npm audit"
---

# Tasks: Triagem e correção das vulnerabilidades do npm audit

**Input**: documentos de `specs/002-npm-audit-triage/`

**Prerequisites**: [plan.md](plan.md), [spec.md](spec.md), [research.md](research.md), [quickstart.md](quickstart.md). Não há `data-model.md` nem `contracts/` (plan.md, "Artefatos que não se aplicam").

**Tests**: não se aplica. A feature não cria lógica nova no projeto: troca versões de dependências e uma linha de import em 6 arquivos. Os 27 testes de funções puras existentes rodam sem mudança antes de cada commit (SC-007). A verificação de comportamento é pelo [quickstart.md](quickstart.md) (auditoria, quatro checks, roteiro de navegação, bundle, escuta) e pelas capturas de tela do "antes" e do "depois".

**Organization**: as fases seguem a "Order of work" do plan.md, que é a ordem de dependência. As fases de dependências (Fases 3 a 5 deste arquivo) são as Fases 1 a 3 do plano; a prioridade da spec aparece no título de cada uma.

## Convenções deste arquivo

- **[P]**: pode rodar em paralelo (arquivos diferentes, sem dependência pendente). Nenhuma tarefa que toca `package.json` ou `package-lock.json` tem [P].
- **[USn]**: user story da spec.
- **[MANUAL]**: feito pela mantenedora. Cada uma diz o que ela **entrega** de volta para esta sessão.
- **[PARADA]**: a sessão para e espera a mantenedora antes de seguir.
- **(se ...)**: tarefa condicional. Quando a condição não ocorre, é marcada como feita com a nota "não ocorreu".
- **Commits**:
  - Conventional Commits, atômicos, em inglês, **sem trailer `Co-Authored-By`** e sem rodapé "Generated with" (vale também para o PR);
  - antes de cada commit rodam `npm run typecheck`, `npm test`, `npm run lint` e `npm run build`; falha é reportada, nunca contornada;
  - o `.specify/feature.json` nunca entra em commit.
- **Versões (D11)**: todo `npm audit fix` e todo `npm install` de pacote da feature roda com `--before=<corte da fase>`, e a versão resolvida e a data de publicação (`npm view <pacote> time`) vão para o `research.md`.
- **Evidência**: vai para a seção "Evidência da implementação" de `specs/002-npm-audit-triage/research.md`, com comando e saída.
- Edições de texto só com as ferramentas Edit e Write, nunca com comandos de shell.
- **Worktrees**: antes de qualquer `git worktree remove --force`, o `git status --porcelain` do worktree é mostrado à mantenedora e registrado junto da medição, para provar que só sobraram arquivos gerados (`dist/`, `node_modules/`, `.env`). Remoção sem `--force` quando o worktree estiver limpo.
- Nenhum comando roda no repositório da API nesta sessão. O que é da API é [MANUAL] (ou de uma sessão do Claude Code aberta lá).

---

## Phase 1: Medições do "antes" na `main` (D1, D8, T4)

**Purpose**: medir a referência única antes de qualquer mudança de dependência. Depois que o Vite 5 sai do lockfile, o "antes" não pode mais ser gerado (D1).

**⚠️ CRITICAL**: nenhuma mudança de dependência começa antes do fim desta fase.

- [X] T001 Conferir o ponto de partida e preparar a `main`, sem alterar arquivos do repositório:
  - branch `002-npm-audit-triage` com working tree limpo, exceto `.specify/feature.json`; `node -v` em 22.x; os quatro scripts passando;
  - `git worktree add C:\Telemetry\wt-002-main main` (fora dos dois repositórios), com um `.env` copiado do `.env.example` e `npm ci`;
  - copiar `bundleSizes.mjs` e `devListen.mjs` do scratchpad para `specs/002-npm-audit-triage/evidence/tools/` da branch, com o comentário do topo dizendo como rodar (T5), para que as medições não dependam do scratchpad de uma sessão;
  - anotar o SHA da `main` e a data de início da implementação.
  - (FR-005; D1, T5; quickstart, pré-requisitos)
- [X] T002 No worktree da `main`, medir e anotar (as notas vão para o `research.md` em T017), rodando as ferramentas pelo caminho da branch, `C:\Telemetry\Telemetry-F1\specs\002-npm-audit-triage\evidence\tools\`:
  - `npm audit` e `npm audit --omit=dev`, com a data, como referência do dia (FR-002, FR-003);
  - `npm run build` e `node <ferramentas>\bundleSizes.mjs dist` (FR-015; research, ponto 7);
  - os navegadores-alvo efetivos do Vite 5, por `ESBUILD_MODULES_TARGET` em `node_modules/vite/dist/node/constants.js` (FR-012; quickstart, parte 4);
  - o endereço de escuta, com `node <ferramentas>\devListen.mjs 5191` (FR-013a; quickstart, parte 5).
  - (D1)
- [X] T003 [MANUAL] [PARADA] Aprovar a instalação do Playwright e do Chromium dele fora dos dois repositórios. Antes, a sessão mostra a versão escolhida pela regra do D11 (a mais recente publicada antes do corte, com a data de `npm view playwright time`) e o diretório de instalação proposto, fora dos dois repositórios (por exemplo, `C:\Telemetry\playwright-002\`). **Entrega**: aprovação explícita, ou outra versão ou diretório. (T4; D1, D11)
- [X] T004 Instalar no diretório aprovado na T003 (por exemplo, `C:\Telemetry\playwright-002\`): `npm i playwright@<versão aprovada>`, conferir com `npx playwright --version` de dentro da pasta que a versão é a aprovada (para o `npx` não buscar outra) e, com `PLAYWRIGHT_BROWSERS_PATH=<pasta>\browsers` definida, `npx playwright install chromium`. O Chromium fica dentro da mesma pasta. Anotar a versão e a data de publicação para o `research.md`. Nada muda no `package.json` do front. (FR-016c; T4, D11)
- [X] T005 [P] Escrever o script de captura em `specs/002-npm-audit-triage/evidence/tools/captureStates.mjs`:
  - comentário no topo com o comando para rodar e a versão do Playwright (T5);
  - a variável `PLAYWRIGHT_BROWSERS_PATH`, com a mesma pasta de navegadores da instalação, é obrigatória na hora de rodar e fica documentada no comentário do topo; sem ela o script sai com mensagem clara;
  - o diretório do Playwright entra pelo argumento `--playwright-dir` ou pela variável `PLAYWRIGHT_DIR`, documentados no comentário do topo, e o Playwright é carregado de lá (`createRequire`). Nenhum caminho absoluto da máquina da mantenedora fica no script. Sem o diretório, o script sai com uma mensagem clara, sem tentar resolver o Playwright de dentro do repositório e sem `npm install` nele;
  - argumentos: URL base do preview, prefixo `NN`, id da sessão, volta de comparação com cache, volta sem cache e pasta de saída;
  - viewport fixo de 1440×900 e os 6 estados da lista fixa, nos nomes `NN-<n>-<estado>.png` (quickstart, parte 6);
  - no estado 5, registrar o status da resposta do `POST` de análise e falhar se não for 503.
  - (FR-016b, FR-016c; T4, T5; research, ponto 5)
- [X] T006 [P] No worktree da `main`, `npm run dev` (porta 5173) e abrir `http://localhost:5173` no Chromium da T004: o app carrega. Anotar como referência para o cenário 3 da US2, conferido de novo na T041. Encerrar o servidor. (US2; D1)
- [X] T007 [MANUAL] [PARADA] Preparar a cópia do banco (research, ponto 6, passos 1–3):
  - criar `C:\Telemetry\snapshots-002\` e o `api-conferencia.env` (cópia do `.env.example` da API só com as portas, sem a linha da chave);
  - gerar a cópia mestra com `VACUUM INTO 'C:/Telemetry/snapshots-002/telemetry-master.db'`;
  - escolher a sessão, a volta de comparação com análise em cache (cuja volta principal é a mais recente) e uma volta sem cache.
  - **Entrega**: confirmação de que a mestra e o `.env` de conferência existem, o id da sessão, a volta com cache e a volta sem cache. Nenhum conteúdo do banco nem do `.env` vem para esta sessão.
  - (FR-016a; D8)
- [X] T008 [MANUAL] [PARADA] Rodada "antes" da API, pelo procedimento completo do D8 (research, ponto 6, passos 4–6):
  - antes da cópia, `Test-Path C:\Telemetry\snapshots-002\telemetry-run.db*` tem de dar `False` (o `Copy-Item` sobrescreve um arquivo existente, e um `-wal` que sobrou de uma rodada interrompida seria aplicado sobre a cópia nova); com `True`, a mantenedora investiga e limpa como na T010;
  - copiar a mestra para um `C:\Telemetry\snapshots-002\telemetry-run.db` novo;
  - no terminal da API, `DOTENV_CONFIG_PATH=C:\Telemetry\snapshots-002\api-conferencia.env` e `DB_PATH=C:\Telemetry\snapshots-002\telemetry-run.db`;
  - nesse terminal, rodar a conferência sem custo, `node -e "require('dotenv/config'); console.log(Boolean(process.env.ANTHROPIC_API_KEY))"`; com `true`, nada sobe e a mantenedora investiga;
  - só com `false`: subir a API (`npm run dev`) e conferir o log `[db] usando banco em …`;
  - **o replay não começa aqui**: ele começa na T009, quando a sessão do front avisar.
  - **Entrega**: o `false` impresso pela conferência, a confirmação de que o log aponta para a cópia e de que as portas do `api-conferencia.env` batem com o `.env` do front. Sem o `false`, esta sessão não segue.
  - (FR-016a, FR-016c; D8)
- [X] T009 [PARADA] No worktree da `main`, com a API da T008 no ar e sem replay:
  - `npm run build` e `npm run preview` (porta 4173);
  - percorrer o roteiro de navegação da parte 3 do quickstart como referência, anotando o resultado de cada passo;
  - **avisar "inicie o replay"** e esperar a mantenedora iniciar, num segundo terminal, com o mesmo `DOTENV_CONFIG_PATH`, `npm run replay -- recordings/demo-interlagos-tt-20hz-laps6-8.jsonl` (1x, cerca de 3 min 43 s) e confirmar. **Entrega**: a confirmação de que o replay começou;
  - só então rodar `captureStates.mjs` com `NN = antes`, `--session 1 --cache-lap 2 --nocache-lap 1`, gravando em `specs/002-npm-audit-triage/evidence/` da branch; o estado 5 tem de registrar 503. O dashboard é o primeiro estado, para cair dentro do replay.
  - (FR-009, FR-016, FR-016b, FR-016c; D1, D8)
- [X] T010 [MANUAL] Parar o replay e a API (o replay e a API terminam antes da limpeza) e apagar os três arquivos da rodada, com caminhos explícitos: `C:\Telemetry\snapshots-002\telemetry-run.db`, `telemetry-run.db-wal` e `telemetry-run.db-shm`, e conferir que `Test-Path C:\Telemetry\snapshots-002\telemetry-run.db*` dá `False` (o banco da API usa `journal_mode = WAL`). **Entrega**: confirmação. (FR-016a; D8; research, ponto 6, passo 9)
- [X] T011 Revisar as capturas do "antes" imagem por imagem, procurando dado pessoal vindo do jogo ou da API (nome de jogador, piloto, conta ou máquina), e somar o tamanho total. Anotar o resultado e o total. (D1)
- [X] T012 [MANUAL] [PARADA] (não ocorreu: a T011 não achou nome nem identificador, e a mantenedora decidiu manter as datas reais; total de 0,57 MiB) (se T011 achar dado pessoal ou o total passar de 5 MB) Decidir a saída: não commitar as imagens e deixar só a comparação no `research.md`, recortar, comprimir ou outra. **Entrega**: a decisão. Nada é commitado antes dela. (D1)
- [X] T013 Remover o worktree (`git worktree remove C:\Telemetry\wt-002-main`) e conferir que `git worktree list` só mostra o repositório. (D1)

**Checkpoint**: referência medida; capturas revisadas guardadas em `evidence/`, ainda sem commit.

---

## Phase 2: Emenda da constituição e registro do "antes" (D2, D1)

**Purpose**: o primeiro commit da implementação é a emenda (D2); o segundo, o registro do "antes".

- [X] T014 Rodar o `/speckit-constitution` para reescrever a restrição de tecnologia de `.specify/memory/constitution.md`: React, TypeScript `strict`, Vite e React Router sem número de major, com a frase de que as versões vivem no `package.json`, a fonte única; o Node.js ≥ 22.17 fica, com o motivo atual. Mostrar a versão proposta, o motivo e o diff, sem aplicar. (FR-021; D2)
- [X] T015 [MANUAL] [PARADA] Aprovar a versão e o texto da emenda. **Entrega**: aprovação, ou ajuste no texto ou na versão. (FR-021; D2)
- [X] T016 Aplicar a emenda e commitar só `.specify/memory/constitution.md` como `docs: amend the constitution to keep library versions in package.json`, com o Sync Impact Report no corpo do commit. O `CLAUDE.md` não muda aqui. Guardar o Sync Impact Report para a descrição do PR (T023). (FR-021; D2)
- [X] T017 Criar a seção "Evidência da implementação" em `specs/002-npm-audit-triage/research.md` com o que foi medido na Phase 1. A contagem de produção é registrada por pacote (3, todos altos) e por advisory (6: 1 alta e 5 moderadas, com os GHSA), com a declaração de qual forma o research usa daqui em diante, a mesma em todas as fases. O bundle segue o método do research, ponto 7 ("Medição por worktree novo"): a referência do SC-004 é a medição do worktree da `main` (223.869 B), e as três medições do mesmo código (simulação, checkout da branch e worktree), com o resultado de `core.autocrlf` e `git ls-files --eol` e o motivo da escolha, já estão lá e são citadas aqui. O conteúdo: SHA da `main`, data, auditoria, tabela do bundle, navegadores-alvo, saída do `devListen`, versão e data do Playwright, lista das capturas, resultado da revisão e tamanho total. Rodar `npm run lint` e `npm run typecheck` com as ferramentas em `evidence/tools/` e registrar a saída (ESLint lê os `.mjs` com 0 regras e sai com 0; o `typecheck` não os inclui). Commitar `docs: record the baseline measurements for spec 002` com o `research.md`, `evidence/tools/` e as capturas aprovadas. (FR-003, FR-012, FR-013a, FR-015, FR-016b; D1, T5)

**Checkpoint**: constituição verdadeira antes e depois de cada troca; referência commitada.

---

## Phase 3: Fase 1 do plano, correções dentro das faixas atuais (US4, P3; US2, P2) (D3)

**Goal**: React Router na 6.30.x, cadeia do `typescript-eslint` corrigida e ESLint 9.39.x, sem trocar major.

**Independent Test**: quatro checks verdes; `npm audit` com o resultado esperado da fase (quickstart, parte 1).

- [X] T018 [US4] Registrar no `research.md` o corte da Fase 1 (data de início menos 14 dias) antes do primeiro comando. (D11)
- [X] T019 [US2] Rodar `npm audit fix --before=<corte da Fase 1>`. Conferir que o `package.json` não mudou e que o lockfile tem os binários de plataforma do Linux esperados (research, ponto 4). Anotar as versões resolvidas e as datas. Se D11 se aplicar, ir para T021 antes do commit. Commitar `package-lock.json` como `fix: apply npm audit fix within the current ranges`. (FR-004; D3, D11)
- [X] T020 [US2] Rodar `npm install -D eslint@^9.39 @eslint/js@^9.39 --before=<corte da Fase 1>`. O piso no `package.json` fica `^9.39.<patch resolvido>`, sem mudar regras nem `eslint.config.js`; `eslint .` sem avisos. Se D11 se aplicar, ir para T021 antes do commit. Commitar `package.json` e `package-lock.json` como `fix: update ESLint to 9.39`. (FR-014; D3, T1, D11)
- [X] T021 [MANUAL] [PARADA] [US4] (não ocorreu: as versões adequadas existiam antes do corte) (se nenhuma versão adequada existir antes do corte em T019 ou T020) A sessão registra no `research.md` o pacote, o advisory, a primeira versão que corrige e a data dela. **Entrega**: a decisão entre esperar a versão completar 14 dias, abrir uma exceção registrada só para aquele pacote ou seguir sem a correção e registrar a vulnerabilidade como restante. (FR-002; D11)
- [X] T022 [US4] Verificar a fase e anotar para o commit de registro (T026): os quatro scripts passam; `npm audit` e `npm audit --omit=dev` com a data (esperado 5 e 2 moderadas; diferença registrada e explicada); `eslint .` sem avisos; bundle medido num worktree novo do commit da T020 (`git worktree add --detach C:\Telemetry\wt-002-fase1 <sha>`, `.env`, `npm ci`, `npm run build`, `evidence/tools/bundleSizes.mjs`), removido com `git worktree remove` depois da medição. (FR-003, FR-005, FR-015; D3; quickstart, partes 1, 2 e 4; research, ponto 7)
- [X] T023 [MANUAL] [PARADA] [US4] Aprovar o push 1 e a abertura do PR. A sessão mostra antes o título e a descrição do PR, com o Sync Impact Report da T016 e sem rodapé. **Entrega**: aprovação explícita do push e da abertura. A mantenedora aprovou com uma mudança: o PR é aberto como **rascunho** (`gh pr create --draft`), porque com os quatro checks verdes depois da Fase 1 ele ficaria pronto para merge com a spec pela metade, e o GitHub não permite mergear um rascunho. (FR-006a, FR-021; D2, D5)
- [X] T024 [US4] Dar o push da branch e abrir o PR contra a `main` com `gh pr create --draft`. (FR-006a; D5)
- [X] T025 [US4] Esperar a CI com `gh run watch` até o fim e anotar o id da execução, o SHA e o resultado dos quatro checks (`typecheck`, `lint`, `test`, `build`). Com a CI vermelha (D5), nunca pulando check:
  - **falha vinda do código**, inclusive só no Linux: registrar a causa no `research.md`, corrigir num commit novo e **[PARADA]** pedir aprovação de um push próprio para ele (a mantenedora **entrega** a aprovação explícita); depois do push, esperar a CI de novo. Nunca re-run;
  - **falha de infraestrutura** (runner, rede, timeout de download): `gh run rerun <id> --failed`, registrando no `research.md` o motivo e o id das duas execuções.
  - **A Phase 4 só começa depois desta tarefa, com a CI verde.** (FR-005, FR-006a; D5)

**Checkpoint**: Fase 1 verificada localmente e na CI.

---

## Phase 4: Fase 2 do plano, React Router 7 (US1, P1) 🎯 MVP (D4)

**Goal**: `npm audit --omit=dev` em zero, com a navegação igual à de antes.

**Independent Test**: `npm audit --omit=dev` mostra 0; o roteiro da parte 3 do quickstart passa no build de produção servido localmente.

- [X] T026 [US4] Registrar no `research.md` o corte da Fase 2 e os resultados da Fase 1 (T019, T020, T022 e a execução da T025). Commitar `docs: record the phase 1 CI run for spec 002`. (FR-003, FR-006a; D5, D11)
- [X] T027 [US1] Refazer a busca de `<Link`, `navigate(`, `useNavigate`, `redirect` e `Navigate` em `src/` e confirmar que a tabela "Verificação formal do FR-007" do `research.md` continua completa. Uma ocorrência nova entra na tabela, com a origem do destino, no commit da T031. (FR-007)
- [X] T028 [MANUAL] [PARADA] [US1] Subir a API para a navegação da Fase 2, pelo procedimento completo do D8 (segunda rodada):
  - `Test-Path C:\Telemetry\snapshots-002\telemetry-run.db*` dando `False` e, só então, copiar a mestra para um `telemetry-run.db` novo;
  - `DOTENV_CONFIG_PATH` e `DB_PATH` apontando para o `api-conferencia.env` e o `telemetry-run.db`, como na T008;
  - conferência sem custo; só com `false`, subir a API e conferir o log;
  - sem replay e sem clique no coach.
  - **Entrega**: o `false` da conferência e a confirmação de que o log aponta para a cópia. Sem o `false`, esta sessão não segue.
  - (FR-009, FR-016a; D4, D8)
- [X] T029 [US1] Em `src/router/router.tsx`, acrescentar `future={{ v7_startTransition: true, v7_relativeSplatPath: true }}` ao `<BrowserRouter>`. Percorrer o roteiro da parte 3 do quickstart no dev server, com a API da T028. Commitar `fix: opt into the React Router v7 future flags`. (FR-008, FR-009; D4)
- [X] T030 [MANUAL] [PARADA] [US1] (não ocorreu: a 7.18.4 está antes do corte) (se nenhuma `react-router` ≥ 7.18.0 existir antes do corte da Fase 2) Mesmo registro e mesma decisão da T021. **Entrega**: a decisão. (FR-002; D4, D11)
- [X] T031 [US1] Trocar o pacote e os imports:
  - `npm uninstall react-router-dom` e `npm install react-router@^7 --before=<corte da Fase 2>`; a versão resolvida tem de ser ≥ 7.18.0 (senão, T030);
  - `from "react-router-dom"` vira `from "react-router"` em `src/router/router.tsx`, `src/pages/dashboard/DashboardPage.tsx`, `src/pages/notFound/NotFoundPage.tsx`, `src/pages/sessionAnalysis/SessionAnalysisPage.tsx`, `src/pages/sessionHistory/SessionHistoryPage.tsx` e `src/pages/settings/SettingsPage.tsx`;
  - remover a prop `future` de `src/router/router.tsx`;
  - no `CLAUDE.md` Stack, "React Router 6" vira "React Router 7"; o `README.md` não cita a versão (D6).
  - Commitar `package.json`, `package-lock.json`, os 6 arquivos e o `CLAUDE.md` como `fix: upgrade to React Router 7`.
  - (FR-008, FR-022; D4, D6, D11)
- [X] T032 [US1] Verificar a fase e anotar para o commit de registro (T037):
  - os quatro scripts passam;
  - `npm audit --omit=dev` dá 0 e `npm audit` dá o resultado esperado (3, só a cadeia do Vite), com a data;
  - o roteiro da parte 3 do quickstart passa em `npm run build && npm run preview`, com a API da T028;
  - `git diff main -- src/` mostra só as linhas de import;
  - bundle medido num worktree novo do commit da T031 (`git worktree add --detach C:\Telemetry\wt-002-fase2 <sha>`, `.env`, `npm ci`, `npm run build`, `bundleSizes.mjs`), removido com `git worktree remove` depois.
  - (FR-001, FR-003, FR-005, FR-009, FR-015, FR-019; D4; quickstart, partes 1 a 4 e 8; research, ponto 7)
- [X] T033 [MANUAL] [US1] Parar a API e apagar os três arquivos da rodada, como na T010 (`telemetry-run.db`, `telemetry-run.db-wal` e `telemetry-run.db-shm`, com `Test-Path C:\Telemetry\snapshots-002\telemetry-run.db*` dando `False`). **Entrega**: confirmação. (D8)
- [X] T034 [MANUAL] [PARADA] [US4] Aprovar o push 2. **Entrega**: aprovação explícita. (FR-006a; D5)
- [X] T035 [US4] Dar o push da branch. (FR-006a; D5)
- [X] T036 [US4] Esperar a CI com `gh run watch` e anotar o id, o SHA e o resultado dos quatro checks, como na T025, com a mesma regra para a CI vermelha. **A Phase 5 só começa depois desta tarefa, com a CI verde.** (FR-005, FR-006a; D5)

**Checkpoint**: produção sem vulnerabilidades conhecidas; Fases 1 e 2 válidas mesmo que a 3 seja adiada ou recuada (FR-006).

---

## Phase 5: Fase 3 do plano, Vite 8 (US2, P2; US3, P2) (D7)

**Goal**: `npm audit` em zero, com o build de produção equivalente ao de antes.

**Independent Test**: comparação do bundle e das capturas contra a referência da Phase 1 (quickstart, partes 4 a 6).

- [X] T037 [US4] Registrar no `research.md` o corte da Fase 3 e os resultados da Fase 2 (T031, T032 e a execução da T036). Commitar `docs: record the phase 2 CI run for spec 002`. (FR-003, FR-006a; D5, D11)
- [ ] T038 [MANUAL] [PARADA] [US2] (se nenhuma `vite` 8.x, ou nenhum par `vite`/`@vitejs/plugin-react-swc` compatível, existir antes do corte da Fase 3) Mesmo registro e mesma decisão da T021. **Entrega**: a decisão. (FR-002; D7, D11)
- [ ] T039 [US2] Rodar `npm install -D vite@^8 @vitejs/plugin-react-swc@^4 --before=<corte da Fase 3>`:
  - conferir que o peer do plugin resolvido aceita `vite` 8 e que o `engines` do Vite resolvido é atendido pelo Node ≥ 22.17 do `package.json`, do `.nvmrc` e da CI;
  - conferir que a tabela de breaking changes do research, ponto 2, continua valendo, sem mudança de configuração;
  - se o build só passar mudando código da aplicação, não commitar e ir para T048;
  - com o Vite 8 já instalado e antes do commit, medir o endereço de escuta com `evidence/tools/devListen.mjs` (quickstart, parte 5); se mudar, a limitação conhecida muda no `CLAUDE.md` e no `README.md` neste commit;
  - no `CLAUDE.md` Stack, "Vite 5.4" vira "Vite 8".
  - Commitar `package.json`, `package-lock.json`, o `CLAUDE.md` e, se a escuta mudou, o `README.md` como `fix: upgrade to Vite 8 and @vitejs/plugin-react-swc 4`.
  - (FR-010, FR-011, FR-013, FR-013a, FR-022; D6, D7, D11)
- [ ] T040 [US2] Trocar o plugin pela opção nativa (T3):
  - tirar `vite-tsconfig-paths` do `package.json` (`npm uninstall vite-tsconfig-paths`) e do `vite.config.ts`, e pôr `resolve: { tsconfigPaths: true }`;
  - em `tsconfig.app.json`, o comentário "resolvidos em runtime pelo plugin vite-tsconfig-paths" passa a citar o `resolve.tsconfigPaths` do Vite, em português;
  - conferir que o aviso `The plugin "vite-tsconfig-paths" is detected` sumiu do `build`.
  - Commitar `package.json`, `package-lock.json`, `vite.config.ts` e `tsconfig.app.json` como `chore: resolve tsconfig paths with Vite instead of a plugin`.
  - (FR-020; D6, D7, T3)
- [ ] T041 [US3] Medir o "depois" e anotar:
  - os quatro scripts passam;
  - `npm audit` e `npm audit --omit=dev` dão 0, com a data;
  - bundle medido num worktree novo do commit da T040 (`git worktree add --detach C:\Telemetry\wt-002-fase3 <sha>`, `.env`, `npm ci`, `npm run build`, `bundleSizes.mjs`), removido com `git worktree remove` depois, e comparado por papel com a medição do worktree da `main` (223.869 B); variação do total acima de 10% ganha explicação;
  - navegadores-alvo pelo padrão do Vite 8, conferidos na ajuda da CLI;
  - o endereço de escuta já medido na T039 vai para as notas;
  - `npm run dev` (porta 5173) e `http://localhost:5173` carrega o app, como na T006.
  - (FR-001, FR-002, FR-003, FR-012, FR-015; US2 cenário 3; D7; quickstart, partes 1, 2 e 4)
- [ ] T042 [MANUAL] [PARADA] [US3] Rodada "depois" da API, pelo procedimento completo do D8 (terceira rodada), com os mesmos passos da T008:
  - `Test-Path C:\Telemetry\snapshots-002\telemetry-run.db*` dando `False` e, só então, copiar a mestra para um `telemetry-run.db` novo;
  - `DOTENV_CONFIG_PATH` e `DB_PATH` apontando para o `api-conferencia.env` e o `telemetry-run.db`;
  - conferência sem custo; só com `false`, subir a API e conferir o log;
  - o replay não começa aqui: começa na T043, quando a sessão do front avisar.
  - **Entrega**: o `false` da conferência, a confirmação do log e de que as portas batem com o `.env` do front. Sem o `false`, esta sessão não segue.
  - (FR-016a, FR-016c; D8)
- [ ] T043 [US3] [PARADA] Com a API da T042 e sem replay: `npm run build`, `npm run preview` e o roteiro da parte 3 do quickstart; depois **avisar "inicie o replay"** e esperar a mantenedora iniciar `npm run replay -- recordings/demo-interlagos-tt-20hz-laps6-8.jsonl` (1x) e confirmar (**Entrega**: a confirmação); só então rodar `captureStates.mjs` com `NN = depois` (estado 5 com 503). (FR-009, FR-016, FR-016b, FR-016c; D7, D8)
- [ ] T044 [MANUAL] [US3] Parar o replay e a API e apagar os três arquivos da rodada, como na T010. **Entrega**: confirmação. (D8)
- [ ] T045 [US3] Revisar as capturas do "depois" como na T011, somando ao total do "antes". (D7, D1)
- [ ] T046 [MANUAL] [PARADA] [US3] (se T045 tiver achado) Mesma decisão da T012. **Entrega**: a decisão. (D7, D1)
- [ ] T047 [US3] Comparar as capturas estado por estado e anotar no `research.md`: layout, cores, tipografia, eixos, legendas e traçado dos gráficos SVG, mapa da pista, painel do coach e estilos dos CSS Modules, sem os valores ao vivo. Toda diferença tem explicação. Se alguma correção exigir mudar código da aplicação (`src/`, `index.html` ou CSS), não mudar e ir para T048. (FR-016, FR-019; D7; quickstart, parte 6)
- [ ] T048 [MANUAL] [PARADA] [US3] (se a regra de recuo disparar no build da T039 ou na comparação da T047) A sessão apresenta o que exigiria mudar código da aplicação. **Entrega**: a confirmação do recuo para o Vite 7.3, ou outra decisão. (FR-010; D7)
- [ ] T049 [US3] (se T048 confirmar o recuo) Rodar `npm install -D vite@~7.3 @vitejs/plugin-react-swc@^4 --before=<corte da Fase 3>`, com o plugin cujo peer aceita `vite` 7 e a regra do D11. No `CLAUDE.md` Stack, "Vite 8" (ou "Vite 5.4", se o Vite 8 não chegou a ser commitado) vira "Vite 7.3". Antes do commit, medir o endereço de escuta como na T039, com a mesma regra para o `CLAUDE.md` e o `README.md`. Registrar o motivo no `research.md`. Commitar como `fix: use Vite 7.3 instead of Vite 8`, sem reescrever histórico. Refazer T041 a T047 com `NN = depois-vite73`, registrando as vulnerabilidades restantes do Vite 7.3, se houver, com justificativa. (FR-002, FR-006, FR-010, FR-013a; D6, D7, D11)

**Checkpoint**: `npm audit` em zero (ou cada restante registrado); bundle e capturas comparados.

---

## Phase 6: Vigilância contínua e fechamento (US5, P3) (D9, D10)

**Goal**: avisos novos chegam pelo Dependabot, sem gate na CI; PR pronto para merge.

**Independent Test**: `ci.yml` igual ao da `main`; a documentação cita o Dependabot só depois do 204.

- [ ] T050 [MANUAL] [US5] Ligar os alertas do Dependabot em Settings → Advanced Security → Dependabot alerts, em qualquer momento antes da T053. **Entrega**: aviso de que ligou. (FR-018; D9)
- [ ] T051 [P] [US5] Conferir com `gh api repos/AnaLauraFFerraz/Telemetry-F1/vulnerability-alerts -i` e anotar a primeira linha: 204 ligado, 404 desligado. Com 404, a T050 fica aberta e a documentação não cita o Dependabot (a frase de que não há gate de `npm audit` entra assim mesmo, na T053). (FR-018; D9; quickstart, parte 7)
- [ ] T052 [P] Conferir e anotar, sem alterar arquivos: `git diff main -- .github/workflows/ci.yml` vazio; `git diff main --stat -- src/types/` e `-- 'src/**/*.test.ts'` vazios; `git diff main -- package.json` com só as dependências trocadas, sem nenhuma nova. (FR-017, FR-019, FR-020; D9; quickstart, partes 7 e 8)
- [ ] T053 Rodar o `/speckit-converge` (D10) e só depois mudar o Status da spec. Registrar no `research.md` a evidência da Fase 3: auditoria final, restantes com justificativa, exposição e condição (se houver), bundle, navegadores-alvo, escuta, comparação visual e as conferências da T051 e T052. Acrescentar ao `README.md` (seção de CI) e ao `CLAUDE.md` (Rules), em qualquer caso, que não há gate de `npm audit` na CI; só com o 204 da T051, acrescentar nos dois que avisos novos chegam pelos alertas do Dependabot. Marcar as tarefas feitas neste arquivo (até a T053). Commitar `docs: record the phase 3 evidence for spec 002`. (FR-002, FR-003, FR-012, FR-015, FR-016, FR-018; D9, D10)
- [ ] T054 [MANUAL] [PARADA] Aprovar o push 3 e a atualização da descrição do PR com o registro da CI. **Entrega**: aprovação explícita. (FR-006a; D5)
- [ ] T055 Dar o push da branch. (FR-006a; D5)
- [ ] T056 Esperar a CI com `gh run watch` e registrar o id, o SHA e o resultado dos quatro checks na descrição do PR (`gh pr edit`). O `research.md` já aponta para lá. CI vermelha segue a regra da T025; o registro do re-run ou da correção vai na descrição do PR. (FR-005, FR-006a; D5)
- [ ] T056a [MANUAL] [PARADA] Com a CI final verde (T056), mostrar à mantenedora a **descrição final do PR** (`gh pr view 8 --json body`) e, com a aprovação dela, tirar o PR do rascunho com `gh pr ready 8`. **Entrega**: aprovação para tirar do rascunho. O PR é rascunho desde a T024 (um rascunho não pode ser mergeado), então o merge só fica possível depois desta tarefa. (D5, D10)
- [ ] T057 [MANUAL] [PARADA] Fazer o merge com Rebase and merge, depois de ler o Files changed, com o PR fora do rascunho, verde e a branch atualizada. **Entrega**: aviso do merge. (D10)
- [ ] T058 [MANUAL] Depois do merge, apagar a cópia mestra `C:\Telemetry\snapshots-002\telemetry-master.db`. **Entrega**: confirmação. (FR-016a; D8, D10)
- [ ] T058a [MANUAL] Depois do merge, apagar a pasta `C:\Telemetry\playwright-002\` (o Playwright e o Chromium dele, cerca de 720 MB). **Entrega**: confirmação. (FR-016c; T4, D1, D10)
- [ ] T059 Depois da T057 e da T058, como na spec 001: `git switch main`, `git pull` e uma branch nova a partir da `main` atualizada. O ruleset bloqueia push direto na `main`, então este registro vai num **PR próprio**. Registrar o merge (número do PR e SHA na `main`) no `research.md` e marcar T054 a T058 neste arquivo. Rodar os quatro checks e commitar `docs: record the PR merge for spec 002`. (FR-006a; D10)
- [ ] T060 [MANUAL] [PARADA] Aprovar o push da branch da T059 e a abertura do PR dela. **Entrega**: aprovação explícita. (D5, D10)
- [ ] T061 Dar o push, abrir o PR com `gh pr create` e esperar a CI com `gh run watch`, com a regra da T025 para a CI vermelha. (FR-005; D5, D10)
- [ ] T062 [MANUAL] [PARADA] Fazer o merge do PR da T061 com Rebase and merge. **Entrega**: aviso do merge. (D10)

---

## Dependencies & Execution Order

- **Phase 1** (antes na `main`) bloqueia tudo: nenhuma dependência muda antes da T013.
- **Phase 2** depende da Phase 1. A T016 é o primeiro commit da implementação; a T017, o segundo.
- **Phase 3** depende da Phase 2. **Phase 4** depende da T025; **Phase 5**, da T036. Cada push espera a CI anterior terminar, porque o `ci.yml` cancela a execução em andamento do PR (D5).
- **Phase 6**: a T050 pode acontecer a qualquer momento antes da T053; o resto depende da Phase 5. A T059 depende do merge (T057) e da T058, e vai num PR próprio porque o ruleset bloqueia push direto na `main`.
- Dentro de cada fase de dependências, as tarefas são sequenciais: todas tocam `package.json`, `package-lock.json` ou `research.md`.
- **API**: nenhuma tarefa usa a API antes do `false` da rodada. T009 depende da T008; T029 e T032, da T028; T043, da T042. Cada rodada termina (T010, T033, T044) antes do push seguinte.

### Pontos de parada

| Tarefa | A sessão espera |
|---|---|
| T003 | aprovação da instalação do Playwright |
| T007 | cópia mestra, `.env` de conferência, sessão e voltas |
| T008, T028, T042 | o `false` da conferência e a API no ar |
| T009, T043 | o aviso "inicie o replay" e a confirmação de que ele começou, antes das capturas |
| T012, T046 | (se houver achado) decisão sobre as imagens |
| T015 | aprovação da versão e do texto da emenda |
| T021, T030, T038 | (se não houver versão antes do corte) decisão do D11 |
| T023, T034, T054, T060 | aprovação de cada push (e, na T023 e na T060, da abertura do PR) |
| T025, T036, T056, T061 | (se a CI falhar por código) aprovação do push próprio da correção |
| T048 | (se a regra disparar) confirmação do recuo para o Vite 7.3 |
| T056a | aprovação para tirar o PR do rascunho, depois de ver a descrição final |
| T057, T062 | o merge do PR da feature e o do PR de registro |

### Parallel Opportunities

- T005 e T006: a T005 escreve um arquivo em `evidence/tools/`; a T006 não escreve nada no repositório.
- T051 e T052: só leitura; o registro é feito na T053.

```text
Task: "Escrever captureStates.mjs em specs/002-npm-audit-triage/evidence/tools/"
Task: "Conferir que o app carrega em http://localhost:5173 no worktree da main"
```

---

## Cobertura dos requisitos

| FR | Tarefas |
|---|---|
| FR-001 | T032, T041 |
| FR-002 | T002, T021, T030, T038, T041, T049, T053 |
| FR-003 | T002, T017, T022, T026, T032, T037, T041, T053 |
| FR-004 | T019 e a ordem das Phases 3 a 5 |
| FR-005 | T001, T022, T025, T032, T036, T056, T061 |
| FR-006 | Phases 3 a 5 separadas; T049 sem reverter fases |
| FR-006a | T023–T026, T034–T037, T054–T056, T059 |
| FR-007 | T027 |
| FR-008 | T029, T031 |
| FR-009 | T009, T029, T032, T043 |
| FR-010 | T039, T048, T049 |
| FR-011 | T039 |
| FR-012 | T002, T017, T041, T053 |
| FR-013 | T039 |
| FR-013a | T001, T002, T017, T039, T049 |
| FR-014 | T020 |
| FR-015 | T001, T002, T017, T041, T053 |
| FR-016 | T009, T043, T047, T053 |
| FR-016a | T007, T008, T010, T028, T042, T058 |
| FR-016b | T005, T009, T017, T043 |
| FR-016c | T004, T005, T008, T009, T042, T043 |
| FR-017 | T052 |
| FR-018 | T050, T051, T053 |
| FR-019 | T032, T047, T052 |
| FR-020 | T040, T052 |
| FR-021 | T014, T015, T016, T023 |
| FR-022 | T031, T039, T049 |

---

## Implementation Strategy

1. Phases 1 e 2: referência e emenda, sem tocar dependências.
2. Phase 3 (Fase 1 do plano): push 1 com o PR, CI registrada.
3. Phase 4 (Fase 2, MVP): produção sem vulnerabilidades. Se a Fase 3 precisar parar, a feature já entrega o pré-requisito da demo para o navegador.
4. Phase 5 (Fase 3): Vite 8, ou Vite 7.3 pela regra de recuo.
5. Phase 6: Dependabot, converge, push 3 e merge pela mantenedora; depois, o registro do merge num PR próprio.
