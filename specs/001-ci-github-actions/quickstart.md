# Quickstart: validar a CI do front

Roteiro para provar a feature de ponta a ponta. As decisões estão em [plan.md](plan.md) e a evidência em [research.md](research.md); aqui só há comandos e resultados esperados.

## Pré-requisitos

- Node 22 via fnm. Na raiz do repositório, `fnm use` resolve o `.nvmrc` (`22`) para uma 22.x ≥ 22.17.
- Git Bash e cmd disponíveis (Windows), `gh` autenticado para os passos no GitHub.
- Nenhum `.env` e nenhuma API rodando são necessários para nada deste roteiro.

## 1. Checkout limpo (US1, US3)

Num `git worktree` descartável, fora do repositório, sem `.env` e sem `node_modules`:

```bash
npm ci
npm run typecheck
npm run lint
npm test
npm run build
git status --short     # vazio: os .tsbuildinfo e o dist/ são ignorados
```

**Esperado**:
- os quatro scripts saem com 0;
- `npm test` imprime primeiro a contagem da guarda (`[assertTestFiles] N arquivos de teste encontrados em src/**/*.test.ts`) e depois `# fail 0`;
- `npm run typecheck` não cria `dist/`.

## 2. Descoberta de testes (US2)

| Ação (temporária, revertida depois) | Esperado |
|---|---|
| Criar `src/tmpcheck/probe.test.ts` com um teste que falha | `npm test` executa o arquivo e falha, sem editar o `package.json` |
| Criar `src/tmpcheck/syntax.test.ts` com erro de sintaxe | `npm test` falha, em vez de ignorar o arquivo |
| Apontar o padrão da guarda e do script para uma pasta vazia | `npm test` sai ≠ 0 com `nenhum arquivo de teste encontrado`, e nenhum teste roda |
| Trocar as aspas duplas do glob no script `test` do `package.json` por aspas simples | `npm test` sai ≠ 0 no `pretest` com `[assertTestFiles] o script test do package.json precisa conter "src/**/*.test.ts" entre aspas duplas`, e nenhum teste roda; reverter com `git checkout -- package.json` |
| `npm test` no cmd e com `npm run --script-shell="<Git>/usr/bin/sh.exe" test` | mesma contagem e mesmos nomes de teste |

## 3. Versão do Node (US3)

```bash
fnm use                      # na raiz: "Using Node v22.x"
node -p "require('./package.json').engines.node"   # >=22.17
```

Abaixo do mínimo, `npm ci` imprime `npm warn EBADENGINE` e continua (exit 0); não há `engine-strict` (T2-A).

## 4. CI no PR (US1)

Abrir o PR da feature para a `main`.

**Esperado**:
- quatro checks, `typecheck`, `lint`, `test` e `build`, todos ✓;
- em cada job, o Node resolvido é 22.x;
- o run termina em até 5 min (a referência é a primeira execução verde depois de qualquer correção);
- num re-run com o lockfile inalterado, o log do setup-node diz `Cache restored successfully`.

## 5. Proteção e demonstrações (US4), depois do merge e do ruleset

```bash
gh api repos/AnaLauraFFerraz/Telemetry-F1/rulesets
gh api repos/AnaLauraFFerraz/Telemetry-F1/rulesets/<id>
gh api repos/AnaLauraFFerraz/Telemetry-F1/rules/branches/main
gh repo view AnaLauraFFerraz/Telemetry-F1 --json mergeCommitAllowed,squashMergeAllowed,rebaseMergeAllowed,deleteBranchOnMerge
gh secret list
gh variable list
```

**Esperado**:
- ruleset ativo com `bypass_actors: []`;
- regras `deletion`, `non_fast_forward`, `required_linear_history` e `pull_request` (0 aprovações);
- `required_status_checks` com `strict_required_status_checks_policy: true` e os quatro contextos;
- só rebase permitido e exclusão automática de branches ligada;
- nenhum segredo e nenhuma variável (saídas de `gh secret list` e `gh variable list` vazias).

Push forçado e exclusão da `main` são provados pelas regras `non_fast_forward` e `deletion` acima, sem tentativa: o GitHub nunca permite apagar a branch padrão, então uma exclusão recusada não provaria a regra, e um push forçado aceito por engano reescreveria histórico publicado.

PRs de demonstração, conforme a tabela da fase 4 do plano. Em cada um:
- só o check esperado fica ✗ (no de tipos, `typecheck` e `build`);
- o merge fica bloqueado (`mergeStateStatus: BLOCKED`);
- o print vai para `evidence/`;
- o PR é fechado sem merge e a branch é apagada.

No primeiro PR (lint):
- com os checks ainda rodando, `mergeStateStatus` já é `BLOCKED` (check pendente);
- o selo `.../ci.yml/badge.svg?branch=demo%2Flint-failure` (a barra codificada como `%2F`; ou com `&event=pull_request`) mostra reprovado.

Push direto:

```bash
git switch -c tmp/direct-push origin/main
git commit --allow-empty -m "chore: test direct push to main (must be rejected)"
git push origin HEAD:main      # esperado: GH013, "push declined due to repository rule violations"
git ls-remote --heads origin   # main inalterada
git switch - && git branch -D tmp/direct-push
```

Se o push for aceito: parar, registrar no research.md, corrigir o ruleset e avisar a mantenedora. O commit vazio fica na `main` como exceção documentada, sem reescrever histórico.

## 6. README (US5)

O selo aparece na página do repositório e reflete o último run na `main`. Nenhuma contagem de testes ou percentual no README.
