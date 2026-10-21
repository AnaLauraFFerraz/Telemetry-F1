# Quickstart: validar a triagem do npm audit

Roteiro para provar, em cada fase e no fim, que a feature cumpre a [spec](spec.md). As decisões estão no [plano](plan.md), e a evidência e os métodos, no [research](research.md). Todos os comandos rodam na raiz do front, salvo indicação.

## Pré-requisitos

- Node do `.nvmrc` (major 22, ≥ 22.17) no `PATH`, via fnm.
- Checkout limpo do estado a validar (`git status` vazio), depois de `npm ci`.
- Um `.env` do front com `VITE_WS_URL=ws://localhost:8080` e `VITE_HTTP_API_URL=http://localhost:3001`, valores do `.env.example`. No worktree da `main` (`C:\Telemetry\wt-002-main`), o `.env` precisa ser criado, porque é ignorado pelo git.
- Para as partes 3 e 6: a API rodando pelo procedimento do research, ponto 6, que é tarefa da mantenedora ou de uma sessão do Claude Code no repositório da API.

## Parte 1: auditoria (FR-001, FR-002, FR-003)

```bash
npm audit
npm audit --omit=dev
```

| Ao fim de | `npm audit` esperado | `--omit=dev` esperado |
|---|---|---|
| Fase 1 | 5 (4 moderadas, 1 alta): `react-router`, `react-router-dom`, `vite`, `esbuild`, `@vitejs/plugin-react-swc` | 2 moderadas (React Router) |
| Fase 2 | 3 (2 moderadas, 1 alta): só a cadeia do Vite | `found 0 vulnerabilities` |
| Fase 3 | `found 0 vulnerabilities` | `found 0 vulnerabilities` |

- Registrar a saída e a data no `research.md`.
- Um advisory novo publicado depois de 2026-10-21 é registrado como diferença, com justificativa se ficar (FR-002).

## Parte 2: os quatro checks (FR-005, SC-003)

```bash
npm run typecheck && npm test && npm run lint && npm run build
```

- Os quatro saem com 0.
- `npm test` mostra a contagem da guarda e `# fail 0`.
- `eslint .` não imprime nenhum aviso.
- Depois do push da fase, os quatro checks do PR (`typecheck`, `lint`, `test`, `build`) ficam verdes. Registrar no `research.md` o id da execução (`gh run list --branch 002-npm-audit-triage --limit 1`), o SHA e o resultado de cada job. **Só depois, e só com a CI verde, começa a fase seguinte**, porque um push novo cancela a execução em andamento.
- **CI vermelha** (plano, D5):
  - falha vinda do código: commit de correção com push próprio, aprovado pela mantenedora, e nova espera. Nunca re-run;
  - falha de infraestrutura (runner, rede, timeout de download): `gh run rerun <id> --failed`, com o motivo e o id das duas execuções registrados.

## Parte 3: navegação sem mudança de comportamento (FR-009)

Rodar no build de produção servido localmente (`npm run build && npm run preview`, em `http://localhost:4173`) ao fim das Fases 2 e 3, e na `main` como referência:

| # | Ação | Esperado |
|---|---|---|
| 1 | Abrir `/` | Dashboard ao vivo. |
| 2 | Clicar no link para o histórico | URL `/sessions`, com a tabela de sessões. |
| 3 | Clicar numa linha da tabela; repetir com Enter e com Espaço numa linha focada | URL `/sessions/<id>`, com a página de análise. |
| 4 | Clicar no botão de voltar da análise | URL `/sessions`. |
| 5 | Ir a `/settings` pelo link do dashboard e voltar pelo link para `/` | As rotas certas. |
| 6 | Abrir `/sessions/<id>` diretamente na barra de endereço (recarga completa) | A análise carrega (o preview serve o `index.html` para rotas do SPA). |
| 7 | Abrir `/sessions/999999` | O mesmo estado de erro de sessão inexistente da `main`. |
| 8 | Abrir `/rota-inexistente` e clicar no link de volta | A página de rota inexistente, e depois `/`. |
| 9 | Usar o voltar e o avançar do navegador entre 1–5 | O histórico do navegador se comporta como na `main`. |

## Parte 4: bundle e navegadores-alvo (FR-012, FR-015, SC-004, SC-008)

Toda medição de bundle é feita num **worktree novo do commit medido**, fora do repositório, porque o checkout da branch tem fins de linha mistos e o total muda conforme os arquivos são editados (research, ponto 7):

