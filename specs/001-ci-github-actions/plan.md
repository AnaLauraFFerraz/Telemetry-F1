# Implementation Plan: CI do front no GitHub Actions

**Branch**: `001-ci-github-actions` | **Date**: 2026-10-20 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/001-ci-github-actions/spec.md`

## Summary

Todo PR para a `main` e todo push na `main` passam por quatro checks independentes no GitHub Actions, `typecheck`, `lint`, `test` e `build`. Cada check chama só o script de mesmo nome do `package.json`, num checkout limpo no Linux, sem segredo, sem `.env` e sem a API rodando. Localmente, os mesmos scripts rodam com a mesma major do Node, lida de um `.nvmrc`.

O script de teste passa a descobrir sozinho todo `src/**/*.test.ts` com um glob entre aspas duplas resolvido pelo próprio Node, o mesmo conjunto no cmd e no sh. Uma guarda `pretest` reprova a descoberta vazia; a lógica dela é uma função pura testada. Depois do merge, a dona do repositório protege a `main` com um ruleset, seguindo o README.

O desenho reaproveita as decisões da spec 002 da API (`TelemetryF1_API`), escritas aqui com o motivo de cada uma. A evidência está em [research.md](research.md).

## Technical Context

**Language/Version**: TypeScript 5.6 (`strict`) no código; Node.js major 22 fixado em `.nvmrc`, mínimo declarado 22.17 em `engines.node`. Localmente resolve para v22.23.1 (fnm); no runner, para a 22.x do cache do `ubuntu-24.04` (v22.23.3 no run da API de 2026-10-20).

**Primary Dependencies**: nenhuma nova. GitHub Actions com `actions/checkout@v7` e `actions/setup-node@v7` (primeira parte). Ferramentas já no projeto: `tsc` (5.6), ESLint 9, Vite 5, `node:test`.

**Storage**: não se aplica.

**Testing**: `node --experimental-strip-types --test "src/**/*.test.ts"` (runner nativo), precedido pela guarda `pretest`. Os testes continuam cobrindo só funções puras, inclusive o da guarda.

**Target Platform**: CI em `ubuntu-24.04` (só Linux). Desenvolvimento local em Windows 11 (cmd, que é o shell padrão do npm, e Git Bash).

**Project Type**: SPA React (Vite). Esta feature só mexe em tooling, CI e documentação; nenhum código de produção muda.

**Performance Goals**: SC-005. A primeira execução verde, depois de qualquer correção, é a referência, com teto de 5 minutos por run; acima disso, o research.md registra a causa e a ação.

**Constraints**:
- Sem segredos e sem configuração no GitHub além do workflow e do ruleset.
- Workflow com `permissions: contents: read`.
- Cada check chama um único script do `package.json`.
- Sem filtro de caminhos, sem matriz de versões ou de sistemas.

**Scale/Scope**: 1 workflow, 4 jobs, 1 guarda (casca de I/O mais função pura) com teste, cerca de 6 arquivos de configuração e documentação. Hoje há 4 arquivos de teste e 16 testes, número datado em 2026-10-20.

Não resta `NEEDS CLARIFICATION`: os pontos em aberto da spec foram resolvidos no clarify, e a Q3 foi respondida com evidência no [research.md](research.md), ponto 1.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

Constituição v1.0.0 (`.specify/memory/constitution.md`).

| Item | Situação | Observação |
|---|---|---|
| I. A API é dona do contrato | Passa | Nada em `src/types/` muda. |
| II. Containers com estado, componentes de apresentação | Passa | Nenhum código de `src/pages`/`src/components` muda. Os PRs de demonstração da fase 4 não são mergeados. |
| III. Sem bibliotecas de estado, gráfico ou fetch sem motivo | Passa | Nenhuma dependência nova; a guarda usa só `node:fs`. |
| IV. Derivar no render; efeitos só por ação explícita | Passa | Não se aplica a tooling. A CI não chama o coach nem a API. |
| V. Só tokens de design | Passa | Nenhum estilo muda. |
| VI. UI e documentação honestas | Passa | O README perde o "16 tests" (FR-021) e descreve só o que existe. O teto de tempo é medido, não inventado. |
| Restrição: Node.js ≥ 22.6 | Passa, com nota | `engines.node` sobe para `>=22.17`, que continua dentro de "≥ 22.6". `CLAUDE.md` e README passam a dizer 22.17; a constituição muda na emenda. |
| Restrição: testes cobrem funções puras | Passa | Decisão T3: o teste da guarda cobre só a função pura (D10). |
| Restrição: "each test file is listed in the `test` script" | Passa, com emenda parcial | A feature remove a lista de propósito (FR-010). A regra é emendada **no mesmo commit** que troca a lista pelo glob, via `/speckit-constitution`, para que nenhum commit deixe a constituição contrariando o código (D12). |
| Restrição: imports relativos com `.ts`; `@/` só em `import type` | Passa | Verificado (research ponto 1b). O novo teste importa com caminho relativo e `.ts`. |
| Fluxo: SDD, spec/plan/tasks commitados antes | Passa | Spec já commitada; plan e tasks entram como `docs:` antes da implementação. |
| Fluxo: `npm test`, `npm run lint`, `npm run build` antes de cada commit | Passa, com nota | Continua valendo. Pôr o `typecheck` nos gates e a CI como portão de merge na constituição fica para a **emenda separada**. O `CLAUDE.md` ganha uma nota de divergência temporária (D11). |
| Fluxo: Conventional Commits sem `Co-Authored-By` | Passa | O workflow entra como `chore:`, porque `ci:` não está na lista; acrescentá-lo é item da emenda. |
| Limitações conhecidas em `CLAUDE.md` e README | Passa | Nenhuma limitação listada é corrigida. Uma nova entra nos dois (aspas do glob, D11). |
| Segredos nunca commitados | Passa | O workflow não usa segredo nem `env:`. |

**Re-check pós-desenho**: igual à tabela acima. Nenhum commit contraria a constituição: a regra da lista de testes é emendada junto com o glob (D12). O que fica para a emenda da fase 5 são acréscimos (o `typecheck` e a CI nos gates, o mínimo 22.17, o tipo `ci:`), que hoje não contradizem o texto da constituição; o `CLAUDE.md` registra esses acréscimos numa nota temporária (D11).

## Design decisions

Cada decisão herdada da API está escrita aqui com o motivo; a API é citada só como origem. Os trade-offs T1–T4 foram decididos pela dona do repositório em 2026-10-20 (seção "Trade-offs decididos").

### D1. Quatro jobs independentes, sem `needs`

- Jobs `typecheck`, `lint`, `test` e `build`, sem `needs:` entre eles, sem `continue-on-error` e sem `if:`.
- **Motivo**: a spec exige que a lista de checks do PR diga sozinha o que falhou (SC-002) e que os quatro rodem até o fim (FR-004). Só jobs separados dão uma entrada ✓/✗ por gate. Sem dependência, a falha de um não cancela nem pula os outros. Com passos num job só, o primeiro erro interrompe o resto e a lista mostra uma entrada só.
- **Custo**: `npm ci` quatro vezes, em paralelo. O tempo de parede fica perto do job mais lento.
- **Efeito colateral conhecido** (API, research "Linux (CI, first run)"): no primeiro run, os jobs disputam a gravação da mesma chave de cache. O perdedor só registra `Unable to reserve cache` e fica verde.
- **Esperado e documentado** (Q1): um erro de tipos reprova `typecheck` e `build`, porque o `build` mantém `tsc -b`.

### D2. Os nomes são contrato

- Arquivo: `.github/workflows/ci.yml`; o selo do README depende desse nome.
- Workflow: `name: CI`.
- Jobs: ids e `name:` explícitos `typecheck`, `lint`, `test` e `build`, iguais aos scripts. A lista do PR mostra `CI / typecheck (pull_request)`, mas o ruleset casa pelo nome do check-run, que é o `name` do job.
- Renomear um job, ou criar outro workflow com um job de mesmo nome, exige atualizar os checks obrigatórios do ruleset na mesma entrega; senão todo PR espera para sempre por um check que nunca reporta. Renomear `ci.yml` exige atualizar o selo. A regra vai para o README e o `CLAUDE.md`.

### D3. Gatilhos e permissões

- `pull_request` com `branches: [main]` e `push` com `branches: [main]`. Sem `paths`/`paths-ignore`, porque um check obrigatório que não roda deixa o merge bloqueado (FR-024). Sem `workflow_dispatch`, que ninguém pediu.
- `permissions: contents: read` no topo, valendo para todos os jobs (FR-007). Em PRs de fork o `GITHUB_TOKEN` já é só leitura, e nenhum job precisa de mais.
- `actions/checkout` com `persist-credentials: false`. Nenhum passo faz push, e o `npm ci` roda scripts de instalação das dependências depois do checkout; sem isso, esses scripts poderiam ler o token gravado em `.git/config`. É defesa em profundidade junto com o `contents: read`.

### D4. Referência das actions

- `actions/checkout@v7` e `actions/setup-node@v7`, por **tag de major**. São de primeira parte, mantidas pelo GitHub, e recebem patches sozinhas. `v7` é a major atual dos dois (research ponto 7, `v8` dá 404).
- **Regra para o futuro**: qualquer action de terceiros, de dono diferente de `actions/`, entra só por **SHA completo** com comentário de versão (`uses: dono/action@<sha-40>  # vX.Y.Z`). Uma tag pode ser movida pelo dono, e o SHA é a única referência imutável. A regra vai para o `CLAUDE.md`.
- Hoje não há action de terceiros.

