# Implementation Plan: Triagem e correção das vulnerabilidades do npm audit

**Branch**: `002-npm-audit-triage` | **Date**: 2026-10-21 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/002-npm-audit-triage/spec.md`

## Summary

A árvore de dependências do front sai de 27 vulnerabilidades (3 em produção) para zero, em três fases verificadas uma a uma, num único PR:
1. correções dentro das faixas atuais, mais o ESLint 9.39;
2. React Router 7, pelo caminho oficial (flags da v6, depois o pacote `react-router`);
3. Vite 8 com o `@vitejs/plugin-react-swc` 4.

O comportamento da aplicação e o contrato com a API não mudam. A única mudança de código de aplicação prevista é a linha de import do roteador em 6 arquivos, mais a remoção da prop `future` do `<BrowserRouter>`.

Antes de qualquer troca, há duas coisas:
- **a emenda da constituição** tira os números de major das bibliotecas;
- **as medições do "antes" na `main`**: capturas de tela, bundle, navegadores-alvo e endereço de escuta.

Depois do Vite 8, as capturas se repetem e são comparadas.

As três fases foram simuladas num worktree descartável ([research.md](research.md)): cada uma passa nos quatro scripts da CI, e o resultado final é `npm audit` com 0 vulnerabilidades, também com `--omit=dev`.

## Technical Context

**Language/Version**: TypeScript 5.6 (`strict`, instalado 5.6.3; fica em `~5.6.2`). Node.js major 22 em `.nvmrc`, mínimo `>=22.17` em `engines.node`, sem mudança.

**Primary Dependencies**: nenhuma nova. A coluna "Alvo" diz a faixa. A versão exata de cada pacote é a mais recente dessa faixa publicada antes do corte da fase (D11), e os números entre parênteses vêm da simulação de 2026-10-21, sem corte:

| Pacote | De | Alvo (simulação) |
|---|---|---|
| `react-router-dom` | `^6.27.0` (6.27.0) | trocado por `react-router` 7.x (7.18.4) |
| `vite` | `^5.4.9` (5.4.10) | 8.x (8.3.4) |
| `@vitejs/plugin-react-swc` | `^3.5.0` (3.7.1) | 4.x (4.3.3) |
| `eslint` e `@eslint/js` | `^9.13.0` (9.13.0) | piso `^9.39.x` no `package.json` (9.39.5), por T1 |
| `typescript-eslint` | `^8.10.0` (8.12.2) | mesma faixa, pelo lockfile (8.72.0) |
| `vite-tsconfig-paths` | `^5.0.1` (5.0.1) | removido, por T3 (D7.2) |

Transitivas mudam pelo `npm audit fix` (research, ponto 4).

**Storage**: não se aplica ao front. A conferência visual usa uma cópia do banco da API, fora dos dois repositórios (research, ponto 6).

**Testing**: `npm test` sem mudança (27 testes de funções puras hoje). A feature não cria lógica nova no projeto. A verificação de comportamento é por roteiro de navegação e capturas ([quickstart.md](quickstart.md)).

**Target Platform**:
- Navegadores: `build.target` passa de `es2020/edge88/firefox78/chrome87/safari14` para `chrome111/edge111/firefox114/safari16.4/ios16.4` (research, ponto 2).
- CI: `ubuntu-24.04`.
- Desenvolvimento: Windows 11.

**Project Type**: SPA React (Vite), roteador declarativo (`<BrowserRouter>` + `<Routes>`).

**Performance Goals**: SC-004. A variação do total do bundle acima de 10% entre a `main` e o fim da Fase 3 exige explicação, mas não reprova. Na simulação, foi de +6,2% em gzip.

**Constraints**:
- Sem gate de `npm audit` na CI (FR-017).
- Sem chamada paga ao coach (FR-016a).
- Sem mudança em `src/types/` nem no contrato (FR-019).
- Nenhuma dependência nova no `package.json`, nem para as capturas (FR-016c).
- Push só ao fim de cada fase, e só depois de a CI da fase anterior terminar.

**Scale/Scope**: cerca de 12 commits. Mudam:
- `package.json` e `package-lock.json`;
- 6 arquivos de `src/` (uma linha cada);
- `vite.config.ts` e `tsconfig.app.json` (T3);
- a constituição, o `CLAUDE.md` e o `README.md`;
- as ferramentas de medição em `specs/002-npm-audit-triage/evidence/tools/` (T5).

Não resta nenhuma pendência de clarificação. Os trade-offs T1–T5 foram decididos pela mantenedora em 2026-10-21 ("Trade-offs decididos").

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

Constituição v1.2.0 (`.specify/memory/constitution.md`).

| Item | Situação | Observação |
|---|---|---|
| I. A API é dona do contrato | Passa | Nada em `src/types/` muda; nenhum payload REST/WebSocket muda (SC-007). A API só é **usada**, rodando sobre uma cópia do banco, para a conferência visual. |
| II. Containers com estado, componentes de apresentação | Passa | Só mudam linhas de import em 4 páginas e no roteador. Nenhum componente passa a buscar dados. |
| III. Sem bibliotecas de estado, gráfico ou fetch sem motivo | Passa | Nenhuma biblioteca nova. O React Router já existe e só troca de pacote (`react-router-dom` → `react-router`), por exigência do caminho oficial. O Playwright das capturas fica fora dos dois repositórios, e nenhuma ferramenta entra no `package.json`. |
| IV. Derivar no render; efeitos externos só por ação explícita | Passa | O coach só é acionado por clique, inclusive nas capturas. A API roda com um `.env` de conferência sem chave, e a ausência da chave é conferida sem custo antes do primeiro clique (D8), então nenhum clique gera chamada paga. |
| V. Só tokens de design | Passa | Nenhum estilo muda. O Lightning CSS só reordena declarações no CSS gerado (research, ponto 2), e a conferência visual confere. |
| VI. UI e documentação honestas | Passa | Os números de bundle, alvos e escuta são medidos, não supostos. O `README.md` só cita o Dependabot depois que ele estiver ligado e conferido (D9). |
| Restrição: "React 18, TypeScript in `strict` mode, Vite 5, React Router 6, Node.js ≥ 22.17…" | Passa, com emenda | A emenda é o **primeiro commit** da implementação (D2): a linha deixa de citar majors de bibliotecas e aponta o `package.json` como fonte única. O Node ≥ 22.17 fica. Nenhum commit da feature deixa a constituição contrariando o código. |
| Restrição: testes cobrem funções puras; descoberta por glob | Passa | Nenhum teste novo nem alterado. As ferramentas de medição (T5) são evidência do método, não código do projeto: ficam em `specs/…/evidence/tools/`, fora de `src/` e de `tools/`. O glob de testes não as alcança e o `typecheck` não as inclui. O `eslint .` as lê com 0 regras e sai com 0 (conferido por stdin, research ponto 7), e isso é conferido de novo no commit. |
| Restrição: idioma de identificadores, mensagens e comentários | Passa | Commits em inglês. O único comentário tocado é o de `tsconfig.app.json`, que ficaria falso se o plugin sair (T3); a correção é em português. |
| Restrição: exports default/nomeados, `interface XProps` | Passa | Não muda. |
| Restrição: segredos nunca commitados | Passa | O `.env` de conferência da API e a cópia do banco ficam em `C:\Telemetry\snapshots-002\`, fora dos dois repositórios. |
| Fluxo: SDD com spec, plan e tasks commitados antes | Passa | Spec já commitada (`4d4022b`, `5d38f57`). Plan, research e quickstart entram num `docs:`, e o tasks em outro, antes do primeiro commit de implementação. |
| Fluxo: `typecheck`, `test`, `lint` e `build` antes de cada commit | Passa | Vale para todo commit, inclusive os `docs:`. |
| Fluxo: Conventional Commits sem `Co-Authored-By` | Passa | Tipos usados: `docs:`, `fix:`, `chore:`. Sem trailer. |
| Fluxo: limitações conhecidas em `CLAUDE.md` e `README.md` | Passa | Nenhuma limitação é corrigida. A do loopback IPv6 continua verdadeira com o Vite 8 (medido), então os dois arquivos ficam como estão nesse ponto. |
| Fluxo: decisões com trade-off apresentadas como opções | Passa | T1–T5 apresentados com opções e decididos pela mantenedora. A falta de versão adequada antes do corte (D11) e um achado na revisão das capturas (D1, D7) voltam para ela, sem decisão unilateral. |
| Fluxo: histórico publicado nunca reescrito | Passa | Um recuo para o Vite 7.3 é feito com commits novos, sem `reset` nem `push --force`. |
| Merge Gate: PR, quatro checks, branch atualizada, histórico linear, Rebase and merge | Passa | Um único PR, com a CI registrada por fase (D5). O merge é da mantenedora. |
| Governança: emenda por PR que diga o motivo, com versão semântica | Passa | O motivo e o Sync Impact Report vão no corpo do commit da emenda e na descrição do PR. A versão é proposta pelo `/speckit-constitution` e mostrada antes de aplicar (D2). |

**Re-check pós-desenho**: igual à tabela acima. O desenho não precisa de exceção.

## Design decisions

### D1. Medições do "antes" na `main`, antes de qualquer mudança (primeira tarefa)

Num worktree da `main` fora do repositório, e antes de qualquer commit de implementação, mede-se:
- **as capturas da lista fixa** (FR-016b), pelo método do T4, com a API subida pelo procedimento do D8;
- **o bundle**, pela ferramenta do research ponto 7;
- **os navegadores-alvo** efetivos do Vite instalado;
- **o endereço de escuta** do servidor de desenvolvimento.

Os arquivos vão para `specs/002-npm-audit-triage/evidence/` (capturas) e para a seção "Evidência da implementação" do `research.md` (tabelas).

**Antes das capturas** (T4): a instalação do Playwright e do Chromium dele, num diretório fora dos dois repositórios, é uma tarefa que **para e espera a aprovação da mantenedora**. A versão é fixa, escolhida pela regra do D11, e fica registrada no `research.md`.

**Revisão das imagens antes do commit**, porque o histórico publicado não é reescrito:
- conferir, imagem por imagem, que nenhuma mostra dado pessoal vindo do jogo ou da API (nome de jogador, de piloto, de conta ou de máquina, por exemplo). Os tipos do front (`src/types/`) não carregam nomes, mas a revisão é visual;
- somar o tamanho dos arquivos e registrar o total no `research.md`. A referência proposta é até 5 MB para as capturas de toda a feature.

Se a revisão achar dado pessoal ou o total passar da referência, nada é commitado e a mantenedora decide entre não commitar as imagens (deixando só a comparação no `research.md`) ou outra saída, como recortar ou comprimir.

**Commit**: as imagens aprovadas, as tabelas e as ferramentas do T5 entram no terceiro commit da implementação (`docs: record the baseline measurements for spec 002`), logo depois da emenda (D2).

**Motivo**: depois que o Vite 5 sair do lockfile, o "antes" não pode mais ser gerado sem reverter. Medir na `main` dá uma referência única para qualquer fase.

### D2. Emenda da constituição: primeiro commit da implementação

- O `/speckit-constitution` reescreve a restrição de tecnologia:
  - React, TypeScript `strict`, Vite e React Router aparecem **sem** número de major, com a frase de que as versões vivem no `package.json`, a fonte única;
  - o Node.js ≥ 22.17 fica, com o motivo atual (`fs.globSync` estável).
- A versão nova é **proposta pelo comando** segundo a regra de versionamento da própria constituição, com o motivo, e **mostrada à mantenedora antes de ser aplicada**.
- O Sync Impact Report vai no **corpo do commit** e na **descrição do PR**, não no arquivo, como na spec 001.
- O `CLAUDE.md` **não** muda neste commit. A linha de Stack dele ("React 18.3 + TypeScript 5.6 + Vite 5.4 + React Router 6") descreve o que existe e continua verdadeira até cada troca (D6).
- Commit: `docs: amend the constitution to keep library versions in package.json`.

### D3. Fase 1: correções dentro das faixas atuais

A data de corte da Fase 1 (D11) é registrada no `research.md` antes do primeiro comando.

1. `fix: apply npm audit fix within the current ranges`: `npm audit fix --before=<corte da Fase 1>`. Só muda o `package-lock.json`: na simulação, o `audit fix` não tocou o `package.json`.
   - Na simulação com corte de 2026-10-07, o resultado foi `typescript-eslint` 8.71.1, `react-router-dom` 6.30.6, `vite` 5.4.21, `rollup` 4.64.0 e `postcss` 8.5.29.
   - As versões resolvidas de fato vão para o `research.md`.
2. `fix: update ESLint to 9.39`: `npm install -D eslint@^9.39 @eslint/js@^9.39 --before=<corte da Fase 1>`, com `package.json` e `package-lock.json`.
   - T1: o piso no `package.json` é `^9.39.<patch resolvido>` (na simulação, `^9.39.5`, publicado em 2026-07-10).

**Verificação**:
- os quatro scripts passam;
- `npm audit` dá 5 (4 moderadas, 1 alta), com `--omit=dev` em 2 moderadas, só React Router e Vite (FR-003). Esse é o resultado da simulação; uma diferença é registrada e explicada;
- `eslint .` sem avisos;
- o bundle é medido, a segunda das quatro medições do research ponto 7, e registrado.

Nenhuma afirmação do `CLAUDE.md` ou do `README.md` fica falsa: o Vite continua 5.4 e o React Router, 6.

### D4. Fase 2: React Router 7, pelo caminho oficial

1. `fix: opt into the React Router v7 future flags`: `<BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>`.
   - Só essas duas valem para o roteador declarativo; as outras quatro são de `RouterProvider`/`createBrowserRouter` (research, ponto 1).
   - Roteiro de navegação no dev server antes do commit.
2. `fix: upgrade to React Router 7`:
   - `npm uninstall react-router-dom` e `npm install react-router@^7 --before=<corte da Fase 2>`. A faixa gravada no `package.json` é `^7.<minor>.<patch>` da versão resolvida, e na simulação sem corte foi a 7.18.4, de 2026-09-15;
   - a versão resolvida tem de ser ≥ 7.18.0, a primeira sem os advisories GHSA-wrjc-x8rr-h8h6 e GHSA-337j-9hxr-rhxg. Se o corte não alcançar uma 7.18.x ou posterior, vale o D11;
   - nos 6 arquivos, `from "react-router-dom"` vira `from "react-router"`;
   - a prop `future` é removida (na v7 ela não existe, `TS2322`, e os comportamentos já são o padrão);
   - no mesmo commit, o `CLAUDE.md` Stack troca "React Router 6" por "React Router 7" (D6).

**Verificação**:
- os quatro scripts passam;
- `npm audit --omit=dev` dá **0** (FR-001);
- o roteiro de navegação do quickstart, parte 3, passa no build de produção servido localmente (FR-009);
- o bundle é medido (research, ponto 7).

### D5. Um PR, um push por fase, CI esperada antes da fase seguinte

- O `ci.yml` cancela a execução em andamento de um PR quando chega um push novo (`cancel-in-progress` para `pull_request`). Por isso:
  1. ao fim da fase, os quatro scripts passam localmente;
  2. push, com aprovação explícita da mantenedora; o PR é aberto no primeiro push, ao fim da Fase 1, com aprovação;
  3. `gh run watch` até a execução terminar; registrar o id da execução, o SHA e o resultado dos quatro checks;
  4. só então começa a fase seguinte.
- O registro da execução da fase N vai num commit `docs:` que abre a fase N+1 e sobe junto com ela. O registro da Fase 3 vai no commit `docs:` final, cuja própria execução é a do PR pronto para merge.
- Se a CI de uma fase falhar só no Linux, a causa e a correção vão para o `research.md` e a correção entra como commit novo antes do próximo push. Nada de pular check.

### D6. Documentação no mesmo commit da troca de versão

| Commit | Afirmação corrigida no mesmo commit |
|---|---|
| React Router 7 (D4.2) | `CLAUDE.md` Stack: "React Router 6" → "React Router 7" |
| Vite 8 (D7.1) | `CLAUDE.md` Stack: "Vite 5.4" → "Vite 8" |
| `vite-tsconfig-paths` removido (D7.2) | Comentário de `tsconfig.app.json` ("resolvidos em runtime pelo plugin vite-tsconfig-paths") passa a citar `resolve.tsconfigPaths` do Vite |
| Recuo para o Vite 7.3 (se houver) | `CLAUDE.md` Stack: "Vite 8" → "Vite 7.3" |
| Vite 8 e os navegadores-alvo novos | Nada muda. `grep -i -E "browser\|navegador\|chrome\|firefox\|safari\|edge\|target\|es20"` em `README.md` e `CLAUDE.md` só acha "Target branches" (README, linha 96, sobre o ruleset). Nenhum dos dois fala de navegadores suportados. |

- O `README.md` não cita versões de Vite nem de React Router (conferido com `grep`), então só ganha conteúdo novo (D9).
- Os números de major ficam no `CLAUDE.md`, que descreve o que existe. A constituição, depois do D2, não os tem.

### D7. Fase 3: Vite 8

1. `fix: upgrade to Vite 8 and @vitejs/plugin-react-swc 4`: `npm install -D vite@^8 @vitejs/plugin-react-swc@^4 --before=<corte da Fase 3>`, mais o `CLAUDE.md` (D6).
   - As faixas gravadas no `package.json` são as das versões resolvidas.
   - Na simulação sem corte, foram 8.3.4 (2026-10-08) e 4.3.3 (2026-07-30). Com corte de 14 dias contado a partir de 2026-10-21, a 8.3.4 ficaria de fora e entraria a 8.x anterior; qualquer 8.x está fora da faixa vulnerável (≤ 6.4.3).
   - O plugin resolvido tem de declarar `vite` 8 no peer. Na simulação, nenhuma mudança de configuração foi necessária.
2. `chore: resolve tsconfig paths with Vite instead of a plugin` (T3), em commit separado:
   - tira `vite-tsconfig-paths` do `package.json` e do `vite.config.ts` e põe `resolve: { tsconfigPaths: true }`;
   - corrige o comentário de `tsconfig.app.json`, que ficaria falso (D6);
   - na simulação, o output foi byte a byte idêntico ao do plugin;
   - antes do commit, confere que o aviso "The plugin "vite-tsconfig-paths" is detected" sumiu do `build`.

**Verificação**:
- os quatro scripts passam;
- `npm audit` dá 0, também com `--omit=dev`;
- o roteiro de navegação passa;
- bundle, navegadores-alvo e endereço de escuta medidos e registrados (FR-012, FR-013a, FR-015);
- as capturas do "depois", com o mesmo método, a mesma lista e o mesmo viewport, são comparadas com as do D1 (FR-016);
- as imagens do "depois" passam pela mesma revisão do D1 (dado pessoal e tamanho total, somado às do "antes") antes do commit. Um achado volta para a mantenedora, com as mesmas opções.

**Regra de recuo** (clarify, Q1):
- Se, para o build passar ou a conferência visual bater, for preciso mudar **código da aplicação** (qualquer arquivo em `src/`, `index.html` ou CSS), não se muda: recua-se para o Vite 7.3.
- O recuo é um commit novo, `fix: use Vite 7.3 instead of Vite 8`, sem reescrever histórico:
  - `npm install -D vite@~7.3 @vitejs/plugin-react-swc@^4 --before=<corte da Fase 3>`;
  - a 7.3.x mais recente antes do corte (na simulação, 7.3.7, de 2026-10-06), com o plugin cujo peer aceita `vite` 7;
  - o `CLAUDE.md` corrigido;
  - a regra do D11 vale igual.
- O motivo vai para o `research.md`, e as medições e capturas do "depois" são refeitas.
- Mudança só de configuração ou de dependência **não** dispara o recuo.

### D8. Conferência visual com a API (procedimento do research, ponto 6)

**Como a API carrega o ambiente** (lido no código da API, research ponto 6):
- `src/config/env.ts` e `src/config/dbPath.ts` começam com `import "dotenv/config"` (dotenv 16.4.5). Não há `dotenv.config({ path })`, `node --env-file` nem `process.loadEnvFile`. Os scripts `dev`, `replay` e `record` são `ts-node-dev <arquivo>`, sem flag de ambiente.
- O `dotenv/config` lê `DOTENV_CONFIG_PATH` (`lib/env-options.js`). Com um caminho único, ele **substitui** o `.env` padrão do diretório corrente e não cai de volta para ele (`configDotenv`: `optionPaths = [_resolveHome(options.path)]`).
- Variáveis já presentes no ambiente do processo **não** são sobrescritas (`override` é `false`).
- A chave entra como `process.env.ANTHROPIC_API_KEY || undefined`, e toda chamada paga passa por `isCoachingConfigured()`.

**Proteções que valem no Windows**:
1. **`.env` alternativo sem chave**: `DOTENV_CONFIG_PATH` aponta para `C:\Telemetry\snapshots-002\api-conferencia.env`, uma cópia do `.env.example` só com as portas. O `.env` real da API, que pode ter a chave, não é lido. Se o caminho estiver errado, o `dotenv` não carrega nada, e a API falha na inicialização por falta das portas, sem subir com a chave.
2. **Nenhuma chave herdada do sistema**: como o `dotenv` não sobrescreve, uma `ANTHROPIC_API_KEY` definida nas variáveis de ambiente do Windows (usuário ou sistema) passaria direto. Por isso existe a conferência sem custo abaixo.

**O que não conta como proteção**: atribuir string vazia à variável. Medido nesta máquina (research, ponto 6):
- o `cmd` (`set X=`) e o Windows PowerShell 5.1 (`$env:X = ''`) **removem** a variável;
- o PowerShell 7.6 e o Git Bash a mantêm vazia.

Como depende do shell, não entra no procedimento.

**Conferência sem custo antes do primeiro clique no coach**, a cada rodada:
- no mesmo terminal e com as mesmas variáveis com que a API vai subir, no diretório da API, roda-se `node -e "require('dotenv/config'); console.log(Boolean(process.env.ANTHROPIC_API_KEY))"`;
- isso carrega o ambiente exatamente como a API (o mesmo `dotenv/config`, o mesmo `DOTENV_CONFIG_PATH`, o mesmo ambiente herdado) e imprime só `true` ou `false`, **nunca o valor**;
- o esperado é `false`. Com `true`, nada sobe e a mantenedora investiga;
- **é passo da mantenedora ou da sessão da API, não desta sessão.** Esta sessão só começa as capturas depois que a mantenedora informar o `false`.

**Rede de segurança, não proteção**: o limite de gastos da organização no Console da Anthropic limita o prejuízo de um erro qualquer. Ele não substitui as duas proteções nem a conferência, que são o que garante o procedimento.

**Mantenedora**, ou uma sessão do Claude Code aberta no repositório da API:
- cria `C:\Telemetry\snapshots-002\` e o `api-conferencia.env`;
- faz a cópia mestra com `VACUUM INTO`;
- escolhe a sessão e as voltas (uma com análise em cache, cuja volta principal é a mais recente, e uma sem cache);
- a cada rodada:
  - copia a mestra para `telemetry-run.db`;
  - define `DOTENV_CONFIG_PATH` e `DB_PATH` no terminal;
  - faz a conferência sem custo;
  - sobe a API (`npm run dev`) e confere o log `[db] usando banco em …`;
  - inicia o replay a 1x num segundo terminal, com o mesmo `DOTENV_CONFIG_PATH`. O replayer (`tools/replayer.ts`) importa `env` só pelas portas e envia UDP; quem grava no banco é a API;
- no fim, para tudo e apaga o `telemetry-run.db`.

**Esta sessão** (front):
- build de produção;
- `npm run preview` com o `.env` do front apontando para a API local;
- capturas com o Playwright (T4);
- comparação anotada no `research.md`.

Não existe verificação segura **por tentativa**: o cache é consultado antes da chave, e um POST sem cache com chave faria a chamada paga. O 503 do estado 5 só é provocado depois do `false` da conferência.

**Quando**: duas rodadas, no D1 e no D7 (mais uma se houver recuo).

### D9. Dependabot e CI sem gate de auditoria

- O `ci.yml` não muda (FR-017, SC-006).
- **Tarefa manual da mantenedora**, em qualquer momento antes do commit `docs:` final: ligar os alertas do Dependabot em Settings → Advanced Security (antes "Code security") → Dependabot alerts.
- **O agente confere** com `gh api repos/AnaLauraFFerraz/Telemetry-F1/vulnerability-alerts`, que dá HTTP 204 quando ligado e 404 quando desligado, e registra a saída no `research.md`.
- **Só depois do 204**, o commit `docs:` final acrescenta:
  - **`README.md`**, seção de CI: uma frase dizendo que não há gate de `npm audit` na CI e que avisos novos chegam pelos alertas do Dependabot do repositório;
  - **`CLAUDE.md`** Rules: a mesma regra, curta.
- Se a mantenedora ainda não tiver ligado, os dois arquivos não citam o Dependabot, e a tarefa fica aberta no `tasks.md`.

### D10. Fechamento

- O `/speckit-converge` roda antes do último push, como na spec 001.
- O Status da spec só muda depois do converge.
- O PR fica verde, e a mantenedora mergeia com Rebase and merge.
- Apagar a cópia mestra do banco é tarefa da mantenedora, depois do merge.

### D11. Versões com corte de 14 dias (T2)

- **Corte da fase**: a data de início da fase menos 14 dias, registrada no `research.md` antes do primeiro comando da fase.
- **Comandos**: todo `npm audit fix` e todo `npm install` de pacote da feature rodam com `--before=<corte>`.
- **Versão de cada pacote**: a mais recente da faixa publicada antes do corte. A faixa gravada no `package.json` é a da versão resolvida, e a versão resolvida e a data de publicação dela (`npm view <pacote> time`) vão para o `research.md`.
- **Números do plano**: os do D3, D4 e D7 (8.3.4, 4.3.3, 7.18.4, 9.39.5, 7.3.7) **vêm da simulação de 2026-10-21, sem corte** e servem de referência, não de alvo.
- **Quando nenhuma versão adequada existe antes do corte**, ou seja, nenhuma versão da faixa publicada antes do corte corrige o advisory, ou o par plugin/Vite compatível só existe depois:
  1. a fase para antes do commit daquele pacote;
  2. o `research.md` registra o pacote, o advisory, a primeira versão que corrige e a data de publicação dela;
  3. a mantenedora decide entre esperar até a versão ter 14 dias, abrir uma exceção registrada só para aquele pacote (com a versão e o motivo) ou seguir sem a correção e registrar a vulnerabilidade como restante (FR-002).

  O agente não escolhe sozinho.

## Trade-offs decididos

Decididos pela mantenedora em 2026-10-21, todos na opção A:
- **T1**: piso `^9.39.x` para `eslint` e `@eslint/js` no `package.json` (D3).
- **T2**: corte de 14 dias com `--before`, com a data registrada em cada fase (D11).
- **T3**: `resolve.tsconfigPaths` nativo, com o `vite-tsconfig-paths` removido num commit separado (D7.2).
- **T4**: Playwright fora dos dois repositórios, com a versão fixa registrada no `research.md`. A instalação do Playwright e do Chromium depende de aprovação da mantenedora (D1).
- **T5**: ferramentas versionadas em `specs/002-npm-audit-triage/evidence/tools/`, cada uma com um comentário no topo dizendo como rodar (o comando e, quando usar, a versão do Playwright). No commit que as traz, confere-se que `eslint .` e `npm run typecheck` se comportam como esperado: o ESLint lê os `.mjs` com 0 regras e sai com 0, e o `typecheck` não os inclui.

A tabela abaixo mostra as opções como foram apresentadas.

| # | Decisão | A (escolhida) | B | Motivo da recomendação |
|---|---|---|---|---|
| T1 | Piso do ESLint no `package.json` | Subir `eslint` e `@eslint/js` para `^9.39.5` (o que `npm install pkg@^9.39.5` grava) | Manter `^9.13.0` e mudar só o lockfile | Depois da emenda, o `package.json` é a fonte única das versões, e o piso documenta a versão sem advisory. Com `^9.13.0`, um `npm install` fora do lock poderia aceitar uma versão vulnerável. |
| T2 | Idade mínima das versões resolvidas | `npm audit fix` e `npm install` com `--before=<início da fase − 14 dias>`, com a data registrada | Sem corte: pegar as últimas da faixa | Hoje o `audit fix` escolhe `rollup` de 1 dia, `typescript-eslint` de 2 e `postcss` de 3. Com corte de 14 dias, o resultado de auditoria medido é o mesmo (research, ponto 4). Um corte reduz a exposição a uma versão comprometida recém-publicada. O `vite@8.3.4` tem 13 dias hoje, e com corte de 14 entraria uma 8.x anterior, também limpa. |
| T3 | `vite-tsconfig-paths` com o Vite 8 | Trocar pela opção nativa `resolve.tsconfigPaths: true` e remover o pacote, num commit separado (D7.2) | Manter o plugin | Com o plugin, o Vite 8 imprime um aviso em todo `build` e `dev`. A opção nativa gera saída byte a byte idêntica (medido) e tira uma dependência. A mudança é só de configuração e dependência, então não aciona a regra de recuo. |
| T4 | Método das capturas | Playwright instalado fora dos dois repositórios, roteiro em script, viewport fixo (research, ponto 5) | Captura manual pela mantenedora, com roteiro rígido no quickstart | Só um roteiro automatizado repete os mesmos passos antes e depois. O custo é instalar um Chromium (~150 MB) fora do repositório. |
| T5 | Onde ficam as ferramentas de medição (`bundleSizes.mjs`, `devListen.mjs` e o script de captura, se T4 = A) | Versionadas em `specs/002-npm-audit-triage/evidence/tools/`, como evidência do método | Fora do repositório, com o conteúdo transcrito no `research.md` | Versionadas, qualquer pessoa repete a medição. Não entram no `package.json`, no `tsconfig` nem no bundle. Como são `.mjs`, o `eslint .` as lê com a configuração base, que só tem regras para `*.ts`/`*.tsx`, e isso precisa ser conferido no commit. |

## Order of work

- Cada fase termina com a própria verificação antes da próxima.
- Os commits são atômicos, em Conventional Commits, **sem `Co-Authored-By`**.
- Antes de cada commit rodam `npm run typecheck`, `npm test`, `npm run lint` e `npm run build`.
- Push, abertura do PR e merge param para aprovação; o merge é sempre da mantenedora.

### Fase 0: artefatos SDD

- `docs:` com `plan.md`, `research.md` e `quickstart.md`.
- `docs:` com `tasks.md` (`/speckit-tasks`).

### Implementação

| # | Etapa | Commit | Push |
|---|---|---|---|
| 1 | Instalação do Playwright fora dos repositórios, **com aprovação** (T4, D1); medições do "antes" na `main` (D1), com a API pelo D8; revisão das imagens (D1) | (arquivos guardados, commitados no passo 3) | — |
| 2 | Emenda da constituição (D2), com a proposta mostrada antes | `docs: amend the constitution to keep library versions in package.json` | — |
| 3 | Registro do "antes" | `docs: record the baseline measurements for spec 002` | — |
| 4 | Fase 1 (D3) | `fix: apply npm audit fix within the current ranges`; `fix: update ESLint to 9.39` | **push 1** + abrir o PR (aprovação); esperar a CI |
| 5 | Fase 2 (D4) | `docs: record the phase 1 CI run for spec 002`; `fix: opt into the React Router v7 future flags`; `fix: upgrade to React Router 7` | **push 2**; esperar a CI |
| 6 | Fase 3 (D7) | `docs: record the phase 2 CI run for spec 002`; `fix: upgrade to Vite 8 and @vitejs/plugin-react-swc 4`; (T3) `chore: resolve tsconfig paths with Vite instead of a plugin` | — |
| 7 | Medições e capturas do "depois" (D7, D8); revisão das imagens; recuo se a regra disparar | (eventual) `fix: use Vite 7.3 instead of Vite 8` | — |
| 8 | Dependabot conferido (D9), converge (D10) e evidência | `docs: record the phase 3 evidence for spec 002` (com o README e o `CLAUDE.md` do D9, se o 204 já tiver sido conferido) | **push 3**; esperar a CI; registrar a execução na descrição do PR |

O registro da execução do push 3 não cabe em commit sem gerar outra execução. Ele vai na descrição do PR, e o `research.md` aponta para lá.

## Artefatos que não se aplicam

- **data-model.md**: não se aplica. A feature não cria nem altera dados persistidos ou trafegados. As "entidades" da spec (vulnerabilidade registrada, fase, comparação de bundle, conferência visual) são registros de evidência, e sua forma está no `research.md` e no [quickstart.md](quickstart.md).
- **contracts/**: não se aplica. O front não expõe interface a outros sistemas. O contrato REST/WebSocket pertence à API e não muda (FR-019). Os nomes dos checks da CI, que são contrato com o ruleset, também não mudam (FR-017).

## Project Structure

### Documentation (this feature)

```text
specs/002-npm-audit-triage/
├── spec.md
├── plan.md              # este arquivo
├── research.md          # Phase 0, com a seção "Evidência da implementação" preenchida depois
├── quickstart.md        # roteiro de validação
├── checklists/
│   └── requirements.md
├── evidence/            # capturas do antes e do depois, depois da revisão (D1, D7)
│   └── tools/           # bundleSizes.mjs, devListen.mjs, script de captura (T5)
└── tasks.md             # /speckit-tasks
```

### Source Code (repository root)

```text
.specify/memory/constitution.md     # emenda (D2)
package.json                        # react-router, vite, plugin-react-swc, eslint, @eslint/js; vite-tsconfig-paths sai (T3)
package-lock.json                   # audit fix e trocas de versão
src/router/router.tsx               # import de "react-router"; prop future entra (D4.1) e sai (D4.2)
src/pages/dashboard/DashboardPage.tsx           # import
src/pages/notFound/NotFoundPage.tsx             # import
src/pages/sessionAnalysis/SessionAnalysisPage.tsx  # import
src/pages/sessionHistory/SessionHistoryPage.tsx    # import
src/pages/settings/SettingsPage.tsx             # import
vite.config.ts                      # resolve.tsconfigPaths, sem o plugin (T3)
tsconfig.app.json                   # comentário sobre o plugin (T3)
CLAUDE.md                           # Stack (D6); Rules (D9)
README.md                           # seção de CI (D9)
```

**Structure Decision**: projeto único. Nada novo em `src/` nem em `tools/`. As ferramentas de medição ficam em `specs/002-npm-audit-triage/evidence/tools/` (T5), nunca no `package.json`. O Playwright e o Chromium dele ficam fora dos dois repositórios (T4).

## Complexity Tracking

Nenhuma violação da constituição fica em aberto. A restrição de tecnologia com números de major é emendada antes da primeira troca de versão (D2).

| Mudança | Why Needed | Simpler Alternative Rejected Because |
|---|---|---|
| Troca de `react-router-dom` por `react-router` em 6 arquivos de `src/` | O guia oficial da v6 para a v7 manda trocar o pacote e os imports (FR-008), e a v8 remove o `react-router-dom`. | Manter `react-router-dom@7` como re-export: o diff seria menor, mas sairia do caminho oficial pedido pela spec e adiaria a mesma troca para a v8. |
| Uma API rodando sobre cópia do banco real para as capturas | O FR-016a/FR-016c exige dados reais no histórico, na análise e no cache do coach. | Capturas sem API: só mostrariam estados de erro e vazio e não confeririam os gráficos, o mapa nem o coach. |
