# Research: CI do front no GitHub Actions

Cada seção responde a um ponto do pedido de planejamento, com evidência. Os comandos rodaram na máquina da mantenedora (Windows 11, Git Bash, Node v22.23.1 via fnm 1.39.0, npm 10.9.8) em 2026-10-20, numa pasta de rascunho ou num `git worktree` descartável fora do repositório, removido no fim. Nada no repositório foi alterado por esses experimentos. As versões 22.16.0, 22.17.0 e 22.18.0 foram instaladas num `FNM_DIR` isolado, no rascunho, sem tocar nas versões do fnm da máquina; a pasta foi apagada depois, e `fnm list` na pasta padrão continuou igual (v18.15.0, v18.20.8, v20.19.0, v20.20.2, v22.14.0 e v22.23.1 como padrão). Fatos externos citam a fonte. A spec 002 da API (`TelemetryF1_API/specs/002-github-actions-ci/research.md`) é citada como origem quando a medição de lá foi reaproveitada; cada uma foi reconfirmada aqui.

Os pontos marcados **Trade-off** foram decididos pela mantenedora em 2026-10-20 (T1-A, T2-A, T3-A com ajuste, T4-A). Cada decisão está registrada no ponto e no plan.md.

## 1. `--experimental-strip-types`, glob entre aspas, alias `@/` e a versão fixada (Q3, FR-026)

### 1a. O glob entre aspas encontra o mesmo conjunto no cmd e no sh?

**Árvore sintética** (rascunho): `src/root.test.ts`, `src/a/one.test.ts`, `src/a/b/deep.test.ts`, `src/c/two.test.ts`, `src/a/alias.test.ts`, `src/node_modules/x/nm.test.ts`, `node_modules/y/nm2.test.ts` e um `src/a/helper.ts` que não é teste. Cada teste tem o nome do próprio arquivo. Scripts npm rodados com o shell padrão do npm no Windows (cmd) e com `--script-shell` apontando para o `sh.exe` do Git (como no Linux):

```text
script                                                       cmd                          sh
node --experimental-strip-types --test "src/**/*.test.ts"    5 testes (os 5 de src/)      5 testes, mesmos nomes
node --test "src/**/*.test.ts"   (sem flag)                  5 testes                     5 testes, mesmos nomes
node --experimental-strip-types --test 'src/**/*.test.ts'    0 testes, exit 0  (!)        5 testes
node --experimental-strip-types --test src/**/*.test.ts      5 testes                     3 testes (sem root.test.ts e deep.test.ts)
```

- **Aspas duplas**: mesmo conjunto nos dois shells. `src/node_modules/` e `node_modules/` foram excluídos, e `helper.ts` não entrou.
- **Aspas simples**: o cmd não as reconhece como aspas. O padrão chega ao Node com os `'` literais, não casa com nada, e o run passa com `# tests 0`, exit 0. No `package.json` as aspas têm de ser **duplas, escapadas** (`\"src/**/*.test.ts\"`).
  - **A guarda do ponto 2 não pega esse caso**: ela confirma que existem arquivos de teste no disco, não que o runner os executou. Com aspas simples, a guarda encontra os arquivos e passa, e o runner local no Windows roda zero testes; um teste quebrado passaria em silêncio.
  - **Quem pega é a CI no Linux**: lá o sh trata aspas simples como aspas, o glob chega intacto ao Node (coluna "sh" acima, 5 testes) e os testes rodam de fato, então um teste quebrado reprova o check `test`.
  - **Atualização posterior (FR-012 ampliado, plan.md D9/D10):** a guarda passou a ler o script `test` e a reprovar quando o `TEST_PATTERN` não está entre aspas duplas, então o caso de aspas simples deixa de passar em silêncio localmente. O parágrafo acima descreve a guarda como era quando foi medido.
  - Registrado nos Known pitfalls do `CLAUDE.md` e nas Known limitations do README, no commit de documentação (plan.md D11).
- **Sem aspas**: o sh expande o glob antes do Node, sem globstar, e `**` vira `*`: dois arquivos somem. É a divergência que as aspas removem (mesmo achado da API, research.md ponto 2).

**Suíte real** (worktree descartável da branch `001-ci-github-actions`, após `npm ci`), script temporário `node --experimental-strip-types --test "src/**/*.test.ts"`:

```text
cmd: # tests 16 # pass 16 # fail 0    exit 0
sh:  # tests 16 # pass 16 # fail 0    exit 0
diff dos nomes de teste ordenados (cmd x sh): vazio
```

Os arquivos descobertos são os mesmos 4 que o script atual lista à mão:

```text
src/components/chart/chartMath.test.ts
src/components/chart/computeDelta.test.ts
src/components/coach/trackMapMath.test.ts
src/utils/coachInsights.test.ts
```

**Conclusão**: com aspas duplas, a descoberta é feita pelo próprio Node e dá o mesmo conjunto no cmd e no sh. A flag não interfere na descoberta.

### 1b. O alias `@/` só em `import type` continua funcionando?

```text
src/a/usesAlias.ts:  import type { Lap } from "@/types/rest";  (usado só em anotação)
src/a/alias.test.ts: importa ./usesAlias.ts e chama a função   -> ok, nas 3 versões testadas

import { Lap } from "@/types/rest";   (import de valor, sem "type")
  -> Error [ERR_MODULE_NOT_FOUND]: Cannot find package '@/types' imported from ...\src\valueAlias.ts

enum E { A }
  -> SyntaxError [ERR_UNSUPPORTED_TYPESCRIPT_SYNTAX]: TypeScript enum is not supported in strip-only mode
```

- `import type` é apagado por inteiro na remoção de tipos, então o especificador `@/` nunca chega ao resolvedor do Node. É o que os módulos testados fazem hoje (`src/utils/coachInsights.ts:1`, `src/components/chart/computeDelta.ts:1`).
- **Limitações reais, todas preexistentes e iguais com ou sem a flag**: um import de valor via `@/` quebra em runtime, porque o Node não lê `paths` do tsconfig; e sintaxe que não é só apagável (`enum`, `namespace`, parameter properties) é recusada. O `tsconfig` não tem `verbatimModuleSyntax`, então o `tsc` não avisa se alguém escrever `import { Tipo }` sem `type` num módulo testado. A convenção do `CLAUDE.md` ("`@/` only for type-only imports") continua sendo a proteção. Nada disso muda com esta feature, e nada disso afeta a descoberta.