### D5. Runner e timeout

- `runs-on: ubuntu-24.04` fixo, não `ubuntu-latest`. O `latest` troca de imagem quando o GitHub decide, mudando o sistema por baixo de um check obrigatório sem nenhuma mudança aqui. Fixar exige uma edição deliberada quando a 24.04 for aposentada.
- `timeout-minutes: 10` por job, uma trava bem acima do teto de investigação de 5 min (SC-005). O padrão do GitHub é 360 min.
- Sem retentativas: falha é falha.

### D6. Concorrência

```yaml
concurrency:
  group: ${{ github.workflow }}-${{ github.event_name == 'pull_request' && github.ref || github.sha }}
  cancel-in-progress: ${{ github.event_name == 'pull_request' }}
```

- Em PR, o grupo é por ref e um run novo cancela o anterior do mesmo PR, que ficou obsoleto.
- Em push na `main`, o grupo é por SHA: cada push tem o próprio grupo e sempre termina.
- **Motivo de não agrupar pushes por ref**: um grupo admite um run em execução e **um** pendente, e um pendente novo substitui o anterior mesmo com `cancel-in-progress: false`. Dois pushes rápidos na `main` poderiam deixar um commit sem resultado (API, research "Workflow hardening").

### D7. Passos de cada job

1. `actions/checkout@v7` com `persist-credentials: false`.
2. `actions/setup-node@v7` com `node-version-file: .nvmrc` e `cache: npm`. O cache guarda o cache global do npm, não o `node_modules`, com chave no hash do `package-lock.json` (FR-025, clarificação b).
3. `npm ci`.
4. Um único script: `npm run typecheck`, `npm run lint`, `npm test` (que roda o `pretest` antes) ou `npm run build`.

