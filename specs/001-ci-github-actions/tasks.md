---

description: "Tarefas da spec 001: CI do front no GitHub Actions"
---

# Tasks: CI do front no GitHub Actions

**Input**: documentos de `specs/001-ci-github-actions/`

**Prerequisites**: [plan.md](plan.md), [spec.md](spec.md), [research.md](research.md), [quickstart.md](quickstart.md). Não há `data-model.md` nem `contracts/` (plan.md, "Artefatos que não se aplicam").

**Tests**: pedidos. O teste da função pura da guarda é escrito antes dela e roda primeiro contra um esboço com resultados errados, com cada teste falhando na própria asserção (T014).

**Organization**: as fases seguem a ordem de trabalho do plan.md, que é a ordem de dependência: a CI (US1) precisa dos scripts (US3, US2) já existirem. A prioridade da spec aparece no título de cada fase.

## Convenções deste arquivo

- **[P]**: pode rodar em paralelo (arquivos diferentes, sem dependência pendente).
- **[USn]**: user story da spec.
- **[MANUAL - Ana]**: feito pela dona do repositório, Ana: configuração no GitHub e tentativas de merge. O agente prepara e registra, mas não executa.
- **[PARADA]**: o agente para e espera aprovação explícita antes de push, abertura de PR, exclusão de branch remota ou merge. O merge é sempre da Ana.
- **Commits**:
  - Conventional Commits, atômicos, em inglês, **sem trailer `Co-Authored-By`** e sem rodapé "Generated with" (vale também para os PRs);
  - antes de cada commit rodam `npm test`, `npm run lint`, `npm run build` e, depois de T007, `npm run typecheck`; falha é reportada, nunca contornada;
  - README e `CLAUDE.md` mudam no mesmo commit que torna falsas as afirmações antigas (plan.md D11), sem números que desatualizam; conteúdo novo de documentação vai num `docs:` próprio.
- Toda evidência vai para a seção "Post-implementation evidence" de `specs/001-ci-github-actions/research.md`, com comando e saída.
- Edições de texto só com as ferramentas Edit/Write, nunca com comandos de shell.

---

## Phase 1: Setup

**Purpose**: confirmar o ponto de partida.

- [X] T001 Conferir o ponto de partida, sem alterar arquivos:
  - branch `001-ci-github-actions` com working tree limpo (`git status --short` vazio);
  - `node -v` em 22.x;
  - `npm test`, `npm run lint` e `npm run build` passando na raiz, com `package.json` intacto.
  - Se algo falhar, parar e reportar. (pré-condição de FR-013)

---

## Phase 2: Foundational — versão do Node (bloqueia US1, US2, US3)

**Purpose**: uma única fonte da versão do Node, lida pelo fnm e pela CI. A CI (T024) e o mínimo exigido pela guarda (T016) dependem dela.

- [X] T002 [P] Criar `.nvmrc` na raiz com uma única linha, `22`. Não criar `.node-version`. (FR-014; clarificação a)
- [X] T003 [P] Em `package.json`, acrescentar `"engines": { "node": ">=22.17" }`, sem `.npmrc` e sem `engine-strict`. (FR-015; T2-A)
- [X] T004 No mesmo commit de T002–T003, corrigir as afirmações que ficaram falsas:
  - `README.md`, linha "Requirements: Node.js ≥ 22.6", passa a "Node.js ≥ 22.17 (major pinned in `.nvmrc`)";
  - `CLAUDE.md` Stack, "(Node ≥ 22.6)", passa a "(Node ≥ 22.17)";
  - na nota do fnm do `CLAUDE.md`, acrescentar que a versão vem do `.nvmrc`.
  - (FR-014, FR-015; plan.md D11)
- [X] T005 Verificar e commitar `chore: pin Node 22 in .nvmrc and require >=22.17` (T002–T004). (FR-014, FR-015)
- [X] T006 [MANUAL - Ana] No próprio terminal, na raiz do repositório, `fnm use` deve resolver para uma v22.x. O agente não roda `fnm use`, porque troca o Node da sessão. O resultado informado pela Ana vai para o research.md em T018. (US3 cenário 3; SC-008)

**Checkpoint**: `.nvmrc` e `engines` no lugar.

---

## Phase 3: User Story 3 — os mesmos comandos da CI rodam localmente (Priority: P2)

**Goal**: um script `typecheck` que roda localmente exatamente o que o check `typecheck` vai rodar.

**Independent Test**: num checkout limpo, `npm run typecheck` sai com 0 sem gerar bundle e sem sujar o `git status`; com um erro de tipos injetado, sai com 2.