### 1c. A versão fixada já remove tipos sem a flag? Mantemos a flag?

```text
                         sem flag                                   com flag
v22.16.0   ERR_UNKNOWN_FILE_EXTENSION ".ts" (testes falham)   5/5, com "ExperimentalWarning: Type Stripping is an experimental feature"
v22.17.0   ERR_UNKNOWN_FILE_EXTENSION ".ts" (testes falham)   5/5, com o mesmo ExperimentalWarning
v22.18.0   5/5, sem aviso                                      5/5, sem aviso
v22.23.1   5/5, sem aviso                                      5/5, sem aviso
```

Na v22.18.0 e na v22.23.1, `process.features.typescript` é `strip`; na v22.23.1, `--no-experimental-strip-types` volta a dar `ERR_UNKNOWN_FILE_EXTENSION`. A remoção de tipos vem ligada por padrão, e sem aviso, **a partir da v22.18.0** (medido: 22.17.0 ainda exige a flag, 22.18.0 não).

**Decisão (decorre da evidência; T1-A confirmado pela mantenedora em 2026-10-20)**: **manter a flag**. O `engines.node` mínimo é 22.17 (Q2), e na 22.17 o script sem a flag quebra. Na versão que o `.nvmrc` resolve hoje (22.23.x, local e no runner) a flag é inócua: mesmo resultado, sem aviso. Ela só pode sair se o mínimo declarado for 22.18 ou mais.

**Trade-off (para a mantenedora)**: o mínimo 22.17 foi decidido na clarificação Q2 por causa do `fs.globSync`. A medição acima mostra que um mínimo de **22.18** permitiria também tirar a flag.

| Opção | Prós | Contras |
|---|---|---|
| Mínimo 22.17, flag mantida (**escolhida**) | É a decisão Q2, sem reabrir. Mesmo mínimo da API. A flag é inócua de 22.18 em diante (medido). | O script continua com `--experimental-strip-types`, e quem estiver em 22.17 vê `ExperimentalWarning` em cada arquivo de teste. |
| Mínimo 22.18, sem flag | Scripts mais curtos; nenhum aviso em nenhuma versão admitida. | Reabre Q2 e muda FR-015. Diverge da API (22.17). O `CLAUDE.md` e a constituição citam a flag e teriam de mudar. |

## 2. `fs.globSync` na versão fixada: aviso de experimental e exclusão de `node_modules` (FR-012)

Origem: API, research.md ponto 1, que leu na tag `v22.23.1` do Node que o runner (`lib/internal/test_runner/runner.js`, `createTestFileList`) usa a classe `Glob` de `internal/fs/glob` com `exclude: (name) => name === 'node_modules'`, a mesma classe por trás de `fs.globSync`. Reconfirmado aqui por medição, na árvore sintética do ponto 1a:

```text
script: process.on("warning", ...); fs.globSync("src/**/*.test.ts", { exclude: (n) => n === "node_modules" }) e sem exclude

v22.16.0  com exclude: os 5 arquivos de src/ fora de node_modules   sem exclude: 6
          ExperimentalWarning: globSync is an experimental feature and might change at any time
v22.17.0  com exclude: os mesmos 5                                  sem exclude: 6     (nenhum aviso)
v22.23.1  com exclude: os mesmos 5                                  sem exclude: 6     (nenhum aviso)
```

- **Sem aviso** de experimental a partir da 22.17.0; na 22.16.0 o aviso aparece. Isso confirma o mínimo 22.17 (Q2).
- **A exclusão tem de ser passada explicitamente**: sem o `exclude`, o `fs.globSync` devolve 6 arquivos, incluindo `src/node_modules/x/nm.test.ts`, que o runner ignora. Com o `exclude`, a lista coincide com os 5 que o runner executou (ponto 1a).
- O `fs.globSync` devolve caminhos com `\` no Windows; a guarda só conta, então isso não importa.
- **Glob vazio**: na 22.17.0, `node --test "nada/**/*.test.ts"` dá `# tests 0`, exit 0; um caminho literal inexistente dá `Could not find 'nada/x.test.ts'`. A guarda continua necessária na versão mínima, não só na atual.

**Decisão** (T3-A com o ajuste da mantenedora, 2026-10-20): a guarda usa `fs.globSync("src/**/*.test.ts")`, o mesmo padrão do script `test`, **sem** a opção `exclude`. A exclusão de `node_modules` fica numa função pura testada, que descarta todo caminho com um segmento `node_modules`, aceitando `/` e `\`. Como esta medição mostrou, é justamente a exclusão que muda o resultado (6 contra 5), então é ela que precisa de teste. A casca de I/O só chama o `globSync` e repassa a lista (plan.md D10). O resultado é o mesmo do runner, que exclui qualquer entrada chamada `node_modules`.

## 3. `tsc -b` como script de typecheck: o que ele escreve no disco (FR-009)

No worktree descartável, após `npm ci`, com os tsconfigs atuais:

```text
git status --short --ignored (sem node_modules), antes:   vazio
npx tsc -b                                                 exit 0
git status --short --ignored, depois:
  !! tsconfig.app.tsbuildinfo
  !! tsconfig.node.tsbuildinfo