Não há bloco `env:` em lugar nenhum (FR-006). O `build` sem `.env` foi medido no relatório de estado de 2026-10-20: passa, porque as variáveis `VITE_*` só são lidas em runtime no navegador.

### D8. Versão do Node

- `.nvmrc` com `22` (clarificação a), lido pelo fnm e pelo `setup-node`. Só esse arquivo, nunca junto com `.node-version`, porque o fnm prefere o `.nvmrc` quando há os dois (API, research ponto 3).
- `"engines": { "node": ">=22.17" }` no `package.json` (Q2): é a primeira versão com `fs.globSync` estável, sem `ExperimentalWarning` (research ponto 2, medido: 22.16 avisa, 22.17 não).
- **T1 decidido (A)**: a flag `--experimental-strip-types` fica. Na 22.17 ela é obrigatória (sem ela, `ERR_UNKNOWN_FILE_EXTENSION`), e de 22.18 em diante é inócua (research ponto 1c).
- **T2 decidido (A)**: abaixo do mínimo, o npm só avisa (`EBADENGINE`, exit 0, medido). Não há `engine-strict` nem `.npmrc`.

### D9. Scripts do `package.json`

| Script | Valor | Motivo |
|---|---|---|
| `typecheck` | `tsc -b` | A primeira metade do `build`, sem gerar bundle. Escreve só `tsconfig.app.tsbuildinfo` e `tsconfig.node.tsbuildinfo` na raiz, já ignorados; nada em `src/`, nada no `git status` (research ponto 3). |
| `pretest` | `node --experimental-strip-types tools/assertTestFiles.ts` | O npm o roda sozinho antes do `npm test`, então a CI continua chamando um script só. |
| `test` | `node --experimental-strip-types --test \"src/**/*.test.ts\"` | Glob em **aspas duplas** escapadas: no cmd, aspas simples dão 0 testes com exit 0, e sem aspas o sh perde arquivos (research ponto 1a). |
| `lint`, `build` | inalterados | `build` mantém `tsc -b && vite build` (Q1). |