```bash
git worktree add --detach C:\Telemetry\wt-002-<fase> <sha>   # o .env do front é criado no worktree
npm ci && npm run build
node <ferramentas>/bundleSizes.mjs dist   # tabela: arquivo, bruto, gzip -9, brotli 11
git -C C:\Telemetry\wt-002-<fase> status --porcelain         # mostrar e registrar: só dist/, node_modules/ e .env
git worktree remove C:\Telemetry\wt-002-<fase>              # depois da medição; --force só depois de mostrar o status acima
```

- `<ferramentas>` é `specs/002-npm-audit-triage/evidence/tools` (T5). Cada ferramenta diz no comentário do topo como rodar.
- **Comparar por papel** (`index.html`, `.js` de entrada, `.css`) com a medição do worktree da `main` (223.869 B), a referência do SC-004. Arquivo novo ou faltante é diferença a explicar. Variação do total acima de 10% exige explicação, mas não reprova.
- **Navegadores-alvo efetivos**:
  - Vite 5: `ESBUILD_MODULES_TARGET` em `node_modules/vite/dist/node/constants.js`.
  - Vite 8: o padrão `'baseline-widely-available'` = `chrome111, edge111, firefox114, safari16.4, ios16.4` (`vite.dev/config/build-options`), conferido também na ajuda da CLI (`npx vite build --help`, linha `--target`).

## Parte 5: endereço de escuta do servidor de desenvolvimento (FR-013a)

```bash
node <ferramentas>/devListen.mjs 5191
```

- Sobe `vite` sem `--host`, imprime a saída e os sockets em LISTEN da porta e encerra.
- **Esperado**, antes e depois: só `[::1]:<porta>` em LISTEN, sem `0.0.0.0` nem `[::]`, e a linha `Network: use --host to expose`.
- Na Fase 3, roda com o Vite novo já instalado e antes do commit da troca. Se mudar, a limitação conhecida é atualizada no `CLAUDE.md` e no `README.md` nesse mesmo commit (FR-022, plano D6).

## Parte 6: conferência visual (FR-016, FR-016a, FR-016b, FR-016c, SC-005)