- [X] T007 [US3] Em `package.json`, acrescentar `"typecheck": "tsc -b"` em `scripts`. (FR-005, FR-009; plan.md D9)
- [X] T008 [US3] No mesmo commit:
  - `README.md` "Scripts and tests" ganha `npm run typecheck  # type-check only (src/ and vite.config.ts), no bundle`;
  - `CLAUDE.md` Commands ganha a mesma linha.
  - (FR-009; plan.md D11)
- [X] T009 [US3] Verificar e commitar `chore: add typecheck script`:
  - `npm run typecheck` sai com 0;
  - `git status --short` continua vazio (só `*.tsbuildinfo` ignorados, nada em `src/`, sem `dist/`);
  - com um erro de tipos injetado e revertido em `src/utils/formatDate.ts`, medir o código de saída de `npm run typecheck` (não só do `tsc -b`); esperado ≠ 0, e o valor medido é registrado;
  - guardar as saídas para T018.
  - (FR-009; SC-008)

**Checkpoint**: `npm run typecheck` existe e funciona.

---

## Phase 4: User Story 2 — qualquer teste novo em src/ roda automaticamente (Priority: P1)

**Goal**: descoberta automática de `src/**/*.test.ts`, igual no cmd e no sh, e falha quando a descoberta é vazia.

**Independent Test**: um `*.test.ts` com asserção falsa numa pasta nova de `src/` faz o `npm test` falhar sem editar script; com o padrão apontado para uma pasta vazia, `npm test` sai com código diferente de zero e a mensagem da guarda.

### Descoberta por glob

- [ ] T010 [US2] Em `package.json`, trocar o script `test` por `node --experimental-strip-types --test \"src/**/*.test.ts\"`, com **aspas duplas escapadas**, nunca simples (research ponto 1a). A flag fica (T1-A). (FR-010, FR-011)
- [ ] T011 [US2] No mesmo commit:
  - `README.md` "Scripts and tests": trocar `npm test  # 16 tests, Node's built-in runner ...` por um comentário sem contagem, por exemplo `# Node's built-in runner with --experimental-strip-types; finds every src/**/*.test.ts`;
  - `CLAUDE.md` Commands: trocar `<files listed in package.json>` pelo glob;
  - `CLAUDE.md` Conventions: trocar "Every new test file must be added by hand to the `test` script" por "Any `*.test.ts` under `src/` is discovered automatically";
  - **emenda parcial da constituição** (plan.md D12), com o `/speckit-constitution`:
    - só a regra "each test file is listed in the `test` script" de `.specify/memory/constitution.md` muda, para a descoberta automática de `src/**/*.test.ts`;
    - a versão é proposta pela regra de versionamento da própria constituição, com o motivo da escolha;
    - o Sync Impact Report **não** fica no arquivo: vai no corpo do commit da emenda e na descrição do PR da feature, porque a constituição descreve as regras atuais e o histórico da mudança fica no git;
    - **mostrar a proposta à Ana e aplicar só depois do ok dela**;
    - o resto da emenda (CI como portão de merge, `typecheck` nos gates, Node 22.17, tipo `ci:`) não entra aqui.
  - (FR-010, FR-021; plan.md D11, D12)
- [ ] T012 [US2] Verificar e commitar `test: discover test files with a quoted glob`, com o script, o README, o `CLAUDE.md` e a constituição no mesmo commit:
  - `npm test` dá o mesmo total e os mesmos nomes de teste de antes (T001);
  - `npm run -s test` (cmd) e `npm run -s --script-shell="<Git>\usr\bin\sh.exe" test` (sh) dão nomes de teste idênticos, comparados com `diff` dos nomes ordenados;
  - guardar as saídas para T018.
  - (FR-011, FR-013; SC-004)

### Guarda de descoberta vazia (teste primeiro)