- **A guarda confere o script `test`** (decisão posterior à primeira rodada de implementação; FR-012 ampliado). Antes, ela só confirmava que existem arquivos de teste no disco, não que o runner os executou: com aspas simples no cmd, a guarda passava e o runner rodava zero testes com exit 0, e a regra "o script e a guarda usam o mesmo glob" era só um comentário. Agora a guarda lê o script `test` do `package.json` e reprova se ele não contém o `TEST_PATTERN` entre aspas duplas (aspas simples, sem aspas ou glob diferente). A conferência é a função pura `scriptUsesQuotedPattern` (D10). A CI no Linux continua sendo a segunda defesa: lá o sh trata aspas simples como aspas e os testes rodam de fato.
- `tsconfig.node.json` passa a incluir `tools` além de `vite.config.ts`, para a guarda entrar no `typecheck` (lib ES2023, tipos do `@types/node` já instalado). O `eslint .` já cobre `tools/**/*.ts`.
- O padrão `src/**/*.test.ts` aparece no script `test` e em `tools/testDiscovery.ts`. A guarda reprova se os dois divergirem (D10), no lugar do comentário que antes pedia que mudassem juntos.

### D10. Guarda de descoberta vazia (FR-012), decisão T3

Ajuste da dona do repositório: a filtragem de `node_modules` fica **dentro da função pura testada**, não como opção do `fs.globSync`. O research ponto 2 mostrou que é exatamente essa exclusão que muda o resultado (6 arquivos sem ela, 5 com ela), então é ela que precisa de teste.