find . -name '*.tsbuildinfo' (fora de node_modules):  ./tsconfig.app.tsbuildinfo  ./tsconfig.node.tsbuildinfo
ls dist:                                               não existe
```

- Os dois `tsconfig.*.json` têm `noEmit: true`: não sai nenhum `.js` nem `dist/`. O `tsc -b` escreve só os dois `.tsbuildinfo` **na raiz**, nada dentro de `src/`, e o `.gitignore` já os ignora (`*.tsbuildinfo`). O working tree continua limpo para o `git status`.
- `tsc -b --verbose` mostra `Project 'tsconfig.app.json' is out of date because output file 'src/App.js' does not exist`: com `noEmit`, o projeto nunca é considerado atualizado e é verificado de novo a cada execução. O `.tsbuildinfo` não faz o typecheck pular nada por engano.
- O `typecheck` não gera o bundle: o bundle é do `vite build`, que só o script `build` chama.

**Decisão**: `"typecheck": "tsc -b"`, exatamente a primeira metade do `build`. Cobre `src/` (inclusive os testes) e `vite.config.ts`. Arquivos novos fora dessas pastas, como a guarda, só entram se o tsconfig os incluir (plan.md D9).

## 4. Riscos de Windows para Linux (FR-024, edge cases)

**Caixa nos imports de código**: o `tsc` força consistência. Nenhum tsconfig define `forceConsistentCasingInFileNames`, e o padrão é `true` desde o TypeScript 5.0. Medido no worktree, trocando temporariamente um import de teste para `"./ChartMath.ts"`:

```text
src/components/chart/chartMath.test.ts(3,47): error TS1149: File name '.../ChartMath.ts' differs from already included file name '.../chartMath.ts' only in casing.
exit=2
```

Como o `include` lista os arquivos com a caixa real do disco, qualquer import `.ts`/`.tsx` com caixa diferente falha no `typecheck` já no Windows.

**Caixa nos imports de CSS Module**: o `tsc` **não** pega. `src/vite-env.d.ts` referencia `vite/client`, que declara `*.module.css` por curinga. Medido trocando `"./Chart.module.css"` por `"./chart.module.css"` em `src/components/chart/Chart.tsx`:

```text
npx tsc -b         exit 0
npx vite build     ✓ built in 1.99s, exit 0      (Windows, sistema de arquivos sem distinção de caixa)
```

No Linux o mesmo import não resolve. Só o job `build` da CI responde a esse caso.

**Estado atual**: um script descartável (no rascunho, fora do repositório) conferiu cada import relativo e `@/` de `src/**/*.{ts,tsx,css}` e `vite.config.ts` contra o índice do git, com a caixa exata:

```text
imports verificados: 104
nenhuma divergência de caixa ou caminho
```

**Caminhos**: nenhum import usa `\`. Os scripts novos usam `/` nos padrões de glob, e o Node aceita `/` nos dois sistemas.

**Fim de linha**: o índice tem 120 arquivos, todos `i/lf` (`git ls-files --eol`); nenhum `i/crlf`. Localmente `core.autocrlf=true`, então o checkout no Windows tem CRLF e no runner Linux tem LF. A `.gitattributes` só marca `.specify/**` como vendored. Nenhuma regra do ESLint configurado é sensível a fim de linha (não há `linebreak-style` nem Prettier), e o Node e o `tsc` aceitam os dois. Risco baixo, sem ação.

| Verificável antes da primeira execução | Só a CI responde |
|---|---|
| Caixa dos imports `.ts`/`.tsx` (o `tsc` falha no Windows) | Caixa dos imports CSS: o `vite build` no Linux |
| Caixa dos 104 imports atuais (feito, 0 divergências) | `npm ci` do lockfile atual no Linux (sem dependência nativa, esperado sem problema) |
| Mesmo conjunto de testes no cmd e no sh (feito, 16/16, mesmos nomes) | O conjunto no Linux de verdade (sh do Ubuntu, sistema de arquivos com distinção de caixa) |
| Fim de linha no índice (feito, tudo LF) | Tempo real dos quatro jobs (SC-005) |

**Decisão T4-A** (mantenedora, 2026-10-20): a demonstração do check `build` usa um import de CSS Module com a caixa trocada. A checagem local no Windows passa (`tsc -b` e `vite build` com exit 0, medido acima), e só a CI no Linux deve reprovar. Esse é o objetivo da demonstração: provar que a CI pega o que o Windows não pega. Se o Linux não reprovar, isso é registrado como achado e a demonstração cai para um CSS inexistente.

## 5. O `npm ci` quando o Node não atende ao `engines` (US3, cenário 4)

Pasta de rascunho com um `package.json` sem dependências e `"engines": { "node": ">=99" }`, Node v22.23.1, npm 10.9.8:

```text
npm ci
  npm warn EBADENGINE Unsupported engine {
  npm warn EBADENGINE   package: 'e5@1.0.0',
  npm warn EBADENGINE   required: { node: '>=99' },
  npm warn EBADENGINE   current: { node: 'v22.23.1', npm: '10.9.8' }
  npm warn EBADENGINE }
  exit 0
npm install            mesmo aviso, exit 0
npm test (script)      sem aviso, exit 0
npm ci --engine-strict npm error notsup Not compatible with your version of node/npm ... exit 1
npm config get engine-strict  -> false
```

- Por padrão é **aviso**, não erro: a instalação segue e termina com exit 0. Isso atende ao cenário 4 da US3 ("o npm avisa"), na instalação. Os scripts (`npm test` etc.) não checam o `engines`.
- Com `engine-strict` ligado, vira erro (exit 1).

**Trade-off**: manter o padrão (aviso) ou versionar um `.npmrc` com `engine-strict=true`. **Decidido** pela mantenedora em 2026-10-20: T2-A, só o aviso.

| Opção | Prós | Contras |
|---|---|---|
| Aviso (padrão, **escolhida**) | Atende ao texto da spec. Mesmo comportamento da API. Nenhum arquivo novo. | Quem ignorar o aviso pode rodar com Node antigo; na 22.16 a guarda e a remoção de tipos imprimem `ExperimentalWarning` mas funcionam. |
| `.npmrc` com `engine-strict=true` | Instalação recusada abaixo de 22.17 | O `engine-strict` vale também para os `engines` das dependências, então uma dependência com `engines` estreito pode bloquear a instalação. Diverge da API. Exige mudar a spec ("avisa" vira "recusa"). |

## 6. Versão do Node: `.nvmrc`, fnm e o runner (FR-014)

Origem: API, research.md ponto 3, medido em 2026-10-19 com o mesmo fnm 1.39.0: o fnm e o `actions/setup-node` leem `.nvmrc`; quando existem `.nvmrc` e `.node-version`, o fnm prefere o `.nvmrc`; `22` resolve para a 22.x mais nova **instalada** (localmente 22.23.1), e o setup-node procura primeiro no cache do runner. Reconfirmado aqui o que mudou de máquina: `fnm list` mostra v22.14.0 e v22.23.1 instaladas, então `22` resolve para v22.23.1 localmente. O primeiro run da API no `ubuntu-24.04` (2026-10-20, run 39359419705) resolveu `22` para **v22.23.3**, do cache do runner.

**Decisão** (clarificação a): um único `.nvmrc` com `22`, nunca junto com `.node-version`. Local e CI concordam no major, não necessariamente no patch (22.23.1 x 22.23.3), como na API. Ambos estão acima de 22.18, então rodam a remoção de tipos sem aviso.

## 7. Actions e versões atuais

`gh api repos/actions/<nome>/releases/latest` e `git/ref/tags/v7`, em 2026-10-20, contra os repositórios oficiais:

| Action | Última release | Publicada | Releases recentes | Tag `v7` aponta para |
|---|---|---|---|---|
| `actions/checkout` | `v7.0.1` | 2026-07-20 | v7.0.1, v6.1.0, v5.1.0, v4.4.0, v7.0.0, … | `3d3c42e5aac5ba805825da76410c181273ba90b1` (commit) |
| `actions/setup-node` | `v7.1.0` | 2026-10-08 | v7.1.0, v7.0.0, v6.5.0, … | `949feb2413d6458794dcd2491c4babbbce0c15c1` (commit) |

`git/ref/tags/v8` dá 404 nos dois: **`v7` é a major atual**. São as mesmas majors e SHAs medidos pela API em 2026-10-19. O workflow não usa nenhuma action de terceiros.

## 8. Estado atual do repositório no GitHub

`gh repo view` e `gh api`, 2026-10-20:

```text
visibility PUBLIC; default branch main
mergeCommitAllowed true, squashMergeAllowed true, rebaseMergeAllowed true, deleteBranchOnMerge false
GET /rulesets                -> []
GET /actions/permissions     -> {"enabled":true,"allowed_actions":"all","sha_pinning_required":false}
PRs abertos                  -> nenhum
```

- Actions está habilitado e o repositório é público: os runners hospedados não têm custo e não há nada a configurar antes do primeiro run (SC-007).
- Não há ruleset e os três métodos de merge estão ligados. O passo manual (US4) muda isso depois do merge.
- Não há PR aberto a partir da `main` antiga hoje, mas a ordem decidida (clarificação d) vale para qualquer um que surja até lá.

## 9. Qual versão do workflow roda num pull request

Origem, sem novo experimento: API, research.md, T033 (PR #6, run 39473001785, 2026-10-20). Um PR que só acrescentou um passo `echo versao-do-PR` ao `ci.yml` mostrou esse passo no próprio run, e a `main` não tinha o passo. Um `pull_request` roda o workflow como alterado pelo PR. Consequência aqui: o próprio PR desta feature já roda a CI, antes de o arquivo existir na `main`.

## 10. Referências locais de tempo (não são números da CI)

- `npm ci` num worktree limpo, Windows: cerca de 1 min (relatório de estado de 2026-10-20).
- `npm test` com o glob: `duration_ms` na casa de 260 ms para 16 testes.
- `tsc -b`: cerca de 5 s.
- `vite build`: cerca de 2 s.

O teto de 5 minutos do SC-005 vale para a CI e é medido na primeira execução verde, registrada neste arquivo.

## Post-implementation evidence

(Preenchido durante a implementação: Windows local, primeiro run no Linux, re-run com cache, PRs de demonstração, push direto recusado, conferência do ruleset pela API.)

### Windows (local)

Máquina da mantenedora, Windows 11, Git Bash, Node v22.23.1, 2026-10-20. Experimentos em arquivos rastreados foram revertidos com `git checkout --` e conferidos com `git status --short`; arquivos novos de experimento foram removidos.

**T006 — `fnm use`** (informado pela mantenedora, na raiz do repositório, numa janela nova do terminal): `fnm use` resolveu o `.nvmrc` (`22`) para a v22.23.1 e `node -v` mostrou v22.23.1. A v22.14.0 também está instalada, abaixo do mínimo 22.17, e o fnm escolheu a mais nova da major, como esperado.

**T009 — `npm run typecheck`:**

```text
npm run typecheck                         exit 0; git status --short mostrava só CLAUDE.md, README.md, package.json
com `const tmpTypeError: number = "x";` em src/utils/formatDate.ts:
  src/utils/formatDate.ts(3,9): error TS2322: Type 'string' is not assignable to type 'number'.
  src/utils/formatDate.ts(3,9): error TS6133: 'tmpTypeError' is declared but its value is never read.
  exit_npm_run_typecheck=2
depois de git checkout -- src/utils/formatDate.ts: git diff -- src vazio; npm run typecheck exit 0
```

**T012 — mesmos testes antes e depois do glob.** Oráculo independente do glob: um preload (`NODE_OPTIONS=--import file:///.../logArgv.mjs`) grava o `argv[1]` de cada processo de teste.

```text
                                      testes   arquivos executados (argv[1])
lista antiga explícita (4 arquivos)   16/16    chartMath, computeDelta, trackMapMath, coachInsights
npm run -s test (cmd, glob novo)      16/16    os mesmos 4
npm run -s --script-shell=<Git>\usr\bin\sh.exe test (sh)   16/16   os mesmos 4
diff dos nomes de teste ordenados: antiga x cmd = vazio; cmd x sh = vazio
```

**T014 — teste contra o esboço** (`TEST_PATTERN = ""`, `filterTestFiles` devolve a lista, `checkDiscovery` devolve `{ exitCode: -1, message: "" }`): `# tests 22, pass 16, fail 6`. Cada um dos 6 testes novos falha com `ERR_ASSERTION` na própria asserção (linhas 6, 11, 17, 22, 29 e 36 de `src/tooling/testDiscovery.test.ts`); nenhum `ERR_MODULE_NOT_FOUND`. Depois de apertar as asserções da mensagem (comparação da mensagem inteira), um segundo esboço com o `exitCode` certo e a mensagem errada falhou nas linhas 12 e 18, ou seja, as asserções da mensagem pegam sozinhas.

**`npm test` com a implementação:**

```text
[assertTestFiles] 5 arquivos de teste encontrados em src/**/*.test.ts
# tests 22  # pass 22  # fail 0   exit 0
```

**Arquivo de teste novo entra sem editar script.** `src/tmpcheck/probe.test.ts` com `assert.equal(1, 2)`:

```text
[assertTestFiles] 6 arquivos de teste encontrados em src/**/*.test.ts
not ok 13 - probe temporário com asserção falsa   (expected: 2, actual: 1)
# tests 23  # pass 22  # fail 1   exit 1
```

**Erro de sintaxe reprova o script, em vez de ser ignorado.** `src/tmpcheck/syntax.test.ts` com `const x = ;`:

```text
[assertTestFiles] 6 arquivos de teste encontrados em src/**/*.test.ts
# SyntaxError [ERR_INVALID_TYPESCRIPT_SYNTAX]: Expression expected
not ok 4 - src\\tmpcheck\\syntax.test.ts   (code: 'ERR_TEST_FAILURE')
# tests 23  # pass 22  # fail 1   exit 1
```

**Descoberta vazia.** Com `TEST_PATTERN = "nada/**/*.test.ts"` em `tools/testDiscovery.ts` (revertido):

```text
> telemetryf1@0.0.0 pretest
[assertTestFiles] nenhum arquivo de teste encontrado em nada/**/*.test.ts
exit 1; o `test` não chegou a rodar (0 linhas "ok"/"not ok")
```

**Erro de tipos em `tools/`.** `export const tmpTypeError: number = "x";` em `tools/assertTestFiles.ts` (revertido):

```text
tools/assertTestFiles.ts(8,14): error TS2322: Type 'string' is not assignable to type 'number'.
exit_npm_run_typecheck=2
```

**Arquivos de teste executados (SC-004), ordenados** (`argv[1]` de cada processo de `npm test`):

```text
src/components/chart/chartMath.test.ts
src/components/chart/computeDelta.test.ts
src/components/coach/trackMapMath.test.ts
src/tooling/testDiscovery.test.ts
src/utils/coachInsights.test.ts
```

Total: 22 testes (16 anteriores e 6 da guarda), contra os 5 arquivos que a guarda contou.

**Guarda confere o script `test` (T018a–T018c).** Teste escrito antes, contra um esboço de `scriptUsesQuotedPattern` com a lógica invertida: os 4 casos (aspas duplas, aspas simples, sem aspas, glob diferente) falharam com `ERR_ASSERTION` nas linhas 27, 34, 41 e 48 de `src/tooling/testDiscovery.test.ts`, `# tests 26, pass 22, fail 4`. Com a implementação, `# tests 26, pass 26`.