**Preparação, pela mantenedora ou pela sessão da API** (research ponto 6, plano D8). Nada disso roda nesta sessão:
1. Cópia mestra feita com `VACUUM INTO` em `C:\Telemetry\snapshots-002\`, fora dos dois repositórios, e `api-conferencia.env` na mesma pasta: cópia do `.env.example` da API só com as portas, sem a linha da chave.
2. A cada rodada, cópia de trabalho nova a partir da mestra (`telemetry-run.db`). O `Copy-Item` sobrescreve um arquivo existente, e o banco da API usa `journal_mode = WAL`: um `telemetry-run.db-wal` que sobrou de uma rodada interrompida seria aplicado sobre a cópia nova. Por isso, antes da cópia, `Test-Path C:\Telemetry\snapshots-002\telemetry-run.db*` **tem de dar `False`**. No fim da rodada, com a API parada, apagam-se os três arquivos, com caminhos explícitos: `telemetry-run.db`, `telemetry-run.db-wal` e `telemetry-run.db-shm`.
3. No terminal da API, definir `DOTENV_CONFIG_PATH` para o `api-conferencia.env` e `DB_PATH` para o `telemetry-run.db`. Atribuir string vazia à `ANTHROPIC_API_KEY` **não** é proteção: o `cmd` e o Windows PowerShell 5.1 removem a variável.
4. **Conferência sem custo**, no mesmo terminal e no diretório da API:

   ```bash
   node -e "require('dotenv/config'); console.log(Boolean(process.env.ANTHROPIC_API_KEY))"
   ```

   - Carrega o ambiente como a API carrega e imprime só `true` ou `false`, nunca o valor.
   - **Só se segue com `false`.**
5. `npm run dev` na API e o log `[db] usando banco em …` conferido, apontando para a cópia.
6. **O replay não começa junto com a API.** A sessão do front faz o build, o `preview` e o roteiro de navegação e avisa "inicie o replay". Só então a mantenedora inicia, num segundo terminal, com o mesmo `DOTENV_CONFIG_PATH`, `npm run replay -- recordings/demo-interlagos-tt-20hz-laps6-8.jsonl` (1x, cerca de 3 min 43 s) e confirma. As capturas só rodam depois dessa confirmação, e o dashboard é o primeiro estado.
7. A mantenedora informa a esta sessão o `false`, o id da sessão escolhida (na `main`, a sessão 1, com a volta 3 como principal), a volta de comparação com análise em cache (2) e a volta sem cache (1).

O limite de gastos no Console da Anthropic é rede de segurança, não proteção. Não há tentativa "para ver se dá 503" antes do `false`.

**Lista fixa**, com o mesmo viewport nas duas rodadas (por exemplo 1440×900):

| # | Estado | Como chegar | Arquivo |
|---|---|---|---|
| 1 | Dashboard ao vivo | `/`, durante o replay, num ponto fixo do roteiro | `NN-1-dashboard.png` |
| 2 | Histórico de sessões | `/sessions` | `NN-2-historico.png` |
| 3 | Análise com gráficos e mapa | `/sessions/<id da sessão escolhida>`, com a volta de comparação escolhida | `NN-3-analise.png` |
| 4 | Coach com análise em cache | Na análise, com o par em cache, clicar em analisar | `NN-4-coach-cache.png` |
| 5 | Coach indisponível | Na mesma sessão, com a volta de comparação sem cache, clicar em analisar: a resposta tem de ser 503 | `NN-5-coach-503.png` |
| 6 | Configurações | `/settings` | `NN-6-configuracoes.png` |

- `NN` é `antes`, `depois` ou `depois-vite73`.
- As capturas são feitas com `evidence/tools/captureStates.mjs`, com a versão do Playwright registrada no `research.md` e instalada fora dos repositórios (por exemplo, em `C:\Telemetry\playwright-002\`), com aprovação da mantenedora.
- O Chromium fica dentro da mesma pasta do Playwright: a instalação roda com `PLAYWRIGHT_BROWSERS_PATH=<pasta>\browsers`, e a mesma variável precisa estar definida quando o `captureStates.mjs` roda (sem ela o script sai com mensagem clara). A pasta inteira é apagada pela mantenedora depois do merge.
- O diretório do Playwright entra por argumento (`--playwright-dir`) ou pela variável `PLAYWRIGHT_DIR`, como diz o comentário do topo do script. Sem ele, o script sai com uma mensagem clara, sem tentar resolver o Playwright de dentro do repositório. Nada é instalado no repositório.
- **Revisão antes do commit**: cada imagem é olhada em busca de dado pessoal vindo do jogo ou da API (nome de jogador, de piloto, de conta ou de máquina), e o tamanho total é somado e registrado (referência: até 5 MB na feature inteira). Com um achado, nada é commitado, e a mantenedora decide entre não commitar as imagens, deixando só a comparação no `research.md`, ou outra saída.
- As capturas aprovadas ficam em `specs/002-npm-audit-triage/evidence/`.
- **Comparação**, anotada no `research.md` por estado: layout, cores, tipografia, eixos, legendas e traçado dos gráficos SVG, mapa da pista, painel do coach e estilos dos CSS Modules. Os valores ao vivo e os horários não entram.
- Toda diferença de layout ou estilo tem explicação. Se a correção exigir mudar código da aplicação, vale a regra de recuo para o Vite 7.3 (plano, D7).

## Parte 7: CI e Dependabot (FR-017, FR-018, SC-006)

```bash
git diff main -- .github/workflows/ci.yml        # vazio
gh api repos/AnaLauraFFerraz/Telemetry-F1/vulnerability-alerts -i | head -1   # HTTP/2.0 204 quando ligado
```

- O `ci.yml` não muda: os mesmos 4 jobs e nenhum passo de auditoria.
- O `README.md` (seção de CI) e o `CLAUDE.md` (Rules) dizem que não há gate de `npm audit` na CI, em qualquer caso.
- Os alertas do Dependabot são ligados pela mantenedora. Os dois arquivos só dizem que os avisos chegam por eles depois do 204 conferido; sem o 204, não os citam.

## Parte 8: contrato e testes intactos (FR-019, SC-007)

```bash
git diff main --stat -- src/types/          # vazio
git diff main --stat -- 'src/**/*.test.ts'  # vazio
```

O diff de `src/` contra a `main` mostra só:
- a linha de import nos 6 arquivos do roteador e das páginas;
- a prop `future` adicionada e depois removida em `src/router/router.tsx` (sem efeito líquido).