- **`tools/testDiscovery.ts`** (puro, sem I/O):
  - `TEST_PATTERN = "src/**/*.test.ts"`;
  - `filterTestFiles(paths: string[]): string[]` descarta todo caminho com um segmento `node_modules`, aceitando `/` e `\`, porque o `globSync` devolve `\` no Windows. É a mesma regra do runner, que exclui qualquer entrada chamada `node_modules` (research ponto 2);
  - `checkDiscovery(files: string[])` devolve `{ exitCode, message }`: com zero arquivos, `1` e `nenhum arquivo de teste encontrado em src/**/*.test.ts`; com 1 arquivo, `0` e `1 arquivo de teste encontrado em ...` (singular); com N > 1, `0` e `N arquivos de teste encontrados em ...`;
  - `scriptUsesQuotedPattern(script: string, pattern: string): boolean` devolve `true` só se o script contém o padrão entre aspas duplas (`"<pattern>"`). Casos: aspas duplas passa; aspas simples reprova; sem aspas reprova; glob diferente reprova.
- **`tools/assertTestFiles.ts`** (casca de I/O): lê o script `test` do `package.json` e chama `scriptUsesQuotedPattern`; se reprovar, escreve a mensagem em português no stderr e sai com 1. Depois chama `fs.globSync(TEST_PATTERN)` sem `exclude`, passa a lista por `filterTestFiles` e `checkDiscovery`, escreve a mensagem (stderr na falha, stdout no sucesso, prefixo `[assertTestFiles]`) e sai com o `exitCode`.
- **`src/tooling/testDiscovery.test.ts`**: testa só as funções puras. Casos:
  - lista vazia reprova com a mensagem em português;
  - N arquivos passam com a contagem;
  - `src/node_modules/x/a.test.ts` e `src\node_modules\x\a.test.ts` são descartados;
  - nomes parecidos, como `src/node_modules_old/a.test.ts`, são mantidos;
  - 1 arquivo usa o singular;
  - os quatro casos de `scriptUsesQuotedPattern`, com strings (a leitura do `package.json` fica na casca, fora do teste, porque a constituição pede testes só de funções puras);
  - cada caso de `filterTestFiles` mistura um caminho mantido e um descartado, para que nem a lista sem filtrar nem a lista vazia passem.

  Escrito antes do módulo e rodado primeiro contra um esboço de `tools/testDiscovery.ts` que exporta os três nomes com resultados errados (`filterTestFiles` devolve a lista sem filtrar). Cada teste tem de falhar na própria asserção. Um `ERR_MODULE_NOT_FOUND` não serve como primeira falha: todos os testes do arquivo cairiam ao carregar, antes de qualquer asserção, e não daria para saber se algum passaria pelo motivo errado.
- A ligação com o disco (o `globSync` de verdade) é verificada pelos runs manuais da fase 1 e pela contagem no primeiro run do Linux, não por teste unitário.

### D11. Documentação

Regra da dona do repositório: README e `CLAUDE.md` mudam **no mesmo commit que torna falsas as afirmações antigas**, e não ficam números que desatualizam. O que é só conteúdo novo vai num commit `docs:` próprio.

| Commit que muda o comportamento | Afirmações antigas corrigidas no mesmo commit |
|---|---|
| Node fixado (`.nvmrc`, `engines`) | README "Requirements: Node.js ≥ 22.6" e `CLAUDE.md` Stack "(Node ≥ 22.6)" passam a 22.17. O `CLAUDE.md` acrescenta que a versão vem do `.nvmrc`. |
| Script `typecheck` | README "Scripts and tests" e `CLAUDE.md` Commands ganham `npm run typecheck`. |
| Glob no script `test` | README tira "16 tests"; `CLAUDE.md` Commands deixa de dizer `<files listed in package.json>`; Conventions troca "Every new test file must be added by hand to the `test` script" pela descoberta automática; a constituição troca "each test file is listed in the `test` script" pela descoberta automática (emenda parcial, D12). |
| Guarda (`pretest`) | README e `CLAUDE.md` dizem que `npm test` roda antes a guarda de descoberta vazia. |

Conteúdo novo, no commit `docs:` da fase 3:
- **README**:
  - selo `https://github.com/AnaLauraFFerraz/Telemetry-F1/actions/workflows/ci.yml/badge.svg?branch=main`, linkado para a página do workflow (FR-020, FR-021);
  - seção "CI and branch protection": os quatro checks e seus scripts; o aviso de que um erro de tipos reprova `typecheck` e `build`; a regra dos nomes como contrato (D2);
  - os passos do ruleset (FR-017): Settings → Rules → Rulesets, Enforcement **Active**, bypass vazio, alvo `main`, Restrict deletions, Require linear history, Block force pushes, Require a pull request com 0 aprovações, Require status checks com "Require branches to be up to date" e os quatro checks de origem GitHub Actions, o botão **Create**, e nas configurações gerais só "Allow rebase merging" e "Automatically delete head branches";
  - o procedimento de último recurso por inteiro (FR-018): se o GitHub Actions estiver fora do ar, esperar primeiro; só se continuar fora, pôr o **Enforcement status** do ruleset deste repositório em **Disabled**, mergear, voltar para **Active** na hora e registrar o motivo no PR;
  - em Known limitations, a armadilha das aspas: o glob do script `test` usa aspas duplas escapadas; com aspas simples, o cmd roda zero testes e sai com 0; a guarda `pretest` reprova o script antes disso, e a CI no Linux é a segunda defesa.
- **`CLAUDE.md`**:
  - a mesma armadilha nos Known pitfalls, que o arquivo exige espelhados no README;
  - Rules: os nomes dos checks são contrato (D2); actions de terceiros só por SHA (D4);
  - **nota de divergência temporária com a constituição**, até a emenda da fase 5: (a) a constituição ainda diz Node ≥ 22.6, e o projeto exige ≥ 22.17; (b) ela não põe o `typecheck` nos gates de commit nem a CI como portão de merge. A regra da lista de testes não entra na nota, porque já foi emendada (D12). A lista de tipos de commit **não** muda (`ci:` espera a emenda).

### D12. Emenda parcial da constituição (decisão do `/speckit-analyze`, achado C1)

- A regra "each test file is listed in the `test` script" é emendada **no mesmo commit** que troca a lista pelo glob (`test: discover test files with a quoted glob`), junto com o `CLAUDE.md`. Assim nenhum commit da feature deixa a constituição contrariando o código.
- A emenda usa o `/speckit-constitution` naquele momento da implementação:
  - a versão é proposta pela regra de versionamento da própria constituição (MAJOR, MINOR ou PATCH), com o motivo da escolha;
  - o Sync Impact Report **não** fica no arquivo da constituição: vai no corpo do commit da emenda e na descrição do PR da feature. Motivo: a constituição descreve as regras atuais, e o histórico da mudança fica no git; o `/speckit-constitution` trata o relatório como material temporário de revisão;
  - **a proposta é mostrada à dona do repositório antes de ser aplicada**.