Com aspas simples temporárias no script (`"test": "node --experimental-strip-types --test 'src/**/*.test.ts'"`), revertido com `git checkout -- package.json`:

```text
> telemetryf1@0.0.0 pretest
> node --experimental-strip-types tools/assertTestFiles.ts

[assertTestFiles] o script test do package.json precisa conter "src/**/*.test.ts" entre aspas duplas
exit 1; o `test` não chegou a rodar (0 linhas "ok"/"not ok")
```

`git status --short` vazio depois da reversão, e o script voltou a `--test \"src/**/*.test.ts\"`.

### Linux (CI, first run)

PR #1 (`CI with GitHub Actions (spec 001)`), run **39527258441**, evento `pull_request`, commit `099096f`, 2026-10-21 01:25:46Z a 01:27:09Z (UTC). Dados de `gh run view 39527258441 --json ... ` e `--log`.

**Node resolvido no runner:** `node-version-file: .nvmrc` → `Found in cache @ /opt/hostedtoolcache/node/22.23.3/x64`, `node: v22.23.3` nos quatro jobs (local: v22.23.1; mesma major, como previsto no ponto 6).

**Jobs** (sem `needs`, iniciaram juntos às 01:25:48Z):

```text
job        resultado   início     fim        duração
typecheck  success     01:25:48   01:26:39   51 s
lint       success     01:25:48   01:27:04   76 s
test       success     01:25:48   01:27:04   76 s
build      success     01:25:48   01:27:08   80 s
run inteiro (criação a atualização): 83 s
```

