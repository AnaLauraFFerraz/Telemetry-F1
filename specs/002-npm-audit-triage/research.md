# Research: Triagem e correção das vulnerabilidades do npm audit

**Feature**: [spec.md](spec.md) | **Plano**: [plan.md](plan.md) | **Data**: 2026-10-21

## Como esta pesquisa foi feita

- Ambiente: Windows 11, Node v22.23.1, npm 10.9.8, a partir do commit `5d38f57` da branch `002-npm-audit-triage`. As dependências desse commit são as mesmas da `main` (`f762435`).
- As três fases foram **simuladas** num git worktree descartável fora do repositório (no scratchpad da sessão). Foi usado `npm ci` a partir do lockfile atual e as fases foram aplicadas em sequência, cada uma com os quatro scripts da CI, o `npm audit` e o build. O worktree foi removido no fim, e o repositório não foi alterado (`git worktree list` só mostra o repositório, `git status` só mostra os artefatos desta feature).
- Os números de bundle desta pesquisa vêm da simulação. Os números que contam para o SC-004 são os medidos na implementação, com a mesma ferramenta (ponto 7).
- Documentação citada: o guia oficial do React Router, lido do repositório `remix-run/react-router` na tag `react-router@7.18.4` (`docs/upgrading/v6.md`), porque `reactrouter.com/upgrading/v6` devolve 404 e o `main` do repositório já traz o guia v7→v8. Também os guias de migração e as páginas de configuração do Vite em `vite.dev`, `v7.vite.dev` e `v6.vite.dev`.
- Uma regra de trabalho: o repositório `TelemetryF1_API` foi **só lido**, para conferir comandos e o comportamento sem chave, e nada foi executado nele. O que envolve a API é tarefa da mantenedora ou de uma sessão do Claude Code aberta naquele repositório (ponto 6).

## Resumo das medições

| Estado | `npm audit` (total) | `--omit=dev` | `typecheck` | `lint` | `test` | `build` |
|---|---|---|---|---|---|---|
| `main` hoje | 27 (1 baixa, 3 moderadas, 23 altas) | 3 (1 alta, 2 moderadas) | ✓ | ✓ | ✓ (27 testes) | ✓ |
| Fase 1: `npm audit fix` + ESLint 9.39.5 | 5 (4 moderadas, 1 alta) | 2 moderadas | ✓ | ✓ | ✓ | ✓ |
| Fase 2: + React Router 7.18.4 | 3 (2 moderadas, 1 alta) | **0** | ✓ | ✓ | ✓ | ✓ |
| Fase 3: + Vite 8.3.4 e `@vitejs/plugin-react-swc` 4.3.3 | **0** | **0** | ✓ | ✓ | ✓ | ✓ |

O que sobra depois de cada fase:

- **Depois da Fase 1:** `react-router`/`react-router-dom` (moderadas, produção, correção só na 7.18.0 em diante) e `vite` (alta), `esbuild` e `@vitejs/plugin-react-swc` (moderadas, desenvolvimento).
- **Depois da Fase 2:** só a cadeia do Vite.
- **Depois da Fase 3:** nada.

Em relação à simulação de triagem (7 vulnerabilidades), a Fase 1 elimina também o `eslint` e o `@eslint/plugin-kit` (baixas), porque sobe o ESLint de forma explícita.

As versões citadas neste research vêm da simulação **sem corte de data**. Com o T2 decidido (corte de 14 dias, plano D11), as versões usadas na implementação podem ser anteriores, e as efetivas ficam na seção "Evidência da implementação".

## 1. React Router 6.30 → 7

### Decisão

Seguir o guia oficial da v6 para a v7 na ordem que ele dá:
1. Subir para a última 6.x. A 6.30.6 entra na Fase 1, pelo `npm audit fix`.
2. Ligar as duas future flags que se aplicam a um `<BrowserRouter>` e conferir o build.
3. Instalar `react-router@7`, desinstalar `react-router-dom`, trocar os imports de `"react-router-dom"` por `"react-router"` e remover a prop `future`.

### Evidência

**Versões mínimas** (guia, "Upgrading from v6"): `node@20`, `react@18`, `react-dom@18`. O projeto tem React 18.3.1 e Node ≥ 22.17, então passa. O `react-router@7.18.4` declara `peerDependencies` `react >=18` e `react-dom >=18`, e `engines.node >=20.0.0`.

**O roteador do projeto** é declarativo (`src/router/router.tsx`): um `<BrowserRouter>` com `<Routes>` e cinco `<Route>` (`/`, `/sessions`, `/sessions/:id`, `/settings`, `*`). Não há `createBrowserRouter`, `RouterProvider`, loaders, actions, fetchers nem formulários do roteador.

| Future flag (guia) | Vale para | Aplica-se aqui? | Motivo |
|---|---|---|---|
| `v7_relativeSplatPath` | `<BrowserRouter>` e `createBrowserRouter` | Sim, liga-se | Só muda rotas com caminho **e** splat (`dashboard/*`) com links relativos abaixo delas. A única splat do projeto é `path="*"` sozinha, e todos os links são absolutos, então não há código a mudar. |
| `v7_startTransition` | `<BrowserRouter>` e `<RouterProvider>` | Sim, liga-se | Usa `React.useTransition` nas atualizações de estado do roteador. O guia só pede mudança de código quando há `React.lazy` dentro de componente. `grep` por `lazy(`, `Suspense`, `startTransition` e `useTransition` em `src/` não acha nada. |
| `v7_fetcherPersist` | só `<RouterProvider>` | Não | O guia diz "If you are not using a `<RouterProvider>` you can skip this". |
| `v7_normalizeFormMethod` | só `<RouterProvider>` | Não | Idem. |
| `v7_partialHydration` | só `<RouterProvider>` | Não | Idem. |
| `v7_skipActionErrorRevalidation` | só `createBrowserRouter` | Não | O guia diz "If you are not using a `createBrowserRouter` you can skip this". |
| Depreciação de `json`/`defer` | loaders | Não | Não há loaders. |