- A Governança pede que emendas passem por um PR que diga o motivo: o corpo do PR da feature registra a emenda parcial, o motivo e o Sync Impact Report.
- O resto da emenda continua no PR separado da fase 5.

## Trade-offs decididos

Decididos pela dona do repositório em 2026-10-20:

- **T1 (A)**: mínimo 22.17 e flag `--experimental-strip-types` mantida (D8).
- **T2 (A)**: só o aviso do `engines`, sem `engine-strict` (D8).
- **T3 (A, com ajuste)**: função pura testada, com a filtragem de `node_modules` dentro dela; a casca de I/O só chama o `globSync` e repassa (D10).
- **T4 (A)**: a demonstração do `build` usa um import de CSS Module com a caixa trocada (fase 4). **A checagem local no Windows passa** (`typecheck`, `lint`, `test` e até `build`, research ponto 4) **e só a CI no Linux reprova: esse é o objetivo da demonstração**, provar que a CI pega o que o Windows não pega. Se o Linux não reprovar, isso é um achado: é registrado e a demonstração cai para um CSS inexistente.

## Order of work

Cada fase termina com a própria verificação antes da próxima. Os commits são atômicos, em Conventional Commits, **sem `Co-Authored-By`**. Antes de cada commit rodam `npm test`, `npm run lint` e `npm run build`, e, depois que o script existir, também `npm run typecheck`. Push, abertura de PR, exclusão de branch remota e merge param para aprovação; o merge é sempre da dona do repositório.

### Fase 0 — artefatos SDD

- spec (já commitada), plan, research, quickstart e tasks, como `docs:`, antes de qualquer implementação.

### Fase 1 — scripts locais e guarda (US2, US3)

Commits, nesta ordem, cada um com as correções de documentação do D11:
1. `.nvmrc` com `22` e `engines.node` `>=22.17`.
2. Script `typecheck`.
3. Script `test` com o glob entre aspas duplas, com a emenda parcial da constituição no mesmo commit (D12; proposta mostrada antes de aplicar).
4. Guarda: o teste da função pura primeiro, falhando na própria asserção contra um esboço errado (D10); depois `tools/testDiscovery.ts`, `tools/assertTestFiles.ts`, o `pretest` e `tools` no `tsconfig.node.json`.

Verificação no Windows, registrada no research.md:
- `npm run typecheck` exit 0, e exit 2 com um erro injetado em `src/` e em `tools/` (revertidos);
- `npm test` imprime a contagem da guarda e passa;
- um `*.test.ts` temporário numa pasta nova de `src/` entra sem editar script (revertido);
- um `*.test.ts` temporário com erro de sintaxe reprova o script, em vez de ser ignorado (removido depois);
- com o padrão temporariamente apontado para uma pasta vazia, `npm test` sai com código diferente de zero e com a mensagem da guarda (revertido);
- mesmos nomes de teste no cmd e no sh (`--script-shell`);
- `git status` limpo depois do `typecheck`;
- lista ordenada dos arquivos de teste executados, para o SC-004.

A dona do repositório confere `fnm use` no próprio terminal: deve resolver para uma 22.x.

### Fase 2 — workflow numa branch com PR (US1)

1. `.github/workflows/ci.yml` conforme D1–D7, commitado como `chore:`.
2. Push da branch e abertura do PR, cada um com aprovação explícita.
3. No primeiro run, registrar no research.md:
   - resultado e duração dos quatro jobs (SC-005; acima de 5 min, investigar e registrar causa e ação);
   - Node resolvido no runner;
   - contagem da guarda e nomes dos testes, comparados com a lista do Windows (SC-004);
   - cache: *miss* no primeiro run, *hit* num re-run com o lockfile inalterado.
4. Falha só no Linux: registrar causa e correção no research.md. Nada de pular check.

### Fase 3 — documentação nova (US4 doc, US5)

1. O commit `docs:` com o conteúdo novo do D11.
2. Conferir que nenhum número que desatualiza ficou no README (FR-021) e que nada descreve algo que não existe.
3. O PR fica verde e a dona do repositório mergeia com **Rebase and merge**, mesmo antes do ruleset, para manter a `main` linear.
4. Registrar o run do push na `main` depois do merge (FR-002).