SC-005: a execução inteira levou cerca de 1 min 23 s, abaixo do teto de 5 minutos. Este é o primeiro run e foi verde, então é a referência de tempo. A maior parte de cada job é o `npm ci` (43 s a 1 min no log: `added 153 packages, and audited 154 packages`); o `vite build` levou 1,17 s.

**Guarda e testes no log do job `test`:**

```text
> node --experimental-strip-types tools/assertTestFiles.ts
[assertTestFiles] 5 arquivos de teste encontrados em src/**/*.test.ts
# tests 27
# pass 27
# fail 0
```

**SC-004, Linux × Windows:** os nomes dos 27 testes do log do Linux, ordenados, comparados com os 27 de `npm test` no Windows (v22.23.1), dão `diff` vazio: mesmos nomes, mesmo total (27), mesma contagem da guarda (5 arquivos; lista dos arquivos no Windows na seção anterior, 22 testes naquele momento e 27 depois da extensão da guarda).

**Cache (`cache: npm`):**
- Chave: `node-cache-Linux-x64-npm-86e1d744d42747432fb4862b1e9b93dab0d6cbc6f815c12934efba34bdd72faf`.
- *Miss* nos quatro jobs: `npm cache is not found` no passo do `setup-node` (primeiro run, sem cache salvo).
- O job `typecheck` salvou a chave (`Cache saved with the key: ...`, 01:26:37Z). `lint`, `test` e `build` registraram `Failed to save: Unable to reserve cache with key ..., another job may be creating this cache` e ficaram verdes: a disputa de gravação prevista no plan.md D1.
- O *hit* do re-run está na seção seguinte.

**Observação fora de escopo:** o `npm ci` informa `27 vulnerabilities (1 low, 3 moderate, 23 high)`. A spec deixa a triagem do `npm audit` para um trabalho separado.

**SC-004, ambos os lados:** `comm` entre as duas listas de 27 nomes dá 0 nomes só no Linux e 0 só no Windows.

**Estado do PR #1 depois do run:** `mergeStateStatus: CLEAN`, `mergeable: MERGEABLE`, os quatro checks (`typecheck`, `lint`, `test`, `build`) com `SUCCESS`. Ainda não há ruleset, então o estado não depende de checks obrigatórios.

### Linux (CI, re-run)

`gh run rerun 39527258441` (tentativa 2), com o `package-lock.json` inalterado, mesmo commit `099096f`. Início 01:30:28Z, fim 01:31:08Z.

```text
job        resultado   duração
typecheck  success     40 s
lint       success     12 s
test       success     10 s
build      success     12 s
```

Cache, nos quatro jobs (chave `node-cache-Linux-x64-npm-86e1d744d42747432fb4862b1e9b93dab0d6cbc6f815c12934efba34bdd72faf`, a mesma do primeiro run):

```text
Cache hit for: node-cache-Linux-x64-npm-86e1d744...
Cache restored successfully
Cache restored from key: node-cache-Linux-x64-npm-86e1d744...
Cache hit occurred on the primary key ..., not saving cache.
```