**Troca de pacote e imports** (guia, "Upgrade to v7"):
- "In v7 we no longer need `"react-router-dom"` … You can import everything from `"react-router"`", com `npm uninstall react-router-dom` e `npm install react-router@latest`, e "Note you only need `"react-router"` in your package.json".
- Só `RouterProvider` e `HydratedRouter` vêm de `react-router/dom`. O projeto não usa nenhum dos dois, então nenhum import vai para `react-router/dom`.
- Imports a trocar (6 arquivos, uma linha cada):
  - `src/router/router.tsx`: `BrowserRouter`, `Routes`, `Route`;
  - `src/pages/dashboard/DashboardPage.tsx`: `Link`;
  - `src/pages/notFound/NotFoundPage.tsx`: `Link`;
  - `src/pages/sessionAnalysis/SessionAnalysisPage.tsx`: `useNavigate`, `useParams`;
  - `src/pages/sessionHistory/SessionHistoryPage.tsx`: `Link`, `useNavigate`;
  - `src/pages/settings/SettingsPage.tsx`: `Link`.

**Simulação:**
- Na 6.30.6, com `future={{ v7_startTransition: true, v7_relativeSplatPath: true }}` no `<BrowserRouter>`, o `typecheck` passa (exit 0).
- Depois de `npm uninstall react-router-dom` e `npm install react-router@^7.18.4`, sem trocar imports, o `typecheck` falha com `TS2307: Cannot find module 'react-router-dom'` nos 6 arquivos.
- Com os imports trocados e a prop `future` ainda presente, o `typecheck` falha com `TS2322 … Property 'future' does not exist on type 'IntrinsicAttributes & BrowserRouterProps'`. Na v7 os dois comportamentos são o padrão e a prop não existe mais, então ela é removida no mesmo commit da troca.
- Com a prop removida, os quatro scripts passam, `npm audit --omit=dev` mostra `found 0 vulnerabilities` e o `package.json` troca `"react-router-dom": "^6.27.0"` por `"react-router": "^7.18.4"`. O `react-router` 7.18.4 traz `cookie` e `set-cookie-parser` como dependências, sem `@remix-run/router`.

**Mudanças de comportamento esperadas:**
- Navegações passam a ser envolvidas em `startTransition`. Sem Suspense nem `lazy`, não há diferença visível prevista.
- O resto do comportamento das rotas declarativas não muda, segundo o guia ("The v7 upgrade has no breaking changes if you have enabled all future flags").
- O que comprova é o roteiro de navegação do [quickstart.md](quickstart.md), parte 3.

**Bundle:** o JS passa de 203.101 B para 220.255 B bruto (+8,4%), e o total gzip, de 70.411 B para 76.370 B (+8,5%). Isso fica abaixo do gatilho de 10% do SC-004, mas é registrado.

### Verificação formal do FR-007 (entrada externa em navegação)

Busca em `src/` (fora dos `*.test.ts`) por `<Link`, `<NavLink`, `<Navigate`, `useNavigate`, `navigate(`, `redirect`, `useParams`, `useSearchParams`, `useLocation`, `window.location`, `location.href|assign|replace`, `window.open`, `href=` e `history.`:

| Ocorrência | Destino | Origem do destino | Entrada externa? |
|---|---|---|---|
| `DashboardPage.tsx:32` `<Link to="/sessions">` | `/sessions` | literal | Não |
| `DashboardPage.tsx:35` `<Link to="/settings">` | `/settings` | literal | Não |
| `NotFoundPage.tsx:9` `<Link to="/">` | `/` | literal | Não |
| `SessionHistoryPage.tsx:13` `<Link to="/">` | `/` | literal | Não |
| `SessionHistoryPage.tsx:16` `<Link to="/settings">` | `/settings` | literal | Não |
| `SettingsPage.tsx:23` `<Link to="/">` | `/` | literal | Não |
| `SettingsPage.tsx:26` `<Link to="/sessions">` | `/sessions` | literal | Não |
| `SessionAnalysisPage.tsx:104` `navigate("/sessions")` | `/sessions` | literal | Não |
| `SessionAnalysisPage.tsx:191` `navigate("/sessions")` | `/sessions` | literal | Não |
| `SessionHistoryPage.tsx:31` ``navigate(`/sessions/${id}`)`` | `/sessions/<id>` | `id` é `session.id` da resposta REST da API (`SessionsTable` chama `onSelect(session.id)`, tipado `number` em `src/types/rest.ts`) | Dado da API, não do usuário nem da URL. O destino sempre começa com o literal `/sessions/`, então não pode virar um caminho iniciado por `//` ou `\`, que é o vetor dos advisories GHSA-wrjc-x8rr-h8h6 e GHSA-2j2x-hqr9-3h42. |

Outras leituras:
- `useParams` em `SessionAnalysisPage.tsx:51`: o `id` só vira `Number(id)` para a chamada REST, e nunca é destino de navegação.
- Não há `<NavLink>`, `<Navigate>`, `redirect`, `useSearchParams`, `useLocation`, `window.location`, `window.open`, `href=` nem `history.`.

**Conclusão:** nenhum destino de navegação vem de entrada do usuário ou da URL. As duas moderadas restantes da 6.30.6 não são exploráveis pelo código atual. Mesmo assim são corrigidas, por FR-001.

### Alternativas consideradas

- **Manter `react-router-dom@7`** (que na v7 é um re-export): faria um diff menor, sem trocar imports. Foi rejeitada porque o FR-008 pede o caminho oficial, e o guia manda trocar o pacote e os imports. O guia do v7→v8 (no `main` do repositório) também diz que a v8 remove o `react-router-dom`.
- **Não ligar as flags na 6.x antes**: rejeitada. O guia recomenda um commit por passo, e ligar as flags isola a mudança de comportamento (`startTransition`) da troca de pacote.

## 2. Vite 5 → 8

### Decisão

- Vite 8 com `@vitejs/plugin-react-swc` 4, sem nenhuma mudança obrigatória de configuração. Na simulação sem corte, foram 8.3.4 e 4.3.3.
- Com o corte de 14 dias (T2, plano D11), a versão de cada um é a mais recente da faixa publicada antes do corte da Fase 3.
- O `vite-tsconfig-paths` funciona com o Vite 8, mas é trocado pela opção nativa (T3, decidido).

### Configuração atual

`vite.config.ts` tem só `plugins: [react(), tsconfigPaths()]`, sem nenhuma outra opção. Não há `postcss.config.*`, Sass/Less/Stylus, CommonJS próprio, workers, SSR, modo biblioteca, `define`, `optimizeDeps`, `build.*`, `server.*` nem decorators. O CSS é de CSS Modules simples mais `tokens.css` e `global.css`.

### Breaking changes que se aplicam e que não se aplicam

**5 → 6** (fonte: `v6.vite.dev/guide/migration`):

| Mudança | Aplica-se? |
|---|---|
| `resolve.conditions` sem condições internas; `ssr.resolve.conditions` não herda | Não: não há `resolve.conditions` nem SSR. |
| `json.stringify` padrão `'auto'` e `json.namedExports` | Não: não há import de JSON. |
| `postcss-load-config` v6 | Não: não há configuração de PostCSS. |
| Sass com a API moderna por padrão | Não: não há Sass. |
| Nome do CSS em modo biblioteca | Não: não é biblioteca. |
| Referências a assets em mais elementos HTML | Não: o `index.html` só tem o `<script type="module">`. |
| Troca de `fast-glob` por `tinyglobby` (sem faixas `{01..03}` em globs) | Não: não há `import.meta.glob`. |
| `commonjsOptions.strictRequires` padrão `true`; `build.cssMinify` em SSR; Module Runner; `server.proxy.bypass` em WebSocket; `fs.cachedChecks` | Não: nada disso é usado. |

**6 → 7** (fonte: `v7.vite.dev/guide/migration`):

| Mudança | Aplica-se? |
|---|---|
| Node 20.19+ ou 22.12+ | Sim, e já é atendido: o projeto exige ≥ 22.17, e o `.nvmrc` fixa a 22. |
| `build.target` padrão sobe (Chrome 107, Edge 107, Firefox 104, Safari 16.0) e `'modules'` vira `'baseline-widely-available'` | Sim: muda os navegadores-alvo (ver abaixo). |
| Remoção da API legada do Sass | Não. |
| Remoção do `splitVendorChunkPlugin` | Não: não é usado. |
| `transformIndexHtml` com `order`/`handler` | Não: não há plugin próprio. |
| Middlewares antes de `configureServer`, CORS | Não: não há `configureServer`. |

**7 → 8** (fonte: `vite.dev/guide/migration`):

| Mudança | Aplica-se? |
|---|---|
| Rolldown e Oxc no lugar de esbuild e Rollup (otimizador de dependências, transformação, minificação) | Sim, sem configuração a mudar: o projeto não tem `optimizeDeps.esbuildOptions`, `esbuild`, `build.rollupOptions` nem `build.minify`. O minificador padrão passa a ser o Oxc. |
| Minificação de CSS com Lightning CSS por padrão | Sim: o CSS minificado muda de forma (ver "CSS" abaixo). |
| `build.target` padrão sobe de novo (Chrome 111, Edge 111, Firefox 114, Safari 16.4) | Sim (ver abaixo). |
| Interop de default import de CommonJS, `browser`/`module` sem detecção de formato, `require` de externals, `import.meta.url` em UMD/IIFE | Não se espera efeito: as dependências de runtime são React, React DOM e React Router. O build e o app servido confirmam (quickstart). |
| `build.rollupOptions` → `rolldownOptions`, `manualChunks`, `commonjsOptions`, `customResolver`, `import.meta.hot.accept` com URL | Não: nada disso é usado. |
| Decorators nativos não são rebaixados pelo Oxc | Não: não há decorators. |
| `esbuild` passa a ser dependência opcional (`transformWithEsbuild` depreciado) | Não: nenhum plugin do projeto usa. O `esbuild` sai da árvore (`npm ls esbuild` → `(empty)`), e é isso que elimina o GHSA-67mh-4wv8-2f99. |
| Extglobs, formatos `system`/`amd`, hooks removidos, namespaces legados de TS | Não. |

### Plugins

| Pacote | Hoje | Compatível com o Vite 8 | Evidência |
|---|---|---|---|
| `@vitejs/plugin-react-swc` | 3.7.1 (`^3.5.0`) | **4.3.3** | `peerDependencies.vite`: `^4 \|\| ^5 \|\| ^6 \|\| ^7 \|\| ^8`; `engines.node` `^20.19.0 \|\| >=22.12.0`; traz `@swc/core` 1.16.18. |
| `vite-tsconfig-paths` | 5.0.1 (`^5.0.1`) | 5.0.1 funciona; última 5.x é 5.1.4; última é 6.1.1 | `peerDependencies.vite: "*"` nas três. Na simulação, o build e o dev com 5.0.1 passam. |

Avisos que o Vite 8 imprime em todo `build` e `dev` com a configuração atual (saída da simulação):

```text
The plugin "vite-tsconfig-paths" is detected. Vite now supports tsconfig paths resolution natively via the resolve.tsconfigPaths option. You can remove the plugin and set resolve.tsconfigPaths: true in your Vite config instead.
[vite:react-swc] We recommend switching to `@vitejs/plugin-react` for improved performance as no swc plugins are used. More information at https://vite.dev/rolldown
```

- **O segundo aviso** é registrado e não gera ação: trocar de plugin está fora do escopo (clarify, Q2).
- **O primeiro** levou ao T3, decidido pela troca do plugin pela opção nativa, num commit separado. A opção nativa `resolve.tsconfigPaths` tem padrão `false` (`vite.dev/config/shared-options`). Na simulação, trocar o plugin por `resolve: { tsconfigPaths: true }` gerou JS e CSS **byte a byte idênticos** (`cmp` sem diferença em `index-C_WXdhyr.js` e `index-hY3kQYIo.css`), com `typecheck` e `lint` passando.

### Node exigido

| Pacote | `engines.node` |
|---|---|
| `vite@8.3.4` | `^20.19.0 \|\| >=22.12.0` |
| `vite@7.3.x` (alternativa) | `^20.19.0 \|\| >=22.12.0` (guia 6→7) |
| `@vitejs/plugin-react-swc@4.3.3` | `^20.19.0 \|\| >=22.12.0` |
| `react-router@7.18.4` | `>=20.0.0` |

O mínimo do projeto (`>=22.17`, `.nvmrc` `22`) atende todos, então o FR-013 não exige mudança.

### Navegadores-alvo do build

| | `build.target` efetivo | Fonte |
|---|---|---|
| Antes (Vite 5.4) | `'modules'` = `['es2020', 'edge88', 'firefox78', 'chrome87', 'safari14']` | `node_modules/vite/dist/node/constants.js`, `ESBUILD_MODULES_TARGET` (lido na simulação) |
| Depois (Vite 8.3) | `'baseline-widely-available'` = `['chrome111', 'edge111', 'firefox114', 'safari16.4', 'ios16.4']`, "fixed to a date for each major release, which is 2026-01-01 for this major" | `vite.dev/config/build-options`; a CLI do 8.3.4 diz `(default: 'baseline-widely-available')` |
| Alternativa (Vite 7.3) | `'baseline-widely-available'` = Chrome 107, Edge 107, Firefox 104, Safari 16.0 | `v7.vite.dev/guide/migration` |

- O `build.cssTarget` acompanha o `build.target`.
- Na implementação, o valor efetivo é registrado de novo a partir do `node_modules` instalado (FR-012).
- O `README.md` e o `CLAUDE.md` não falam de navegadores suportados. `grep -i -E "browser|navegador|chrome|firefox|safari|edge|target|es20"` nos dois só acha "Target branches" (README, linha 96, sobre o ruleset). Nada muda neles por causa do `build.target`.
- O CSS do projeto usa `color-mix()`. Ela é suportada a partir do Safari 16.2 e do Chrome 111, então os alvos novos a cobrem nativamente. Com o alvo antigo, o esbuild já não a transformava.

### CSS

- O Lightning CSS reordena declarações dentro de cada regra e normaliza espaços em `color-mix(in srgb, …)`.
- Na simulação: 221 regras antes e depois, os mesmos nomes de classe dos CSS Modules (os hashes `_18og2_` etc. se mantêm), e 148 regras com a ordem das declarações diferente.
- Exemplo: `._badge_18og2_1{display:flex;align-items:center;gap:10px}` vira `._badge_18og2_1{align-items:center;gap:10px;display:flex}`.
- A reordenação é equivalente quando não há conflito entre abreviação e propriedade longa. A conferência visual (FR-016) é o que comprova.

### Endereço de escuta do servidor de desenvolvimento (FR-013a)

Medido com uma ferramenta de scratchpad que sobe `vite --port <p> --strictPort` sem `--host`, espera o "Local:" e lista os sockets em LISTEN com `netstat`:

```text
VITE v5.4.10  ready in 349 ms
  ➜  Local:   http://localhost:5191/
  ➜  Network: use --host to expose