- [ ] T013 [US2] Criar `src/tooling/testDiscovery.test.ts` (nomes de teste em pt-BR, `node:test` e `node:assert/strict`), importando de `../../tools/testDiscovery.ts`, com caminho relativo e `.ts`. Casos:
  - `TEST_PATTERN` é `src/**/*.test.ts`;
  - `checkDiscovery([])` devolve `exitCode` 1 e uma mensagem com `nenhum arquivo de teste encontrado em src/**/*.test.ts`;
  - `checkDiscovery(["src/a.test.ts", "src/b/c.test.ts"])` devolve `exitCode` 0 e uma mensagem com a contagem 2;
  - `filterTestFiles(["src/a/b.test.ts", "src/node_modules/x/a.test.ts"])` devolve `["src/a/b.test.ts"]` (separador `/`);
  - `filterTestFiles(["src\\a\\b.test.ts", "src\\node_modules\\x\\a.test.ts"])` devolve `["src\\a\\b.test.ts"]` (separador `\`);
  - `filterTestFiles(["src/node_modules_old/a.test.ts", "src/x/node_modules/a.test.ts"])` devolve `["src/node_modules_old/a.test.ts"]` (nome parecido é mantido).
  - Cada caso de `filterTestFiles` mistura um caminho mantido e um descartado, para que nem a lista sem filtrar nem a lista vazia passem.
  - (FR-012; plan.md D10; constituição: testes cobrem funções puras)
- [ ] T014 [US2] Criar um **esboço** de `tools/testDiscovery.ts` que exporta os três nomes com resultados errados:
  - `TEST_PATTERN = ""`;
  - `filterTestFiles` devolve a lista recebida, sem filtrar;
  - `checkDiscovery` devolve `{ exitCode: -1, message: "" }`.
  - Rodar `npm test`. Cada teste de T013 tem de falhar **na própria asserção** (`ERR_ASSERTION`, com a localização apontando a asserção daquele teste), nenhum por `ERR_MODULE_NOT_FOUND` nem por outro erro de carga, e os demais testes do repositório passam.
  - Teste que passa com o esboço está fraco: reescrevê-lo em T013 e repetir.
  - **Mostrar a saída à Ana** e seguir para T015 só depois do ok dela. Guardar a saída para T018. Não commitar o esboço.
  - (FR-012)
- [ ] T015 [US2] Substituir o esboço pela implementação de `tools/testDiscovery.ts` (puro, sem I/O):
  - `export const TEST_PATTERN = "src/**/*.test.ts"`, com um comentário curto em pt-BR dizendo que precisa ser igual ao glob do script `test`;
  - `filterTestFiles(paths: string[]): string[]`, que descarta todo caminho com um segmento exatamente igual a `node_modules`, separando por `/` e `\`;
  - `checkDiscovery(files: string[]): { exitCode: number; message: string }`.
  - Rodar `npm test`: os testes de T013 passam. (FR-012)
- [ ] T016 [US2] Criar a guarda e ligá-la ao `npm test`:
  - `tools/assertTestFiles.ts` (casca de I/O): `fs.globSync(TEST_PATTERN)` sem a opção `exclude`, depois `filterTestFiles`, depois `checkDiscovery`; escreve `[assertTestFiles] <message>` no stderr se `exitCode` ≠ 0, senão no stdout, e sai com o `exitCode`;
  - em `package.json`, `"pretest": "node --experimental-strip-types tools/assertTestFiles.ts"`;
  - em `tsconfig.node.json`, `"include": ["vite.config.ts", "tools"]`.
  - (FR-012, FR-015; plan.md D9, D10)
- [ ] T017 [US2] No mesmo commit de T013–T016:
  - `README.md` "Scripts and tests": uma frase dizendo que `npm test` roda antes uma guarda que falha quando nenhum arquivo de teste é encontrado, porque `node --test` sai com 0 num glob vazio;
  - comentário do `typecheck` no README e no `CLAUDE.md`: passa a "src/, tools/ and vite.config.ts";
  - `CLAUDE.md` Commands: `npm test` roda antes a guarda;
  - `CLAUDE.md` Architecture: uma linha para `tools/` ("test-discovery guard run by `pretest`").
  - Verificar e commitar `test: fail npm test when no test file is found`.
  - (FR-012, FR-022; plan.md D11)
- [ ] T018 [US2] Verificação final no Windows, com o resultado registrado em `research.md`, "Post-implementation evidence → Windows (local)":
  - saídas guardadas de T009, T012 e T014;
  - `npm test` imprime `[assertTestFiles] N arquivos de teste encontrados ...` e passa;
  - um `src/tmpcheck/probe.test.ts` temporário com asserção falsa é executado e reprova, sem editar script (removido depois);
  - um `src/tmpcheck/syntax.test.ts` temporário com erro de sintaxe reprova o script, em vez de ser ignorado (removido depois);
  - com `TEST_PATTERN` temporariamente apontado para `nada/**/*.test.ts`, `npm test` sai ≠ 0 com a mensagem da guarda e nenhum teste roda (revertido);
  - um erro de tipos injetado em `tools/assertTestFiles.ts` dá exit 2 no `npm run typecheck` (revertido);
  - lista ordenada dos arquivos de teste executados (para o SC-004);
  - resultado do `fnm use` informado pela Ana em T006.
  - Commitar `docs: record local Windows evidence for spec 001`.
  - (SC-003, SC-004, SC-008; US2 cenários 1–4; US3 cenários 1, 3; edge case do erro de sintaxe)

**Checkpoint**: descoberta automática e guarda funcionando localmente; os quatro scripts existem.

---

## Phase 5: User Story 1 — cada PR e cada push na main são verificados (Priority: P1) 🎯 MVP

**Goal**: o workflow com quatro checks independentes rodando no PR desta feature.

**Independent Test**: no PR, os quatro checks `typecheck`, `lint`, `test` e `build` aparecem com resultado próprio e terminam verdes.

- [ ] T019 [US1] Criar `.github/workflows/ci.yml` conforme plan.md D1–D7:
  - `name: CI`;
  - `on.pull_request.branches: [main]` e `on.push.branches: [main]`, sem `paths`, `paths-ignore` ou `workflow_dispatch`;
  - `permissions: contents: read` no topo;
  - o bloco `concurrency` do D6, literalmente;
  - quatro jobs com id e `name:` iguais (`typecheck`, `lint`, `test` e `build`), cada um com `runs-on: ubuntu-24.04`, `timeout-minutes: 10`, sem `needs`, `if`, `continue-on-error`, `env` ou matriz;
  - passos de cada job: `actions/checkout@v7` com `persist-credentials: false`; `actions/setup-node@v7` com `node-version-file: .nvmrc` e `cache: npm`; `npm ci`; e o script do job (`npm run typecheck`, `npm run lint`, `npm test` ou `npm run build`);
  - nenhuma action de terceiros.
  - (FR-001–FR-008, FR-016, FR-023–FR-025; SC-001, SC-002, SC-007)
- [ ] T020 [US1] Revisar `ci.yml` contra a lista de T019, item por item. Rodar os quatro scripts localmente e commitar `chore: add CI workflow with typecheck, lint, test and build jobs`. (FR-005)
- [ ] T021 [US1] **[PARADA]** Push da branch: `git push -u origin 001-ci-github-actions`. (FR-001)
- [ ] T022 [US1] **[PARADA]** Abrir o PR para a `main` com `gh pr create`:
  - título `CI with GitHub Actions (spec 001)`;
  - corpo resumindo a spec, sem rodapé "Generated with";
  - o corpo registra a emenda parcial da constituição (T011), o motivo, como a Governança pede, e o Sync Impact Report.
  - Anotar o número do PR. (FR-001; SC-001)
- [ ] T023 [US1] Primeiro run no Linux, registrado em `research.md`, "Linux (CI, first run)":
  - id do run e Node resolvido no runner;
  - resultado e duração de cada um dos quatro jobs;
  - comparação com o teto de 5 minutos (SC-005); acima dele, investigar e registrar causa e ação. A referência é a primeira execução verde depois de qualquer correção de T025: se este run falhar, a medição de referência é refeita no primeiro run verde;
  - contagem da guarda no log do `test`;
  - nomes dos testes, comparados com a lista do Windows de T018 (mesmos nomes, mesmo total; SC-004);
  - cache: *miss* e quem salvou a chave (a disputa `Unable to reserve cache` entre jobs é esperada, plan.md D1).
  - Usar `gh run view`/`gh run view --log`.
  - (FR-001, FR-003, FR-004, FR-024, FR-025; SC-001, SC-004, SC-005)
- [ ] T024 [US1] Re-run do mesmo run, com `gh run rerun <id>` e o `package-lock.json` inalterado. Registrar em `research.md`, "Linux (CI, re-run)": *hit* de cache (`Cache restored successfully`), resultado e duração dos quatro jobs. (FR-025; US3 cenário 5)
- [ ] T025 [US1] Se algum job falhar só no Linux:
  - registrar causa e correção no `research.md`;
  - corrigir num commit próprio, sem pular check;
  - **[PARADA]** antes do push da correção.
  - Se nada falhar, registrar "nenhuma falha só no Linux".
  - (FR-024; edge case "runner Linux ainda não testado")
- [ ] T026 [US1] Commitar a evidência de T023–T025 como `docs: record the first Linux CI run for spec 001`. **[PARADA]** Push. (SC-005)

**Checkpoint**: MVP. Os quatro checks rodam e aparecem no PR.

---

## Phase 6: User Stories 4 (documentação) e 5 — proteção documentada e selo (Priority: P2/P3)

**Goal**: README com selo, seção de CI e proteção e a armadilha das aspas; `CLAUDE.md` com as regras e a nota de divergência.

**Independent Test**: lendo só o README, dá para configurar o ruleset, saber os nomes exatos dos checks e seguir o procedimento de último recurso; o README não tem nenhum número que desatualize.

- [ ] T027 [P] [US5] Em `README.md`, acrescentar logo abaixo do título o selo `[![CI](https://github.com/AnaLauraFFerraz/Telemetry-F1/actions/workflows/ci.yml/badge.svg?branch=main)](https://github.com/AnaLauraFFerraz/Telemetry-F1/actions/workflows/ci.yml)`. (FR-020, FR-021)
- [ ] T028 [P] [US4] Em `README.md`, nova seção "CI and branch protection", em inglês, com:
  - os quatro checks e os scripts que rodam;
  - o aviso de que um erro de tipos reprova `typecheck` e `build`;
  - a regra dos nomes como contrato (plan.md D2);
  - os passos do ruleset de plan.md D11 (critérios de FR-017), incluindo o botão **Create** e os ajustes nas configurações gerais;
  - o procedimento de último recurso por inteiro (FR-018).
  - Em "Known limitations", a armadilha das aspas: o glob do script `test` usa aspas duplas escapadas; com aspas simples, o cmd roda zero testes e sai com 0; a guarda não pega, porque confirma que existem arquivos e não que o runner os executou; a CI no Linux pega.
  - (FR-016–FR-019, FR-022; SC-006)
- [ ] T029 [P] [US4] Em `CLAUDE.md`:
  - "Known pitfalls": a mesma armadilha das aspas;
  - "Rules": os nomes dos checks e do `ci.yml` são contrato com o ruleset e o selo (D2), e actions de terceiros só por SHA completo com comentário de versão (D4);
  - nota de divergência temporária com a constituição até a emenda: Node ≥ 22.6 contra ≥ 22.17, e o `typecheck` e a CI fora dos gates da constituição. A lista manual de testes não entra, porque já foi emendada em T011.
  - A lista de tipos de commit não muda.
  - (FR-016, FR-022; plan.md D11)
- [ ] T030 [US4] Conferir:
  - nenhum número que desatualize no README (procurar contagens de testes, percentuais e durações);
  - nada descrito que não exista;
  - tudo que está nos Known pitfalls do `CLAUDE.md` também está nas Known limitations do README.
  - Commitar T027–T029 como `docs: document CI, branch protection and the quoted-glob pitfall`. (FR-021, FR-022)
- [ ] T031 [US4] **[PARADA]** Push. Confirmar os quatro checks verdes no último commit do PR. (SC-001)
- [ ] T032 [US4] **[MANUAL - Ana] [PARADA]** A Ana mergeia o PR com **Rebase and merge**, mesmo antes do ruleset, para manter a `main` linear. Depois:
  - o agente atualiza a `main` local (`git switch main && git pull --ff-only`);
  - registra para T047 o run do push na `main` (id, os quatro jobs, durações);
  - apaga a branch local `001-ci-github-actions`.
  - (FR-002; SC-001)
- [ ] T033 [US4] **[PARADA]** Apagar a branch remota `001-ci-github-actions` (`git push origin --delete 001-ci-github-actions`). A exclusão automática ainda não está ligada neste momento. (FR-019)

---

## Phase 7: User Story 4 — a main só aceita merge com a verificação aprovada (Priority: P2)

**Goal**: ruleset ativo e conferido, e cada gate demonstrado bloqueando o merge.

**Independent Test**: com o ruleset ativo, um PR com check reprovado não mergeia e um push direto na `main` é recusado.

### Proteção

- [ ] T034 [US4] **[MANUAL - Ana]** Criar o ruleset da `main` e ajustar os métodos de merge seguindo **só** o README:
  - Settings → Rules → Rulesets, com os quatro checks `typecheck`, `lint`, `test` e `build`, de origem GitHub Actions;
  - Settings → General: só "Allow rebase merging" e "Automatically delete head branches".
  - Anotar qualquer diferença entre o README e a interface; a correção vai no PR de T047.
  - (FR-017, FR-019; SC-006)
- [ ] T035 [US4] Conferir a configuração pela API do GitHub e registrar a saída em `research.md`, "Branch protection":
  - `gh api repos/AnaLauraFFerraz/Telemetry-F1/rulesets` e `.../rulesets/<id>`: `enforcement: active`, `bypass_actors: []`, `current_user_can_bypass: "never"`, alvo `~DEFAULT_BRANCH`;
  - `gh api repos/AnaLauraFFerraz/Telemetry-F1/rules/branches/main`: `deletion`, `non_fast_forward`, `required_linear_history`, `pull_request` com `required_approving_review_count: 0`, e `required_status_checks` com `strict_required_status_checks_policy: true` e os contextos `typecheck`, `lint`, `test` e `build`;
  - `gh repo view --json mergeCommitAllowed,squashMergeAllowed,rebaseMergeAllowed,deleteBranchOnMerge`: só rebase e exclusão automática ligada;
  - `gh secret list` e `gh variable list`: saída vazia esperada (SC-007).
  - As regras `non_fast_forward` e `deletion` conferidas aqui são a prova de push forçado e exclusão recusados (SC-006), sem tentativa: o GitHub nunca permite apagar a branch padrão, então uma exclusão recusada não provaria a regra, e um push forçado aceito por engano reescreveria histórico publicado.
  - Divergência: reportar à Ana antes de seguir.
  - (FR-017; SC-006, SC-007; US4 cenários 2 e 3)

### Demonstração: `lint`

- [ ] T036 [US4] Branch `demo/lint-failure` a partir de `origin/main` atualizada.
  - Em `src/utils/formatDate.ts`, trocar o tipo de um parâmetro de função usada por `any` explícito (regra `@typescript-eslint/no-explicit-any`).
  - Checagem local esperada: `npm run lint` falha; `typecheck`, `test` e `build` passam.
  - Commitar `chore: demo lint failure (do not merge)`.
  - (SC-002; US1 cenário 2)
- [ ] T037 [US4] **[PARADA]** Push da branch. **[PARADA]** Abrir o PR `Demo: lint failure (do not merge)`.
  - Logo depois de abrir, **com os checks ainda rodando**, registrar `gh pr view <n> --json mergeStateStatus,statusCheckRollup`: esperado `BLOCKED` com checks pendentes (US4 cenário 1, check pendente).
  - Ao fim do run, registrar o id do run e o resultado: só `lint` ✗, os outros três executados até o fim.
  - Abrir o selo com a branch da demonstração, `https://github.com/AnaLauraFFerraz/Telemetry-F1/actions/workflows/ci.yml/badge.svg?branch=demo/lint-failure`, e registrar o estado reprovado. Se o selo não refletir o run do PR, repetir com `&event=pull_request` e registrar qual URL funcionou (US5 cenário 2).
  - (FR-004, FR-020; SC-002)
- [ ] T038 [US4] **[MANUAL - Ana]** Tentar o merge e salvar o print em `specs/001-ci-github-actions/evidence/demo-lint-merge-blocked.png`. O print mostra:
  - o check reprovado na lista;
  - os quatro marcados **Required**;
  - o botão de merge desabilitado.
  - O agente registra `gh pr view <n> --json mergeStateStatus` (esperado `BLOCKED`). (SC-006)
- [ ] T039 [US4] Fechar o PR sem merge (`gh pr close <n>`). **[PARADA]** Apagar a branch remota, se a exclusão automática não a tiver apagado; apagar a local. (FR-019)

### Demonstração: `test`

- [ ] T040 [US4] Branch `demo/test-failure` a partir de `origin/main`.
  - Em `src/components/chart/chartMath.test.ts`, mudar o valor esperado de uma única asserção.
  - Checagem local esperada: só `npm test` falha, com um único `not ok`.
  - Commitar `chore: demo test failure (do not merge)`.
  - **[PARADA]** Push. **[PARADA]** Abrir o PR `Demo: test failure (do not merge)`. Registrar: só `test` ✗.
  - (SC-002, SC-003)
- [ ] T041 [US4] **[MANUAL - Ana]** Tentar o merge e salvar o print em `specs/001-ci-github-actions/evidence/demo-test-merge-blocked.png`. O agente registra o `mergeStateStatus`. Depois, fechar o PR sem merge; **[PARADA]** apagar a branch remota, se ainda existir, e apagar a local. (SC-006)

### Demonstração: `typecheck` (+ `build`)

- [ ] T042 [US4] Branch `demo/typecheck-failure` a partir de `origin/main`.
  - Em `src/pages/settings/useIsRecent.ts`, que nenhum teste carrega, introduzir um erro de tipos, por exemplo atribuir uma string a uma variável tipada como `number`.
  - Checagem local esperada: `typecheck` e `build` falham; `lint` e `test` passam.
  - Commitar `chore: demo type error (do not merge)`.
  - **[PARADA]** Push. **[PARADA]** Abrir o PR `Demo: type error (do not merge)`.
  - Registrar: `typecheck` ✗ **e** `build` ✗, comportamento esperado pela Q1 (o `build` mantém `tsc -b`). Por isso não existe demonstração só de `typecheck`.
  - (FR-023; SC-002; US1 cenário 3)
- [ ] T043 [US4] **[MANUAL - Ana]** Tentar o merge e salvar o print em `specs/001-ci-github-actions/evidence/demo-typecheck-merge-blocked.png`. O agente registra o `mergeStateStatus`. Fechar o PR sem merge; **[PARADA]** apagar a branch remota, se ainda existir, e apagar a local. (SC-006)

### Demonstração: `build` (caixa do CSS, T4-A)

- [ ] T044 [US4] Branch `demo/build-css-case` a partir de `origin/main`.
  - Em `src/components/chart/Chart.tsx`, trocar `import styles from "./Chart.module.css"` por `"./chart.module.css"`.
  - Checagem local esperada no Windows: **`typecheck`, `lint`, `test` e `build` passam todos**. É o objetivo da demonstração: o Windows aceita, só a CI no Linux deve reprovar (research ponto 4).
  - Commitar `chore: demo CSS import case mismatch (do not merge)`.
  - **[PARADA]** Push. **[PARADA]** Abrir o PR `Demo: CSS import case mismatch (do not merge)`.
  - Registrar: só `build` ✗, com a linha de erro do Vite no log.
  - Se o Linux **não** reprovar, registrar o achado e refazer a demonstração com um import de `./Missing.module.css` inexistente, no mesmo PR, com novo commit e **[PARADA]** antes do push.
  - (FR-024; SC-002; edge case de caixa no Linux)
- [ ] T045 [US4] **[MANUAL - Ana]** Tentar o merge e salvar o print em `specs/001-ci-github-actions/evidence/demo-build-merge-blocked.png`. O agente registra o `mergeStateStatus`. Fechar o PR sem merge; **[PARADA]** apagar a branch remota, se ainda existir, e apagar a local. (SC-006)

### Push direto

- [ ] T046 [US4] **[PARADA]** Push direto recusado:
  - de uma branch descartável `tmp/direct-push` criada a partir de `origin/main`, **sem tocar na `main` local**, criar um commit vazio com `git commit --allow-empty -m "chore: test direct push to main (must be rejected)"` e rodar `git push origin HEAD:main`;
  - esperado: exit 1 e `GH013 ... push declined due to repository rule violations`;
  - depois, `git ls-remote --heads origin` mostra a `main` no mesmo commit de antes;
  - apagar a branch local; ela nunca é enviada com o próprio nome;
  - registrar a saída completa em `research.md`.
  - **Contingência**: se o push for aceito, parar; registrar no `research.md`; corrigir o ruleset; avisar a Ana. O commit vazio fica na `main` como exceção documentada, sem reescrever histórico.
  - (US4 cenário 2; SC-006)

**Checkpoint**: proteção ativa, conferida pela API e demonstrada em cada gate isolável.

---

## Phase 8: Fechamento

**Purpose**: registrar a evidência, fechar a spec e conferir que nada ficou por fazer.

- [ ] T047 Branch `docs/001-evidence` a partir de `origin/main`, com:
  - `research.md` completo: run do push na `main` de T032; T035–T046 com ids de run, resultados, durações e `mergeStateStatus`; diferenças README × interface de T034;
  - os quatro prints em `specs/001-ci-github-actions/evidence/`;
  - correções do README vindas de T034, se houver;
  - uma linha no `research.md` dizendo que o registro do merge do PR de fechamento (T050) vai no PR da emenda da constituição;
  - as marcações `[x]` deste `tasks.md` até T047.
  - Commitar `docs: record CI evidence and close spec 001`.
  - (FR-018, FR-021; SC-001–SC-008)
- [ ] T048 Rodar `/speckit-converge` para a spec 001 na branch `docs/001-evidence`, **antes do push**, para que qualquer achado entre no mesmo PR:
  - reportar os achados à Ana, sem implementar nada sem aprovação;
  - o que ela aprovar entra nesta branch, em commits próprios, com as verificações de sempre antes de cada commit;
  - **depois do converge**, o Status da `spec.md` muda de `Draft` para `Implemented` (com a data do merge de T032), num commit `docs:` com a marcação `[x]` de T048.
  - (transversal: confere todos os FRs e SCs)
- [ ] T049 **[PARADA]** Push. **[PARADA]** Abrir o PR `docs: CI evidence for spec 001`. Confirmar os quatro checks verdes e `mergeStateStatus` `CLEAN`. (SC-001)
- [ ] T050 **[MANUAL - Ana] [PARADA]** A Ana mergeia com **Rebase and merge**. É o primeiro merge sob o ruleset e prova que um PR verde e atualizado entra. Depois:
  - o agente confere pela API `gh pr view <n> --json number,state,mergedAt`, além de `git rev-list --merges --count main` (esperado 0) e do run do push na `main`;
  - a branch remota é apagada pela exclusão automática; conferir com `git ls-remote --heads origin`;
  - **o registro deste merge permitido (número do PR e hora do merge, `mergedAt`, conferidos pela API), o run do push na `main` e as marcações `[x]` de T049–T050 vão no PR seguinte, o da emenda da constituição do front** (plan.md, fase 5), porque este PR não pode registrar o próprio merge.
  - (SC-006)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)** → **Phase 2 (Node)**: bloqueia tudo, porque a CI lê o `.nvmrc` e o mínimo 22.17 sustenta a guarda.
- **Phase 3 (US3, `typecheck`)** e **Phase 4 (US2, descoberta e guarda)** dependem da Phase 2. Podem ser feitas em qualquer ordem entre si, mas são commitadas uma depois da outra porque mexem nos mesmos `package.json`, README e `CLAUDE.md`.
- **Phase 5 (US1, workflow)** depende das Phases 3 e 4: cada job chama um script que precisa existir.
- **Phase 6 (docs)** depende da Phase 5, porque o README descreve o workflow e o selo aponta para o `ci.yml`. O merge (T032) fecha a feature na `main`.
- **Phase 7 (proteção)** depende do merge: o ruleset só é criado depois dele (clarificação d), e as demonstrações partem da `main` atualizada.
- **Phase 8 (fechamento)** depende da Phase 7. Dentro dela: T047 (evidência) → T048 (`/speckit-converge` e achados aprovados) → T049 (push e PR) → T050 (merge). O registro do merge de T050 depende do PR da emenda da constituição, fora desta feature.

### User Story Dependencies

- **US3 (P2)**: só da Phase 2.
- **US2 (P1)**: só da Phase 2. O teste da guarda (T013) vem antes da implementação (T015–T016).
- **US1 (P1)**: de US2 e US3.
- **US5 (P3)**: do nome do workflow (US1).
- **US4 (P2)**: documentação depois de US1; proteção e demonstrações depois do merge.

### Within Each Story

- Teste antes da implementação, falhando na própria asserção contra um esboço errado (T013 → T014 → T015).
- O código e as correções de documentação que ele torna necessárias vão no mesmo commit.
- Cada **[PARADA]** bloqueia a tarefa até a aprovação explícita.

### Parallel Opportunities

- T002 e T003 (arquivos diferentes, mesmo commit).
- T027, T028 e T029 (seções e arquivos diferentes, mesmo commit).
- As demonstrações (T036–T045) **não** são paralelas: cada uma parte da `main` e espera a ação manual da Ana.

---

## Parallel Example: Phase 6

```text
Task: "T027 Selo no topo do README.md"
Task: "T028 Seção 'CI and branch protection' e armadilha das aspas no README.md"
Task: "T029 Known pitfalls, Rules e nota de divergência no CLAUDE.md"
```

---

## Implementation Strategy

### MVP

Phases 1 a 5: os quatro checks rodando no PR. A partir daí todo PR é verificado, mesmo antes da proteção.

### Entrega incremental

1. Phases 2 a 4: os scripts, que já valem sozinhos na máquina local (US3, US2).
2. Phase 5: CI no PR (US1, MVP).
3. Phase 6: documentação, selo e merge (US4 doc, US5).
4. Phase 7: proteção e demonstrações (US4).
5. Phase 8: evidência, Status da spec, `/speckit-converge` e o PR de fechamento.

### Fora desta feature

O PR de emenda da constituição (plan.md, fase 5) não é tarefa daqui. A única parte da emenda feita nesta feature é a regra da lista manual de testes (T011, plan.md D12). O PR entra depois que a CI funcionar, com:
- a CI como portão de merge;
- o `typecheck` nos gates;
- o mínimo 22.17;
- o tipo de commit `ci:`;
- o esclarecimento de que "in separate commits", no fluxo SDD, quer dizer separados da implementação, já que commits de correção podem tocar mais de um artefato;
- o registro do merge do PR de fechamento (T050): número do PR e `mergedAt`, conferidos pela API, com as marcações `[x]` de T049–T050.

---

## Notes

- Total: 50 tarefas.
- Nenhum commit, PR ou push leva `Co-Authored-By` ou "Generated with".
- O `.specify/feature.json` nunca é commitado (é ignorado).