O `npm ci` caiu para 2 a 4 s em `lint`, `test` e `build` (de 43 s a 1 min no primeiro run). No `typecheck` levou 27 s nessa tentativa, sem relação com o cache (também houve *hit*); a diferença não foi investigada. O log do `test` repete `[assertTestFiles] 5 arquivos de teste encontrados em src/**/*.test.ts` e `# tests 27, pass 27, fail 0`.

### Falhas só no Linux (T025)

Nenhuma falha só no Linux: os quatro jobs ficaram verdes no primeiro run e no re-run, sem correção.

### Merge do PR #1 e run do push na `main` (T032)

PR #1 mergeado com **Rebase and merge** em 2026-10-21T01:43:27Z; commit na `main`: `21109b4`. `git rev-list --merges --count main` deu 0 (histórico linear). A branch local foi apagada depois de `git diff --quiet main 001-ci-github-actions` não achar diferença (o rebase muda os SHAs, não as árvores), e a remota com `git push origin --delete` e `git fetch --prune` (`git ls-remote --heads origin` mostrou só `refs/heads/main`).

Run **39528970487** (evento `push`, `21109b4`), 01:43:30Z a 01:44:53Z (83 s no total):

```text
job        resultado   duração
typecheck  success     79 s
lint       success     79 s
test       success     75 s
build      success     69 s
```

O log do `test` mostra `[assertTestFiles] 5 arquivos de teste encontrados em src/**/*.test.ts` e `# tests 27, pass 27, fail 0`.

Cache: *miss* nos quatro jobs (`npm cache is not found`), apesar do *hit* no re-run do PR. A causa foi verificada depois, na seção "Cache: verificação na `main`" (o cache salvo num run de `pull_request` fica restrito à ref do PR).

### Branch protection (T034, T035)

**T034** (feita pela mantenedora): a primeira conferência pela API, antes de a mantenedora concluir a configuração, devolveu `rulesets: []`, `rules/branches/main: []` e os três métodos de merge ainda ligados, com `deleteBranchOnMerge: false`. A mantenedora então criou o ruleset e ajustou as configurações gerais seguindo só o README, e relatou que a interface bateu com os passos. A conferência da API abaixo confirma a configuração; nenhuma diferença entre o README e a interface foi anotada.

**T035** (API do GitHub, repositório `AnaLauraFFerraz/Telemetry-F1`):

```text
GET /rulesets/25518966
  name: main   target: branch   enforcement: active
  conditions.ref_name.include: ["~DEFAULT_BRANCH"]   exclude: []
  bypass_actors: []   current_user_can_bypass: "never"
  created_at: 2026-10-20T22:58:02-03:00

GET /rules/branches/main  (ruleset_id 25518966)
  deletion
  non_fast_forward
  required_linear_history
  pull_request: required_approving_review_count 0, dismiss_stale_reviews_on_push false,
    require_code_owner_review false, require_last_push_approval false,
    required_review_thread_resolution false, allowed_merge_methods [merge, squash, rebase]
  required_status_checks: strict_required_status_checks_policy true, do_not_enforce_on_create false,
    contextos typecheck, lint, test, build, todos com integration_id 15368

GET /apps/github-actions -> {"id":15368,"name":"GitHub Actions","slug":"github-actions"}

gh repo view --json mergeCommitAllowed,squashMergeAllowed,rebaseMergeAllowed,deleteBranchOnMerge
  {"deleteBranchOnMerge":true,"mergeCommitAllowed":false,"rebaseMergeAllowed":true,"squashMergeAllowed":false}

gh secret list    -> vazio (exit 0)
gh variable list  -> vazio (exit 0)
```

- A regra `pull_request` lista os três métodos em `allowed_merge_methods`, que é o padrão da regra; na prática só o rebase vale, por causa das configurações gerais do repositório. O README não manda mexer nisso.
- `non_fast_forward` e `deletion` conferidos aqui são a prova de que push forçado e exclusão da `main` são recusados (SC-006), sem tentativa (spec, Clarifications).

### Demonstração: `lint` (T036–T039)

- Branch `demo/lint-failure` a partir de `origin/main` (`21109b4`); commit `2fa277c`, `chore: demo lint failure (do not merge)`: `iso: any` em `src/utils/formatDate.ts` (regra `@typescript-eslint/no-explicit-any`).
- Checagem local (Windows): `typecheck` exit 0; `lint` exit 1 (`1:44  error  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any`); `build` exit 0; `npm test` 27/27. Só o `lint` falha.
- PR #2, `[NÃO MERGEAR] Demo: lint failure (do not merge)`.
- `mergeStateStatus` com os checks ainda rodando (US4 cenário 1, check pendente): 02:01:32Z, `BLOCKED`, com a lista de checks ainda vazia; 02:01:36Z e 02:01:43Z, `BLOCKED`, com `typecheck` em fila e `lint`, `test` e `build` em andamento; 02:01:50Z, `BLOCKED`, com `lint` em `FAILURE` e `build` ainda rodando.
- Run **39530675163** (evento `pull_request`, `2fa277c`), 02:01:34Z a 02:02:16Z:

  ```text
  job        resultado   duração
  typecheck  success     12 s
  lint       failure     13 s
  test       success     10 s
  build      success     39 s
  ```

  Só `lint` reprovou; os outros três rodaram até o fim. Estado final do PR: `mergeStateStatus: BLOCKED`, `mergeable: MERGEABLE`.
- **Selo** (`https://github.com/AnaLauraFFerraz/Telemetry-F1/actions/workflows/ci.yml/badge.svg`, US5 cenário 2):

  ```text
  ?branch=demo/lint-failure                        -> CI - no status   (barra literal)
  ?branch=demo/lint-failure&event=pull_request     -> CI - no status
  ?branch=demo%2Flint-failure                      -> CI - failing     (barra codificada)
  ?branch=demo%2Flint-failure&event=pull_request   -> CI - failing
  ?branch=demo%2Flint-failure&event=push           -> CI - no status
  ?branch=main                                     -> CI - passing
  ```

  A URL que mostrou o estado reprovado é a com a barra codificada (`%2F`); o `event=pull_request` não foi necessário. **Correção dos documentos (T052):** o quickstart, a T037 do `tasks.md` e o plano mandavam abrir `?branch=demo/lint-failure` (barra literal), que mostrou "no status"; os três foram corrigidos para a forma com `%2F`, que é a que funcionou. O selo do README usa `?branch=main`, sem barra, e não é afetado. A resposta traz `Cache-Control: max-age=300`, então não foi isolado se o "no status" da barra literal veio de cache ou do formato da URL.