--- LISTEN na porta 5191
  TCP    [::1]:5191             [::]:0                 LISTENING

VITE v8.3.4  ready in 436 ms
  ➜  Local:   http://localhost:5192/
  ➜  Network: use --host to expose
--- LISTEN na porta 5192
  TCP    [::1]:5192             [::]:0                 LISTENING
```

Antes e depois, o servidor escuta **só no loopback IPv6 (`[::1]`)**, nada em `0.0.0.0` nem em `[::]`. A limitação conhecida ("may bind only to the IPv6 loopback") continua verdadeira, e o `CLAUDE.md` e o `README.md` não mudam nesse ponto. A implementação repete a medição com a versão final.

### Bundle (simulação)

| Arquivo | Vite 5 + RR 7 (B) | Vite 8 + RR 7 (B) |
|---|---:|---:|
| JS bruto | 220.255 | 218.841 |
| CSS bruto | 20.280 | 20.217 |
| Total gzip -9 | 76.370 | 74.779 |

O número de arquivos é o mesmo: `index.html`, um `.js` e um `.css`. O Vite 8 relata 86 módulos transformados, contra 99 no Vite 5. É contagem interna de cada bundler e não indica diferença de conteúdo.

### Alternativa registrada

Vite 7.3 (última 7.3.7, de 2026-10-06), com o mesmo `@vitejs/plugin-react-swc` 4.3.3 (peer até `^8`). Os advisories do Vite têm faixa até 6.4.3, então a 7.3.7 sai limpa no banco de 2026-10-21. O recuo só vale pela regra do clarify (Q1): precisar mudar código da aplicação.

## 3. ESLint 9.39 com typescript-eslint 8.72, TypeScript 5.6 e os plugins

### Decisão

`eslint` e `@eslint/js` em `^9.39.5`. O `typescript-eslint` vai a 8.72.0 pelo `audit fix`. O TypeScript fica em `~5.6.2` (instalado 5.6.3). O `eslint-plugin-react-hooks` (5.0.0) e o `eslint-plugin-react-refresh` (0.4.14) ficam como estão, porque não têm advisory.

### Compatibilidade (`npm view … peerDependencies`)

| Pacote | Peer declarado | Instalado | OK |
|---|---|---|---|
| `typescript-eslint@8.72.0` | `eslint ^8.57.0 \|\| ^9.0.0 \|\| ^10.0.0`; `typescript >=4.8.4 <6.1.0` | ESLint 9.39.5; TS 5.6.3 | Sim |
| `eslint-plugin-react-hooks@5.0.0` | `eslint … \|\| ^9.0.0` | 9.39.5 | Sim |
| `eslint-plugin-react-refresh@0.4.14` | `eslint >=7` | 9.39.5 | Sim |

### Regras novas

- `eslint .` sai com 0 e sem nenhum aviso, nem na Fase 1 nem depois da Fase 3 (saída vazia depois do cabeçalho do npm).
- A configuração (`eslint.config.js`) usa `js.configs.recommended`, `tseslint.configs.recommended`, `reactHooks.configs.recommended.rules` e `react-refresh/only-export-components`. Esses conjuntos `recommended` só mudam em major, e as subidas aqui são minor (ESLint 9.13 → 9.39, typescript-eslint 8.12 → 8.72).
- Nenhuma regra nova passou a acusar algo no código atual.

### `package.json`

`npm install eslint@^9.39.5 @eslint/js@^9.39.5` grava os pisos `^9.39.5` no `package.json`.

**Decisão (T1 = A)**: o piso é `^9.39.x` para `eslint` e `@eslint/js`, com o patch mais recente publicado antes do corte da Fase 1 (T2). A 9.39.5 é de 2026-07-10, bem antes de qualquer corte desta feature.

## 4. O lockfile e a instalação limpa no Linux

### O que muda

| Lockfile | Pacotes |
|---|---|
| `main` | 200 |
| Depois da Fase 3 (simulação) | 181 |

**Fase 1:**
- **Saem** `braces`, `micromatch`, `fast-glob`, `fill-range`, `@nodelib/*`, `fastq`, `merge2`, `run-parallel` e afins (a cadeia do `typescript-estree`).
- **Entram** `tinyglobby`, `fdir`, `@typescript-eslint/project-service`, `@typescript-eslint/tsconfig-utils` e binários opcionais novos do Rollup para outras plataformas.

**Fase 3:**
- **Saem** `rollup`, `esbuild` e os binários deles.
- **Entram** `rolldown` 1.2.14, `lightningcss` 1.33.0 e os binários de plataforma de cada um.

### Binários de plataforma para o runner (`ubuntu-24.04`, x64, glibc)

Os binários estão no lockfile, todos com `"optional": true`, `os` e `cpu`:

| Fase | Pacote do runner Linux x64 glibc | Presente no lock |
|---|---|---|
| 1 e 2 | `@rollup/rollup-linux-x64-gnu` 4.64.12; `@esbuild/linux-x64` 0.21.5; `@swc/core-linux-x64-gnu` 1.7.40 | Sim |
| 3 | `@rolldown/binding-linux-x64-gnu` 1.2.14; `lightningcss-linux-x64-gnu` 1.33.0; `@swc/core-linux-x64-gnu` 1.16.18 | Sim |

- O lock não grava o campo `libc`, então o npm do runner pode instalar também as variantes `-musl` (são opcionais, e a musl só não é usada). Isso não quebra a instalação, só aumenta o download.
- O problema conhecido de lockfiles gerados num sistema sem as dependências opcionais de outro (npm/cli#4828) se manifestaria como **ausência** dessas entradas, e elas estão presentes.

**O que esperar na CI da Fase 1 (que é a prova):**
- `npm ci` sem erro nos quatro jobs;
- o `build` carregando o binário nativo do Rollup sem `Cannot find module @rollup/rollup-linux-x64-gnu`;
- na Fase 3, o mesmo para `@rolldown/binding-linux-x64-gnu` e `lightningcss-linux-x64-gnu`.

Se aparecer o erro de módulo nativo ausente, a correção é registrada aqui. Pular check não é opção.

### Achado: dependência opcional nova no Rollup

- Desde a 4.62.4 (2026-08-01), o `rollup` declara a dependência opcional `@napi-rs/lzma-linux-x64-gnu` 1.5.1. Ela é instalada só em Linux x64 glibc, portanto **no runner da CI**, nas Fases 1 e 2.
- O changelog da 4.62.4 não a menciona. Conferi a origem no repositório oficial:
  - o `package.json` da tag `v4.62.4` em `rollup/rollup` a lista em `optionalDependencies`, com o comentário "If missing, napi build --use-napi-cross silently skips the cross toolchain and links against the host glibc (#6461)";
  - ela vem do PR rollup/rollup#6467 ("ci: fix linux-gnu glibc regression and enforce glibc ≤ 2.28 compatibility");
  - o pacote é publicado pelos mantenedores do napi-rs (repositório `Brooooooklyn/lzma`).
- **Conclusão:** é legítima, um resíduo da toolchain de build do Rollup, e não é usada em runtime. Sai da árvore na Fase 3, junto com o `rollup`.

### Achado: idade das versões escolhidas pelo `audit fix`

Datas de publicação (`npm view <pacote> time`) de algumas das versões que o `audit fix` e as subidas de major resolvem hoje:

| Versão | Publicada em | Idade em 2026-10-21 |
|---|---|---|
| `rollup@4.64.12` | 2026-10-20 | 1 dia |
| `typescript-eslint@8.72.0` | 2026-10-19 | 2 dias |
| `postcss@8.5.31` | 2026-10-18 | 3 dias |
| `vite@8.3.4` | 2026-10-08 | 13 dias |
| `vite@7.3.7` | 2026-10-06 | 15 dias |
| `react-router@7.18.4` | 2026-09-15 | 36 dias |
| `@vitejs/plugin-react-swc@4.3.3` | 2026-07-30 | 83 dias |
| `eslint@9.39.5` | 2026-07-10 | 103 dias |

Simulei com corte de 14 dias (`npm audit fix --package-lock-only --before=2026-10-07` mais o ESLint com o mesmo `--before`, sobre o lockfile da `main`):
- resolve `rollup` 4.64.0, `postcss` 8.5.29 e `typescript-eslint` 8.71.1;
- chega ao **mesmo resultado de auditoria** da Fase 1 sem corte: 5 vulnerabilidades (4 moderadas, 1 alta), só React Router e cadeia do Vite.

**Decisão (T2 = A)**: corte de 14 dias com `--before`, com a data registrada em cada fase (plano, D11).

Consequência para os números deste research: as versões citadas (8.3.4, 4.3.3, 7.18.4, 9.39.5, 7.3.7 e as transitivas) vêm da simulação **sem corte** e são referência. A versão usada em cada fase é a mais recente da faixa publicada antes do corte daquela fase, registrada na seção "Evidência da implementação".

Uma diferença que já se sabe: com corte contado a partir de 2026-10-21, o `vite@8.3.4` (2026-10-08) fica de fora e entra a 8.x anterior, também fora da faixa vulnerável (≤ 6.4.3).

Se nenhuma versão adequada existir antes do corte, a fase para e a mantenedora decide (plano, D11).

## 5. Método de captura de tela sem dependência nova

A lista é fixa (FR-016b). Vista a navegação do app, ela tem 6 estados:
1. dashboard ao vivo;
2. histórico de sessões;
3. análise com os gráficos e o mapa;
4. painel do coach com análise em cache;
5. painel do coach com a mensagem de indisponibilidade;
6. configurações.

São tirados duas vezes: antes, na `main`, e depois, na Fase 3. Se houver recuo para o Vite 7.3, tira-se uma terceira rodada.

| | A. Manual pela mantenedora | B. Playwright fora do `package.json` | C. Chrome headless (`chrome --headless --screenshot`) |
|---|---|---|---|
| Como | Navegador com a janela fixada pelo modo responsivo das DevTools (por exemplo 1440×900), percorrendo a lista e salvando cada captura com o nome da lista. | Script `.mjs` com `chromium.launch()`, `viewport` fixo, navegação e cliques (aba de comparação, botão do coach), espera por seletores e `page.screenshot()`. O Playwright é instalado num diretório **fora** dos dois repositórios (`npm i playwright@1.64.1`, mais `npx playwright install chromium`). | Uma chamada por URL com `--window-size`, usando o Chrome já instalado (`C:\Program Files\Google\Chrome\Application\chrome.exe`, presente). |
| Custo de preparo | Nenhum | ~10–15 min. Download do Chromium do Playwright (~150 MB, fora do repositório) e o script, escrito uma vez. | Nenhum |
| Custo por rodada | ~20–30 min de trabalho manual | ~1–2 min de execução, mais a conferência | segundos |
| Reprodutibilidade | Média: depende de repetir janela, rolagem, foco, hover e o momento do replay. | Alta: viewport, ordem, cliques e esperas são idênticos entre rodadas. Só os valores ao vivo variam, e a comparação é de layout. | Alta no que alcança, mas **não alcança** os estados 1, 4 e 5: não clica e não espera dados do WebSocket. Cobriria só 2, 3 (sem interação) e 6. |
| Dependência no projeto | Nenhuma | Nenhuma no `package.json`. O script fica versionado em `evidence/tools/` (T5). | Nenhuma |
| Quem executa | A mantenedora | O agente, depois que a mantenedora sobe a API (ponto 6) | O agente |
| Riscos | Divergência de tamanho de janela entre rodadas; esquecer um estado. | O script falha se o seletor mudar (não muda nesta feature, porque o código de UI não muda). Usa um Chromium próprio, não o navegador do dia a dia. Se o 503 do coach for clicado com chave presente, haveria chamada paga (mitigado no ponto 6). | Insuficiente para a lista fixa. |

- **Recomendação**: B, por ser o único que repete exatamente os mesmos passos antes e depois, e é isso que permite dizer "sem diferença" (SC-005).
- C fica descartado como método principal.
- Fica registrada uma variante de B sem download: dirigir o Chrome da mantenedora pela extensão do Claude in Chrome. Ela depende da extensão estar ativa e do tamanho da janela do Chrome real, então a reprodutibilidade é média.

**Decisão da mantenedora (T4 do plano, opção A)**: o método B desta tabela, Playwright fora dos dois repositórios.
- **Versão fixa**, escolhida pela regra do corte de 14 dias (D11) no dia da instalação e registrada aqui com a data de publicação. Em 2026-10-21, a regra daria a 1.63.0 (2026-09-04): a 1.64.0 saiu em 2026-10-07 e a 1.64.1 em 2026-10-14.
- **A instalação** (`npm i playwright@<versão>` num diretório fora dos repositórios, mais `npx playwright install chromium`) **para e espera a aprovação da mantenedora**.
- **O script de captura** fica em `evidence/tools/` (T5), com a versão do Playwright no comentário do topo.

## 6. Procedimento da conferência visual com a API

### Restrições

- Uma sessão do Claude Code por repositório. Esta sessão (do front) não executa nada no `TelemetryF1_API`.
- A cópia do banco é feita com `VACUUM INTO`, guardada fora dos dois repositórios e nunca commitada.
- A API roda sem `ANTHROPIC_API_KEY`.
- O replay da gravação de exemplo roda a 1x.

### O que a leitura do repositório da API mostrou (sem executar nada lá)

- O caminho do banco é fixo em `data/telemetry.db`. `DB_PATH` o substitui, e uma string vazia é tratada como "não definida" (`src/config/dbPath.ts`).
- O `CLAUDE.md` da API diz que testes manuais apontam `DB_PATH` para um banco temporário ou uma cópia, nunca para `data/telemetry.db`.
- O banco real hoje está em WAL: existem `telemetry.db-wal` e `telemetry.db-shm`. O `VACUUM INTO` gera um instantâneo consistente que inclui o conteúdo do WAL.
- `env.ts` lê `anthropicApiKey: process.env.ANTHROPIC_API_KEY || undefined`, então string vazia vale como ausente. O cliente é criado com `new Anthropic({ apiKey: env.anthropicApiKey })`, e tanto a rota quanto `generateCoaching` checam `isCoachingConfigured()` antes de chamar a API da Anthropic (`coachService.ts`).
- Em `analysisRouter.ts`, o `POST /sessions/:id/analysis`:
  1. procura no cache (`lap_analyses`) **antes** de checar a chave, e uma análise em cache é devolvida mesmo sem chave;
  2. sem cache e sem chave, responde `503 {"error": "coaching indisponível: configure ANTHROPIC_API_KEY"}` antes de montar os insights.
- **Por isso não existe um teste seguro "pela API" de que a chave está ausente.** Um POST de um par sem cache com a chave presente faria a chamada paga. A ausência da chave precisa ser garantida pela forma de subir a API, não por tentativa.
- O replay: `npm run replay -- recordings/demo-interlagos-tt-20hz-laps6-8.jsonl`, com `1x` como padrão. A gravação vem do release `sample-recording-v1`.
- O replayer (`tools/replayer.ts`) importa `env` só pelas portas e envia os pacotes por UDP. Quem grava a sessão e as voltas reproduzidas é a API, no banco apontado pelo `DB_PATH` dela.

### Como a API carrega o ambiente (lido no código, sem executar nada na API)

| Pergunta | Resposta | Evidência |
|---|---|---|
| Mecanismo | `import "dotenv/config"` no topo de `src/config/env.ts` e de `src/config/dbPath.ts`. Não há `dotenv.config({ path })`, `node --env-file` nem `process.loadEnvFile` em `src/` nem em `tools/`. | `grep -rn "dotenv\|env-file\|loadEnvFile"` em `src/`, `tools/` e `package.json`. Os scripts `dev`, `record` e `replay` são `ts-node-dev <arquivo>`, sem flag de ambiente. |
| Versão | `dotenv` 16.4.5 (`^16.4.5`) | `node_modules/dotenv/package.json` da API |
| `DOTENV_CONFIG_PATH` é respeitado? | Sim. `dotenv/config` chama `config(Object.assign({}, require('./lib/env-options'), …))`, e `env-options.js` faz `options.path = process.env.DOTENV_CONFIG_PATH`. | `node_modules/dotenv/config.js` e `lib/env-options.js` |
| Com o caminho alternativo, o `.env` padrão ainda é lido? | Não. `configDotenv` começa com `optionPaths = [dotenvPath]` (o `.env` do diretório corrente) e, com `options.path` em string, **substitui** a lista: `optionPaths = [_resolveHome(options.path)]`. | `lib/main.js`, função `configDotenv` |
| E se o caminho alternativo não existir? | O erro de leitura é guardado em `lastError` e nada é carregado, sem fallback para o `.env` padrão. A API falha na inicialização por falta de `WS_PORT`/`UDP_PORT`/`HTTP_PORT` (`readPort` lança). | `lib/main.js`, `configDotenv`; `src/config/env.ts`, `readPort` |
| Variáveis já no ambiente | Não são sobrescritas: `override` é `false` por padrão (só muda com `DOTENV_CONFIG_OVERRIDE`). Uma `ANTHROPIC_API_KEY` definida no Windows (variável de usuário ou de sistema) entraria mesmo com o `.env` alternativo. | `lib/main.js`, `populate` |

### Variável vazia no Windows (medido nesta máquina, sem envolver a API)

Comando: definir `PROBE_EMPTY` como string vazia no shell e perguntar ao Node se ela existe (`Object.prototype.hasOwnProperty.call(process.env, 'PROBE_EMPTY')`):

| Shell | Como foi definida | A variável chega ao processo? |
|---|---|---|
| `cmd` | `set PROBE_EMPTY=` | **Não**, é removida |
| Windows PowerShell 5.1.26100 | `$env:PROBE_EMPTY = ''` | **Não**, é removida |
| PowerShell 7.6.6 | `$env:PROBE_EMPTY = ''` | Sim, vazia |
| Git Bash | `PROBE_EMPTY= node …` | Sim, `""` |

- **No `cmd` e no Windows PowerShell 5.1**, "definir vazia" é remover. Aí o `dotenv` carregaria a chave do `.env` lido, e por isso ela não serve de proteção.
- **No PowerShell 7.6 e no Git Bash**, ela funciona, porque o `dotenv` não sobrescreve uma variável existente, mas só por causa do shell.
- **Conclusão**: a variável vazia não entra no procedimento.

### Proteções que valem e conferência sem custo

1. **`.env` alternativo sem chave** via `DOTENV_CONFIG_PATH`. É independente do shell, porque é o próprio `dotenv` que escolhe o arquivo, e falha de forma segura: com o caminho errado, a API não sobe.
2. **Conferência sem custo**, que também cobre uma chave herdada das variáveis do Windows. No diretório da API, no mesmo terminal e com as mesmas variáveis com que a API vai subir:

   ```bash
   node -e "require('dotenv/config'); console.log(Boolean(process.env.ANTHROPIC_API_KEY))"
   ```

   - É o mesmo `dotenv/config` que a API importa, com o mesmo `DOTENV_CONFIG_PATH` e o mesmo ambiente herdado.
   - `Boolean("")` é `false`, igual a `"" || undefined` no `env.ts`.
   - Imprime só `true` ou `false`, **nunca o valor**. O esperado é `false`.
   - **É passo da mantenedora ou da sessão da API**, não da sessão do front.
3. **Rede de segurança, não proteção do procedimento**: o limite de gastos no Console da Anthropic limita o prejuízo de qualquer erro, mas não impede a chamada.

**O procedimento fica seguro sem mudar a API.**

### Procedimento proposto

| # | Passo | Quem | Onde |
|---|---|---|---|
| 1 | Criar a pasta `C:\Telemetry\snapshots-002\` (irmã dos dois repositórios, fora de ambos). | Mantenedora | — |
| 2 | Gerar a cópia **mestra** com `VACUUM INTO 'C:/Telemetry/snapshots-002/telemetry-master.db'` sobre `data/telemetry.db`, só lendo o banco real. Conferir que a cópia abre e tem as tabelas (`sessions`, `laps`, `lap_analyses`). A regra da API de fazer backup antes de operar no banco real se aplica, mas o `VACUUM INTO` não escreve no original. | Mantenedora ou sessão do Claude Code na API | Repositório da API |
| 3 | Listar, na cópia mestra, uma sessão com análise em cache cujo `lapA` seja a **última** volta da sessão (o front sempre usa a mais recente como principal) e anotar o `lapB`. Anotar também uma volta de comparação **sem** cache na mesma sessão, para o estado de 503. | Mantenedora ou sessão da API | Repositório da API |
| 4 | Para cada rodada (antes, navegação da Fase 2 e depois; plano D8), copiar a mestra para `C:\Telemetry\snapshots-002\telemetry-run.db`. Cada rodada começa do mesmo estado, porque a API grava no banco a sessão reproduzida. | Mantenedora | — |
| 5 | No terminal da API, definir `DOTENV_CONFIG_PATH=C:\Telemetry\snapshots-002\api-conferencia.env` (cópia do `.env.example` só com as portas, sem a linha da chave) e `DB_PATH=C:\Telemetry\snapshots-002\telemetry-run.db`. Rodar a **conferência sem custo** e seguir só com `false`. Subir a API (`npm run dev`) e conferir no log `[db] usando banco em …` que o banco é a cópia. | Mantenedora ou sessão da API | Repositório da API |
| 6 | Num segundo terminal, com o mesmo `DOTENV_CONFIG_PATH`, iniciar o replay a 1x da gravação de exemplo. | Mantenedora ou sessão da API | Repositório da API |
| 7 | Gerar o build de produção do front da rodada e servi-lo com `npm run preview`, com `.env` apontando para a API local. Só começa depois que a mantenedora informar o `false` do passo 5. | Agente (esta sessão) | Front |
| 8 | Capturar os 6 estados da lista fixa com o Playwright (T4), com o mesmo viewport. O estado 5 é o clique em "analisar" na volta sem cache: a resposta tem de ser 503, e o painel mostra a mensagem. | Agente (esta sessão) | Front |
| 9 | Parar o replay e a API e apagar `telemetry-run.db`. A cópia mestra é mantida até o merge e depois apagada. | Mantenedora | — |

Notas:
- A **ordem dos estados** na captura importa: o dashboard ao vivo é capturado com o replay em curso (alguns segundos depois do início, num ponto fixo do roteiro). Os estados de histórico e análise usam sessões já gravadas na cópia, então não dependem do replay.
- **Nada da cópia é commitado.** `snapshots-002` fica fora dos dois repositórios, e o `.gitignore` do front não precisa mudar.
- **Se a sessão do front precisar de algo da API** (o id da sessão e as voltas do passo 3), a mantenedora informa. A sessão do front não consulta o banco.

## 7. Comparação do bundle

### Método

- Uma ferramenta de scratchpad (`bundleSizes.mjs`, só `node:fs` e `node:zlib`, sem dependência) percorre o `dist/` e imprime uma tabela Markdown. Ela tem, por arquivo, o caminho relativo, o tamanho bruto, o tamanho gzip nível 9 e o tamanho brotli qualidade 11, mais a linha de total. Rodada na simulação, os números estão no ponto 2 e abaixo.
- Os nomes com hash mudam a cada build. A comparação é por **papel**: `index.html`, o `.js` de entrada e o `.css`. Qualquer arquivo novo ou faltante é diferença a explicar.
- O build é medido **quatro vezes**: na `main`, antes da Fase 1 (junto com as capturas do "antes"), e ao fim de cada fase. Todos são medidos no Windows, com o Node do `.nvmrc`.
- Os números de referência para o SC-004 são o da `main` e o do fim da Fase 3. Os intermediários explicam de onde veio cada variação.
- O gatilho de explicação (SC-004) é a variação do **total**, em qualquer das três medidas, acima de 10% entre a `main` e o fim da Fase 3. É gatilho de explicação, não de reprovação.

### Onde fica registrado

- A tabela de cada medição vai para este `research.md`, numa seção "Evidência da implementação".
- **Ferramentas (T5 = A)**: ficam versionadas em `specs/002-npm-audit-triage/evidence/tools/`, cada uma com um comentário no topo dizendo como rodar. São `bundleSizes.mjs`, `devListen.mjs` e o script de captura.
- **Lint e typecheck**, conferidos sem criar arquivo no repositório:
  - **ESLint**: `npx eslint --stdin --stdin-filename specs/002-npm-audit-triage/evidence/tools/<arquivo>.mjs` com o conteúdo de `bundleSizes.mjs` e de `devListen.mjs` sai com 0 nos dois. `npx eslint --print-config` para um `.mjs` nesse caminho mostra **0 regras ativas**: o bloco com regras do `eslint.config.js` só cobre `**/*.{ts,tsx}`.
  - **Typecheck**: o `tsc -b` não alcança `specs/`. O `tsconfig.app.json` inclui `src`, e o `tsconfig.node.json` inclui `vite.config.ts` e `tools`, que é a pasta `tools/` da raiz.
  - No commit que traz as ferramentas, `npm run lint` e `npm run typecheck` são rodados de novo, e a saída é registrada.

### Números da simulação (referência, não evidência)

| Estado | Arquivos | Total bruto (B) | Total gzip -9 (B) | Total brotli 11 (B) | Variação gzip vs. `main` |
|---|---:|---:|---:|---:|---:|
| `main` (Vite 5.4.10, RR 6.27.0) | 3 | 223.793 | 70.411 | 61.886 | — |
| Fase 1 (Vite 5.4.21, RR 6.30.6) | 3 | não medido com a ferramenta; o relatório do próprio Vite deu JS 203,03 kB (gzip 65,89 kB), contra 202,98 kB (65,86 kB) na `main` | — | — | ≈ 0% |
| Fase 2 (RR 7.18.4) | 3 | 240.947 | 76.370 | 67.166 | +8,5% |
| Fase 3 (Vite 8.3.4) | 3 | 239.470 | 74.779 | 65.708 | +6,2% |

O crescimento vem do React Router 7 (+17 KB brutos no JS). O Vite 8 recupera um pouco com o minificador Oxc.

## Pendências que dependem da implementação

- **Evidência da CI de cada fase** (FR-006a): o id da execução e o resultado dos quatro checks.
- **As medições finais**: auditoria, bundle, navegadores-alvo e endereço de escuta.
- **As capturas e a comparação anotada** (SC-005).
- **A conferência dos alertas do Dependabot pela API do GitHub**, depois que a mantenedora os ligar.