### Fase 4 — proteção, pela dona do repositório, depois do merge (US4)

1. A dona do repositório cria o ruleset e ajusta os métodos de merge seguindo o README. Diferenças entre o README e a interface do GitHub são anotadas e corrigidas no PR de evidência.
2. **Conferência pela API do GitHub**, registrada no research.md:
   - `GET /repos/AnaLauraFFerraz/Telemetry-F1/rulesets` e `/rulesets/{id}`: `enforcement: active`, `bypass_actors: []`, `current_user_can_bypass: "never"`, alvo `~DEFAULT_BRANCH`;
   - `GET /rules/branches/main`: `deletion`, `non_fast_forward`, `required_linear_history`, `pull_request` com `required_approving_review_count: 0`, `required_status_checks` com `strict_required_status_checks_policy: true` e os contextos `typecheck`, `lint`, `test` e `build`;
   - configurações do repositório: `allow_merge_commit: false`, `allow_squash_merge: false`, `allow_rebase_merge: true`, `delete_branch_on_merge: true`;
   - `gh secret list` e `gh variable list` com saída vazia (SC-007).
   - **Push forçado e exclusão da `main` são provados por esta conferência, não por tentativa** (SC-006): o GitHub nunca permite apagar a branch padrão, então uma exclusão recusada não provaria a regra; e um push forçado aceito por engano reescreveria histórico publicado.
3. **PRs de demonstração**, a partir da `main` atualizada, um por gate isolável. Cada um passa localmente antes do push na forma esperada, é fechado **sem merge** e tem a branch apagada local e remotamente:

   | PR | Mudança | Checagem local (Windows) | Checks esperados na CI |
   |---|---|---|---|
   | lint | um `any` explícito numa função usada (`@typescript-eslint/no-explicit-any`; passa no `tsc`) | só `lint` falha | só `lint` ✗ |
   | test | uma asserção errada num teste existente | só `test` falha | só `test` ✗ |
   | typecheck | um erro de tipos num módulo que nenhum teste carrega | `typecheck` e `build` falham | `typecheck` ✗ **e** `build` ✗ |
   | build | import de CSS Module com a caixa trocada (T4) | **tudo passa** | só `build` ✗ |

   - **Por que não há PR só de `typecheck`**: o `build` mantém `tsc -b` (Q1), então todo erro de tipos reprova os dois. É o comportamento esperado e documentado, não um defeito do isolamento.
   - **PR de `build`**: passar localmente é o objetivo. A demonstração prova que a CI no Linux reprova o que o Windows aceita (T4).
   - Em cada PR, um print da tentativa de merge bloqueada vai para `specs/001-ci-github-actions/evidence/`. O print mostra a lista de checks com o check reprovado identificável, os quatro como **Required** e o botão de merge desabilitado.
   - Registrar também o `mergeStateStatus` via `gh pr view`.
   - **No primeiro PR (lint)**, consultar o `mergeStateStatus` enquanto os checks ainda rodam e registrar o bloqueio por check pendente (US4 cenário 1). A exigência de branch atualizada (cenário 3) fica conferida pela configuração (`strict_required_status_checks_policy: true`).
   - **Num PR de demonstração**, abrir o selo com `?branch=` apontando para a branch da demonstração e registrar o estado reprovado (US5 cenário 2).
4. **Push direto recusado**: de uma branch descartável `tmp/direct-push` criada de `origin/main`, sem tocar na `main` local, com um commit vazio (`git commit --allow-empty`, mensagem em inglês), `git push origin HEAD:main` tem de ser recusado com `GH013`, mesmo para a administradora. Depois, `git ls-remote --heads origin` confirma a `main` remota inalterada.
   - **Contingência**: se o push for aceito, parar, registrar no research.md, corrigir o ruleset e avisar a dona do repositório. O commit vazio fica na `main` como exceção documentada, sem reescrever histórico.