- **Tentativa de merge (T038, pela mantenedora):** print em `specs/001-ci-github-actions/evidence/demo-lint-merge-blocked.png`. O print mostra o commit `2fa277c` com a marca de falha, o painel "Some checks were not successful — 1 failing, 3 successful checks", `CI / lint (pull_request)` reprovado ("Failing after 13s"), `CI / build` (39 s), `CI / test` (10 s) e `CI / typecheck` (12 s) aprovados, os quatro com o rótulo **Required**, e o botão **Rebase and merge** desabilitado. Depois da tentativa, `gh pr view 2`: `mergeStateStatus: BLOCKED`, `mergeable: MERGEABLE`, `mergedAt: null`, `state: OPEN`.
- **T039:** `gh pr close 2` (estado `CLOSED`, `mergedAt: null`), branch local apagada (`was 2fa277c`) e remota apagada com `git push origin --delete demo/lint-failure`; `git ls-remote --heads origin` mostrou só a `main`. O print nunca entrou em commit na branch da demonstração.

### Demonstração: `test` (T040–T041)

- Branch `demo/test-failure` a partir de `origin/main` (`21109b4`); commit `522bf01`, `chore: demo test failure (do not merge)`: em `src/components/chart/chartMath.test.ts`, `assert.equal(nearestPointIndex([], 5), 0)` virou `..., 1)`.
- Checagem local (Windows): `typecheck`, `lint` e `build` com exit 0; `npm test` com exit 1 e um único `not ok`: `not ok 3 - nearestPointIndex em array vazio retorna 0 sem crashar` (expected 1, actual 0), `# tests 27, pass 26, fail 1`.
- PR #3, `[NÃO MERGEAR] Demo: test failure (do not merge)`.
- Run **39531960506** (evento `pull_request`, `522bf01`), 02:15:04Z a 02:15:47Z:

  ```text
  job        resultado   duração
  typecheck  success     15 s
  lint       success     40 s
  test       failure     36 s
  build      success     39 s
  ```

  Só `test` reprovou; os outros três rodaram até o fim. O log do job `test` no Linux repete `[assertTestFiles] 5 arquivos de teste encontrados em src/**/*.test.ts`, o mesmo `not ok 3` (expected 1, actual 0) e `# tests 27, pass 26, fail 1`. Estado do PR: `mergeStateStatus: BLOCKED`, `mergeable: MERGEABLE`, `state: OPEN`.
- **Tentativa de merge (T041, pela mantenedora):** print em `specs/001-ci-github-actions/evidence/demo-test-merge-blocked.png`. O print mostra o painel "Some checks were not successful — 1 failing, 3 successful checks", `CI / test (pull_request)` reprovado ("Failing after 36s"), `CI / build` (39 s), `CI / lint` (40 s) e `CI / typecheck` (15 s) aprovados, os quatro com o rótulo **Required**, e o botão **Rebase and merge** desabilitado. O print não mostra o cabeçalho do commit. Depois da tentativa, `gh pr view 3`: `mergeStateStatus: BLOCKED`, `mergeable: MERGEABLE`, `mergedAt: null`, `state: OPEN`.
- **Fechamento:** `gh pr close 3` (estado `CLOSED`, `mergedAt: null`), branch local apagada (`was 522bf01`) e remota apagada; `git ls-remote --heads origin` mostrou só a `main`. O print nunca entrou em commit na branch da demonstração.

### Demonstração: `typecheck` e `build` juntos (T042–T043)

- Branch `demo/typecheck-failure` a partir de `origin/main` (`21109b4`); commit `199b313`, `chore: demo type error (do not merge)`: em `src/pages/settings/useIsRecent.ts`, `return Date.now() - timestamp < thresholdMs;` virou `const elapsed: number = String(Date.now() - timestamp); return elapsed < thresholdMs;`. O módulo só é importado por `SettingsPage.tsx`, e nenhum teste o carrega. O `elapsed` é usado na linha seguinte para o `lint` não acusar variável sem uso.
- Checagem local (Windows): `typecheck` exit 2 e `build` exit 2, ambos com `src/pages/settings/useIsRecent.ts(17,9): error TS2322: Type 'string' is not assignable to type 'number'.`; `lint` exit 0; `npm test` 27/27.
- PR #4, `[NÃO MERGEAR] Demo: type error (do not merge)`.
- Run **39532559695** (evento `pull_request`, `199b313`), 02:21:30Z a 02:22:18Z:

  ```text
  job        resultado   duração
  typecheck  failure     14 s
  lint       success     45 s
  test       success     23 s
  build      failure     16 s
  ```

  O log dos dois jobs reprovados traz `##[error]src/pages/settings/useIsRecent.ts(17,9): error TS2322: Type 'string' is not assignable to type 'number'.` e `##[error]Process completed with exit code 2.` `lint` e `test` rodaram até o fim. É o comportamento esperado pela Q1: o `build` mantém `tsc -b`, então não existe demonstração só de `typecheck`. Estado do PR: `mergeStateStatus: BLOCKED`, `mergeable: MERGEABLE`, `state: OPEN`.
- **Tentativa de merge (T043, pela mantenedora):** print em `specs/001-ci-github-actions/evidence/demo-typecheck-merge-blocked.png`. O print mostra o painel "Some checks were not successful — 2 failing, 2 successful checks", `CI / build (pull_request)` reprovado ("Failing after 16s"), `CI / typecheck (pull_request)` reprovado ("Failing after 14s"), `CI / lint` (45 s) e `CI / test` (23 s) aprovados, os quatro com o rótulo **Required**, e o botão **Rebase and merge** desabilitado. O print não mostra o cabeçalho do commit. Depois da tentativa, `gh pr view 4`: `mergeStateStatus: BLOCKED`, `mergeable: MERGEABLE`, `mergedAt: null`, `state: OPEN`.
- **Fechamento:** `gh pr close 4` (estado `CLOSED`, `mergedAt: null`), branch local apagada (`was 199b313`) e remota apagada; `git ls-remote --heads origin` mostrou só a `main`. O print nunca entrou em commit na branch da demonstração.

### Demonstração: `build` (caixa do CSS Module, T044–T045)

- Branch `demo/build-css-case` a partir de `origin/main` (`21109b4`); commit `b7fbc70`, `chore: demo CSS import case mismatch (do not merge)`: em `src/components/chart/Chart.tsx`, `import styles from "./Chart.module.css"` virou `"./chart.module.css"`. O arquivo rastreado pelo git é `src/components/chart/Chart.module.css`.
- **Checagem local no Windows: os quatro scripts passaram.** `npm run typecheck` exit 0, `npm run lint` exit 0, `npm run build` exit 0 (`✓ built in 1.33s`) e `npm test` 27/27. Era o objetivo da demonstração: o sistema de arquivos do Windows ignora a caixa e aceita o import (research ponto 4).
- PR #5, `[NÃO MERGEAR] Demo: CSS import case mismatch (do not merge)`.
- Run **39533090730** (evento `pull_request`, `b7fbc70`), 02:27:11Z a 02:27:30Z:

  ```text
  job        resultado   duração
  typecheck  success     12 s
  lint       success     12 s
  test       success     13 s
  build      failure     15 s
  ```

  **Só o Linux reprovou**, e só o `build`. A linha de erro do Vite no log: `error during build: Could not resolve "./chart.module.css" from "src/components/chart/Chart.tsx"`, seguida de `##[error]Process completed with exit code 1.` A alternativa com `./Missing.module.css` não foi necessária. Estado do PR: `mergeStateStatus: BLOCKED`, `mergeable: MERGEABLE`, `state: OPEN`.
- **Tentativa de merge (T045, pela mantenedora):** print em `specs/001-ci-github-actions/evidence/demo-build-merge-blocked.png`. O print mostra o painel "Some checks were not successful — 1 failing, 3 successful checks", `CI / build (pull_request)` reprovado ("Failing after 15s"), `CI / lint` (12 s), `CI / test` (13 s) e `CI / typecheck` (12 s) aprovados, os quatro com o rótulo **Required**, e o botão **Rebase and merge** desabilitado. O print não mostra o cabeçalho do commit. Depois da tentativa, `gh pr view 5`: `mergeStateStatus: BLOCKED`, `mergeable: MERGEABLE`, `mergedAt: null`, `state: OPEN`.
- **Fechamento:** `gh pr close 5` (estado `CLOSED`, `mergedAt: null`), branch local apagada (`was b7fbc70`) e remota apagada; `git ls-remote --heads origin` mostrou só a `main`. O print nunca entrou em commit na branch da demonstração.

### Push direto na `main` recusado (T046)

De uma branch descartável `tmp/direct-push`, criada a partir de `origin/main` sem tocar na `main` local, com um commit vazio. Antes: `git ls-remote origin refs/heads/main` → `21109b44d193b1d7dd5d79db9956a090abaa394b`.

```text
$ git commit --allow-empty -m "chore: test direct push to main (must be rejected)"
6c92f0f chore: test direct push to main (must be rejected)

$ git push origin HEAD:main
remote: error: GH013: Repository rule violations found for refs/heads/main.
remote: Review all repository rules at https://github.com/AnaLauraFFerraz/Telemetry-F1/rules?ref=refs%2Fheads%2Fmain
remote:
remote: - Changes must be made through a pull request.
remote:
remote: - 4 of 4 required status checks are expected.
remote:
To https://github.com/AnaLauraFFerraz/Telemetry-F1.git
 ! [remote rejected] HEAD -> main (push declined due to repository rule violations)
error: failed to push some refs to 'https://github.com/AnaLauraFFerraz/Telemetry-F1.git'
exit=1
```

O push foi recusado (exit 1, `GH013`), mesmo vindo da mantenedora, que tem `permissions.admin: true` no repositório; o ruleset não tem bypass. A branch `tmp/direct-push` foi apagada (`was 6c92f0f`) e nunca foi enviada com o próprio nome. Depois: `git ls-remote --heads origin` mostrou só `refs/heads/main` em `21109b44d193b1d7dd5d79db9956a090abaa394b`, o mesmo commit de antes. A contingência (push aceito) não se aplicou.

### Cache: verificação na `main`

Pergunta: o cache salvo pela `main` foi restaurado pelos runs seguintes? Fontes: os logs de cinco runs e `GET /repos/AnaLauraFFerraz/Telemetry-F1/actions/caches`.

- Run do push na `main` (39528970487, 01:43:30Z): `Cache mode: write` e `npm cache is not found` nos quatro jobs (*miss*), apesar de a chave já existir para a ref do PR #1. O job `build` salvou (`Cache saved with the key: node-cache-Linux-x64-npm-86e1d744...`); `typecheck`, `lint` e `test` registraram `Failed to save: Unable to reserve cache with key ..., another job may be creating this cache`.
- Runs das quatro demonstrações, todos depois (39530675163 lint, 39531960506 test, 39532559695 typecheck e 39533090730 build): nos quatro jobs de cada um, `Cache hit for: node-cache-Linux-x64-npm-86e1d744...`, `Cache restored successfully` e `Cache restored from key: <a mesma chave>`. Quando o job reporta o *hit* na chave primária, também registra `not saving cache`.
- A API de caches lista duas entradas com a **mesma chave**, uma por ref, e o log não diz qual delas foi restaurada; o que decide são as datas de último acesso:

  ```text
  ref                  criada (UTC)          último acesso (UTC)
  refs/pull/1/merge    2026-10-21 01:26:37   2026-10-21 01:38:17   (run 1 do PR e o re-run, depois nada)
  refs/heads/main      2026-10-21 01:44:40   2026-10-21 02:27:18   (os runs das demonstrações)
  ```

  A entrada de `refs/pull/1/merge` não foi acessada depois das 01:38:17; a da `main` foi acessada até 02:27:18, no horário do último run de demonstração (02:27:11Z a 02:27:30Z).

**Conclusão (o que os logs e a API mostram):** o cache salvo num run de `pull_request` ficou restrito à ref do PR (a `main` não o restaurou e criou o próprio às 01:44:40Z), e os runs posteriores restauraram o cache salvo pela `main`. Isso confirma a hipótese do run do push na `main`. Os PRs de demonstração não tinham cache próprio e restauraram o da branch base. Nada foi alterado no workflow por causa disso.

### Fechamento

- Itens do README que diferiram da interface do GitHub (T034): nenhum foi anotado, então não há correção do README vinda daí.
- O registro do merge deste PR de fechamento (T050: número do PR e `mergedAt`, conferidos pela API, o run do push na `main` e as marcações das tarefas T049–T050) vai no PR da emenda da constituição, porque este PR não pode registrar o próprio merge.