5. **Não refeito aqui**: que um PR roda a própria versão do workflow já foi provado na API (T033, PR #6, run 39473001785) e é citado como origem (research ponto 9).
6. Um PR `docs:` com a evidência (research.md, prints, marcações em tasks.md e o Status da spec) é o primeiro merge pela regra nova, e o próprio merge serve de prova de que um PR verde e atualizado entra.
   - O `/speckit-converge` roda na branch desse PR **antes do push**, para que os achados aprovados entrem no mesmo PR. O Status da spec só muda para `Implemented` depois do converge.
   - Esse PR não pode registrar o próprio merge. O registro do merge permitido (número do PR e hora do merge, `mergedAt`, conferidos pela API do GitHub) vai no PR seguinte, o da emenda da constituição (fase 5).

### Fase 5 — fora desta feature, listada para não esquecer

PR separado de **emenda da constituição do front**, depois que a CI funcionar, com:
- a CI (`typecheck`, `lint`, `test`, `build`) como portão de merge da `main`;
- o `typecheck` nos gates antes de cada commit, junto de `test`, `lint` e `build`;
- o mínimo Node.js ≥ 22.17;
- o tipo de commit `ci:` na lista de Conventional Commits;
- o esclarecimento de que "in separate commits", no fluxo SDD, quer dizer separados da implementação: commits de correção podem tocar mais de um artefato (spec, plan, tasks).

A emenda completa segue a mesma regra do D12: o Sync Impact Report vai no corpo do commit e na descrição do PR da emenda, não no arquivo da constituição.

O fim da lista manual de testes não está nesta lista: entra antes, na emenda parcial do D12.

O `CLAUDE.md` perde a nota de divergência e passa a listar `ci:` no mesmo PR.

O mesmo PR leva, no `research.md` desta spec, o registro do merge do PR de evidência da fase 4: número do PR e `mergedAt`, conferidos pela API do GitHub, com as marcações `[x]` das tarefas desse merge.

## Artefatos que não se aplicam

- **data-model.md**: não se aplica. A feature não cria nem altera dados persistidos ou trafegados. As "entidades" da spec (workflow, check, ruleset, fonte da versão, selo) são configuração, descritas no D1–D11.
- **contracts/**: não se aplica como pasta. O único contrato externo são os nomes dos checks e do arquivo do workflow (D2), que ficam documentados no README e no `CLAUDE.md`. O contrato REST/WebSocket pertence à API e não muda.

## Project Structure

### Documentation (this feature)

```text
specs/001-ci-github-actions/
├── spec.md
├── plan.md              # este arquivo
├── research.md          # Phase 0, com a seção de evidência pós-implementação
├── quickstart.md        # roteiro de validação
├── checklists/
│   └── requirements.md
├── evidence/            # prints da fase 4 (criada na implementação)
└── tasks.md             # /speckit-tasks
```

### Source Code (repository root)

```text
.github/
└── workflows/
    └── ci.yml                      # novo: 4 jobs (D1–D7)
.nvmrc                              # novo: "22"
.specify/
└── memory/
    └── constitution.md             # emenda parcial: regra da lista de testes (D12)
package.json                        # engines, typecheck, pretest, test
tsconfig.node.json                  # include: vite.config.ts + tools
tools/
├── testDiscovery.ts                # novo: funções puras (padrão, filtro de node_modules, veredito)
└── assertTestFiles.ts              # novo: casca de I/O (globSync + exit), rodada no pretest
src/
└── tooling/
    └── testDiscovery.test.ts       # novo: testa só as funções puras
README.md                           # Node, scripts, selo, CI e proteção, armadilha das aspas
CLAUDE.md                           # Stack, comandos, convenções, regras, pitfall, nota de divergência
```

**Structure Decision**: projeto único. A guarda fica em `tools/`, fora do bundle: o app não a importa e o Vite só empacota o que `index.html` alcança. O teste dela fica em `src/tooling/` porque a descoberta só olha `src/` (FR-010).

## Complexity Tracking

Nenhuma violação fica em aberto. A única regra que a feature contrariaria, "each test file is listed in the `test` script", é emendada no mesmo commit que remove a lista (D12).

| Mudança | Why Needed | Simpler Alternative Rejected Because |
|---|---|---|
| Emenda parcial da constituição dentro da feature (só a regra da lista de testes) | FR-010: hoje um teste fora da lista nunca roda, e a CI daria falsa sensação de cobertura. Sem a emenda no mesmo commit, a constituição contrariaria o código e o `CLAUDE.md` até o PR da fase 5. | (1) Manter a lista e checá-la contra o disco: é outra lista para manter e outra guarda; a spec pede descoberta pelo próprio Node. (2) Deixar a divergência registrada até a emenda separada: algum commit ficaria contrariando a constituição, o que o `/speckit-analyze` aponta como crítico. (3) Fazer a emenda inteira agora: o resto depende de a CI já funcionar na `main`. |
