# Feature Specification: Triagem e correção das vulnerabilidades do npm audit

**Feature Branch**: `002-npm-audit-triage`

**Created**: 2026-10-21

**Status**: Draft

**Input**: User description (texto integral do pedido, para que a spec não dependa da conversa):

> Triagem e correção das vulnerabilidades do npm audit do front, como pré-requisito para publicar a demo.
>
> Linha de base medida em 2026-10-21: 27 vulnerabilidades (1 baixa, 3 moderadas, 23 altas). Com --omit=dev: 3 no React Router 6.27 (uma alta, de XSS via open redirect, e duas moderadas: open redirect via barra invertida em <Link>/useNavigate e uma que só afeta renderização no servidor). As outras 24 estão em ferramentas de desenvolvimento: a cadeia do ESLint e do typescript-eslint, e o Vite 5.4 com o esbuild.
>
> Simulação medida num worktree descartável: o npm audit fix, dentro das faixas atuais, leva o React Router à 6.30.6 e resolve a alta, mas as duas moderadas só têm correção a partir da 7.18; o ESLint não sobe sozinho e precisa ir explicitamente para a 9.39.x; o Vite fica na 5.4.21, e a correção exige a major 8 (o Vite 5 já está sem suporte: a 8.3 recebe todas as correções, a 7.3 correções importantes e de segurança, a 6.4 só de segurança). Resultado da simulação: 7 vulnerabilidades (2 em produção, moderadas).
>
> Requisitos:
> - Zero vulnerabilidades em produção (npm audit --omit=dev) e zero no total, ou cada vulnerabilidade restante registrada com a justificativa.
> - React Router 7, pelo caminho de migração oficial a partir da 6.x (a plano confere na documentação). Verificar e registrar se o código passa entrada externa para <Link> ou navigate.
> - Vite 8 com o @vitejs/plugin-react-swc compatível, como decisão a confirmar no clarify (alternativa registrada: 7.3, se a troca de bundler quebrar algo não trivial).
> - ESLint 9.39.x, dentro da faixa atual.
> - Implementação em fases separadas e verificadas uma a uma: correções dentro das faixas atuais primeiro, depois o React Router 7, por último o Vite 8.
> - Verificação depois de cada fase: os quatro checks da CI verdes; e, depois do Vite, a comparação do bundle antes e depois (tamanho e arquivos gerados) e a conferência visual dos gráficos SVG, do mapa, do painel do coach e dos CSS Modules no build de produção servido localmente. Os navegadores-alvo do build ficam registrados.
> - Nenhum gate de npm audit na CI. A vigilância contínua fica com os alertas de segurança do Dependabot, ligados pela mantenedora nas configurações do repositório (tarefa manual).
> - Nenhuma mudança de comportamento da aplicação nem do contrato com a API.
>
> Fora do escopo: TypeScript 7 (o typescript-eslint atual não o suporta), ESLint 10, hospedagem e deploy da demo.
>
> Regras: Input completo e autossuficiente; decisões como perguntas no clarify; edição só com Edit e Write; sem trailer. Pare depois de gerar a spec, sem commitar.

## Clarifications

### Session 2026-10-21

Decisões confirmadas pela mantenedora:

- Q: Qual o critério para recuar do Vite 8 para o 7.3? → A: Recua para o 7.3 se, para o build passar e a conferência visual bater, for preciso mudar código da aplicação (e não só configuração ou dependências). O motivo do recuo fica registrado no `research.md`.
- Q: Mantém o `@vitejs/plugin-react-swc` ou migra para o `@vitejs/plugin-react`? → A: Mantém o `@vitejs/plugin-react-swc`, na versão compatível com o Vite 8. Trocar de plugin fica fora do escopo.
- Q: Quando e como a constituição é emendada? → A: Uma única emenda, no primeiro commit da implementação: tirar os números de major das bibliotecas em "Technology and Quality Constraints" (React, TypeScript strict, Vite, React Router), dizendo que as versões ficam no `package.json`, que é a fonte única. O Node ≥ 22.17 fica, por ser uma política com motivo. Assim a constituição é verdadeira antes e depois de cada troca. O `CLAUDE.md` e o `README.md`, que descrevem o que existe, mudam no mesmo commit de cada troca de versão. O Sync Impact Report vai no corpo do commit e no PR.
- Q: Um PR por fase ou um PR único? → A: Um PR só, com um push depois de cada fase, para que cada fase tenha a sua execução da CI registrada como evidência (a CI só roda na ponta do PR).
- Q: O servidor de desenvolvimento ganha alguma configuração de rede? → A: Não. Só se verifica e se registra no `research.md` que, sem `--host` e sem `server.host`, o Vite continua escutando apenas localmente depois da troca.
- Q: Como se confere o painel do coach no build de produção sem chamada paga? → A: A API roda sem `ANTHROPIC_API_KEY`, apontando por `DB_PATH` para uma cópia do banco real feita com `VACUUM INTO`, com análises já no cache. As análises em cache aparecem; uma análise nova deve responder 503. Nenhuma chamada paga.
- Q: Os 10% de variação do bundle reprovam a fase? → A: Não. São gatilho de explicação, não de reprovação.
- Q: Como a conferência visual compara o build novo com o antigo? → A: Por capturas de tela lado a lado, guardadas em `specs/002-npm-audit-triage/evidence/`, com a comparação anotada no `research.md`. As capturas do "antes" são tiradas na `main`, antes da Fase 1, para servir de referência a qualquer fase. A lista de telas e estados é fixa (dashboard ao vivo, histórico de sessões, análise com os gráficos e o mapa, painel do coach com uma análise em cache e com a mensagem de indisponibilidade, configurações), com o mesmo tamanho de janela antes e depois. A comparação é de layout e estilo, não dos valores ao vivo: a API roda sem `ANTHROPIC_API_KEY`, com `DB_PATH` apontando para a cópia do banco feita com `VACUUM INTO`, e o dashboard ao vivo recebe o replay da gravação de exemplo a 1x. O método de captura fica para o plano, sem adicionar dependência ao `package.json`.

## Linha de base medida

Medições de 2026-10-21 sobre o `package-lock.json` da `main` (`f762435`), Node 22.23.1, npm 10.9.8.

| Situação | Total | Produção (`--omit=dev`) |
|---|---|---|
| Hoje | 27 (1 baixa, 3 moderadas, 23 altas) | 3 (React Router) |
| Depois de `npm audit fix` dentro das faixas atuais (simulado num worktree descartável) | 7 (2 baixas, 4 moderadas, 1 alta) | 2 moderadas (React Router) |

O que sobra depois da simulação, e por quê:

| Item | Por que sobra |
|---|---|
| `react-router` e `react-router-dom` (produção) | Os advisories GHSA-wrjc-x8rr-h8h6 (open redirect via barra invertida em `<Link>`/`useNavigate`) e GHSA-337j-9hxr-rhxg (só renderização no servidor) têm faixa vulnerável `<7.18.0`. A 6.30.6, última 6.x, está dentro dela. |
| `vite` 5.4.21, `esbuild` 0.21.5 e `@vitejs/plugin-react-swc` 3.7.1 | Os 15 advisories do Vite têm faixa até 6.4.3. A correção que o npm oferece é a major 8.3.4. |
| `eslint` 9.13.0 e `@eslint/plugin-kit` 0.2.8 (baixa) | O `audit fix` não sobe o ESLint. A 9.39.5 existe e está na faixa `^9.13.0`. |

A cadeia do `typescript-eslint` (parser, plugin, `fast-glob`, `micromatch`, `braces`, `minimatch`, `brace-expansion`, `picomatch` e afins) é resolvida pelo `audit fix` dentro das faixas atuais.

## Verificação do código quanto a navegação com entrada externa

Conferido em 2026-10-21 sobre `src/` (a verificação definitiva e o registro formal ficam para o plano, FR-007):

- Todos os `<Link>` apontam para caminhos literais (`/`, `/sessions`, `/settings`).
- Os `navigate(...)` usam `"/sessions"` literal, ou `` `/sessions/${id}` `` em `SessionHistoryPage`, onde `id` é o número `session.id` vindo da resposta da API (tipado como `number`).
- A única leitura de parâmetro de rota é `useParams` em `SessionAnalysisPage`. Não há `useSearchParams` nem `useLocation`.
- Nenhum destino de navegação vem da URL, de formulário ou de entrada digitada.

Isso indica que as duas moderadas não são exploráveis pelo código atual. Mesmo assim a feature as corrige, porque o objetivo é zerar a auditoria de produção antes da demo pública.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - O que vai para o navegador sai sem vulnerabilidades conhecidas (Priority: P1)

A mantenedora publica a demo sabendo que as dependências que vão para o navegador não têm nenhum advisory aberto. As três vulnerabilidades do React Router (uma alta e duas moderadas) deixam de existir, e a navegação do app (links, botão de voltar, abertura de uma sessão) continua se comportando exatamente como antes.

**Why this priority**: É o pré-requisito declarado da demo e a única parte do risco que atinge quem usa o app. Isso não depende da troca de bundler.

**Independent Test**: Em um checkout limpo, rodar `npm ci` e `npm audit --omit=dev`: o resultado é zero vulnerabilidades. Percorrer as rotas do app (dashboard, histórico, análise de uma sessão, configurações, página inexistente) e comparar com o comportamento anterior.

**Acceptance Scenarios**:

1. **Given** o lockfile da fase de React Router, **When** a mantenedora roda `npm audit --omit=dev`, **Then** o relatório mostra zero vulnerabilidades.
2. **Given** o app em produção local, **When** a pessoa usa os links do dashboard, do histórico e das configurações, o botão de voltar da análise e abre uma sessão pela tabela, **Then** cada navegação leva à mesma rota que levava antes.
3. **Given** uma URL desconhecida, **When** a pessoa a abre, **Then** vê a página de rota inexistente, como antes.
4. **Given** uma sessão inexistente na URL de análise, **When** a pessoa a abre, **Then** vê o mesmo estado de erro de antes.

---

### User Story 2 - As ferramentas de desenvolvimento deixam de ter vulnerabilidades altas (Priority: P2)

A mantenedora e a CI usam um conjunto de ferramentas (lint, servidor de desenvolvimento, build) sem advisories altos ou críticos. A cadeia de lint sobe dentro das faixas atuais, e o servidor de desenvolvimento e o build passam para uma versão do Vite que ainda recebe correções.

**Why this priority**: Não afeta quem usa o app publicado, mas o servidor de desenvolvimento do Vite 5 tem bypass de `server.fs.deny` e leitura de respostas por qualquer site, riscos reais para a máquina da mantenedora quando o servidor está acessível além do localhost. O Vite 5 está sem suporte, então novas correções não chegam a ele.

**Independent Test**: Em um checkout limpo, rodar `npm ci` e `npm audit`: zero vulnerabilidades altas ou críticas e, idealmente, zero no total. As quatro verificações da CI passam.

**Acceptance Scenarios**:

1. **Given** o lockfile final, **When** a mantenedora roda `npm audit`, **Then** o relatório mostra zero vulnerabilidades altas ou críticas, e qualquer vulnerabilidade restante, de qualquer severidade, está registrada com justificativa.
2. **Given** o lockfile final, **When** a mantenedora roda `npm run lint`, **Then** passa com o ESLint na linha 9.39.x e sem mudança de regras.
3. **Given** o lockfile final, **When** a mantenedora roda `npm run dev`, **Then** o servidor sobe em `http://localhost:5173` e o app carrega.

---

### User Story 3 - O build de produção continua equivalente depois da troca de bundler (Priority: P2)

Ao trocar o Vite 5 pelo Vite 8, o app publicado continua visualmente e funcionalmente igual. A mantenedora tem uma comparação objetiva do bundle antes e depois e uma conferência visual dos pontos mais sensíveis: gráficos SVG, mapa da pista, painel do coach e estilos dos CSS Modules.

**Why this priority**: A troca do Vite muda o bundler, o minificador e o minificador de CSS, e o alvo de navegadores do build sobe. O risco é uma regressão silenciosa de visual que os testes unitários (só de funções puras) não pegam.

**Independent Test**: Gerar o build antes da fase do Vite e depois dela, listar arquivos e tamanhos dos dois, servir cada build localmente e comparar as capturas das telas da lista fixa (as do "antes" tiradas na `main`, antes da Fase 1).

**Acceptance Scenarios**:

1. **Given** o build de antes e o de depois da fase do Vite, **When** a mantenedora compara, **Then** existe um registro com os arquivos gerados e os tamanhos (bruto e comprimido) dos dois, e toda diferença relevante tem explicação.
2. **Given** o build de produção servido localmente, **When** a mantenedora abre a análise de duas voltas, **Then** os gráficos SVG têm o mesmo traçado, eixos, legenda e cores de antes.
3. **Given** o mesmo build, **When** a mantenedora abre o mapa da pista, o painel do coach e as telas com CSS Modules (dashboard, histórico, configurações), **Then** o layout, as cores e os estados são os mesmos de antes.
4. **Given** o build final, **When** a mantenedora consulta o registro, **Then** os navegadores-alvo do build estão anotados com o valor efetivo da versão instalada.

---

### User Story 4 - Cada fase é verificada antes da seguinte (Priority: P3)

A mudança chega em três fases separadas: correções dentro das faixas atuais, React Router 7 e Vite 8. Se uma fase quebrar algo, a anterior continua válida e dá para parar ali.

**Why this priority**: Controla o risco. Não entrega valor por si só, mas é o que permite aceitar a Fase 2 mesmo que a Fase 3 precise de ajuste ou recuo para o Vite 7.3.

**Independent Test**: Ao final de cada fase, os quatro checks da CI passam e a contagem de `npm audit` do estado daquela fase está registrada.

**Acceptance Scenarios**:

1. **Given** o fim da Fase 1, **When** a mantenedora roda `typecheck`, `lint`, `test` e `build`, **Then** os quatro passam, e o `npm audit` registrado mostra o resultado esperado da fase.
2. **Given** o fim da Fase 2, **When** a mantenedora roda os mesmos quatro scripts, **Then** os quatro passam, e o `npm audit --omit=dev` mostra zero.
3. **Given** o fim da Fase 3, **When** a mantenedora roda os quatro scripts e a comparação de bundle, **Then** os quatro passam e o registro de comparação existe.
4. **Given** uma fase que reprova, **When** a mantenedora decide, **Then** o plano indica o que fazer (corrigir, ou recuar para a alternativa registrada), sem reverter as fases já verificadas.
5. **Given** o PR único da feature, **When** a mantenedora dá push ao fim de uma fase, **Then** a execução da CI da ponta do PR daquela fase fica registrada como evidência (identificador da execução e resultado dos quatro checks) antes de a fase seguinte começar.

---

### User Story 5 - A vigilância contínua fica com o Dependabot, sem gate na CI (Priority: P3)

Depois da correção, novos advisories chegam à mantenedora como alertas de segurança do GitHub (Dependabot), ligados por ela nas configurações do repositório. A CI não reprova por causa de `npm audit`.

**Why this priority**: Evita que a CI passe a falhar por advisory novo de dependência de desenvolvimento, sem relação com a mudança do PR, e mantém a lista de checks (contrato com o ruleset e o selo do README) intacta.

**Independent Test**: Conferir que `.github/workflows/ci.yml` não ganhou nenhum passo ou job de `npm audit`, e que a documentação descreve a tarefa manual de ligar os alertas.

**Acceptance Scenarios**:

1. **Given** o workflow final, **When** a mantenedora o lê, **Then** continua com os quatro jobs `typecheck`, `lint`, `test` e `build`, sem passo de auditoria.
2. **Given** a documentação, **When** a mantenedora procura como ficar sabendo de novos advisories, **Then** encontra a instrução manual de ligar os alertas de segurança do Dependabot, marcada como tarefa dela, e não como algo já configurado.

---

### Edge Cases

- Para o build com o Vite 8 passar, ou para a conferência visual bater, é preciso mudar código da aplicação (e não só configuração ou dependências): recuar para a alternativa registrada, Vite 7.3, sem desfazer as Fases 1 e 2, e registrar o motivo no `research.md`. Nesse caso as vulnerabilidades restantes do Vite 7.3, se houver, são registradas com justificativa.
- O `@vitejs/plugin-react-swc` compatível com o Vite 8 exige outra versão major do plugin ou outro requisito de Node: registrar a combinação escolhida e conferir o `engines` do projeto.
- O `typescript-eslint` 8.72 só aceita TypeScript `<6.1.0`: o TypeScript permanece em 5.6 (fora do escopo subir para o 7).
- O `npm audit fix` altera o lockfile de maneiras não pretendidas (por exemplo, entradas opcionais de outras plataformas): conferir que a instalação limpa no Linux da CI funciona antes de aceitar a fase.
- Um novo advisory aparece entre a medição de 2026-10-21 e a implementação: a contagem final se compara com o `npm audit` do dia, não só com a linha de base, e a diferença é registrada.
- Uma vulnerabilidade restante sem correção publicada: fica registrada com a justificativa, a avaliação de exposição (produção ou desenvolvimento) e a condição em que o risco se materializa.
- O servidor de desenvolvimento do Vite 8 pode escutar em endereço diferente do atual (hoje pode ficar só no loopback IPv6, limitação conhecida): se mudar, a limitação é atualizada no `CLAUDE.md` e no `README.md` na mesma mudança.

## Requirements *(mandatory)*

### Functional Requirements

**Resultado da auditoria**

- **FR-001**: Ao final, `npm audit --omit=dev` DEVE mostrar zero vulnerabilidades.
- **FR-002**: Ao final, `npm audit` DEVE mostrar zero vulnerabilidades altas ou críticas. Cada vulnerabilidade restante, de qualquer severidade, DEVE ser registrada com justificativa, avaliação de exposição (produção ou desenvolvimento) e a condição em que o risco se materializa.
- **FR-003**: A feature DEVE registrar a contagem de `npm audit` e de `npm audit --omit=dev` ao final de cada fase, com a data da medição.

**Fases**

- **FR-004**: A implementação DEVE ser dividida em três fases verificadas uma a uma, nesta ordem: (1) correções dentro das faixas atuais, incluindo o ESLint na linha 9.39.x e o React Router na 6.30.x; (2) React Router 7; (3) Vite 8.
- **FR-005**: Cada fase DEVE terminar com `typecheck`, `lint`, `test` e `build` passando, antes de a seguinte começar.
- **FR-006**: Cada fase DEVE ser independente o bastante para que as anteriores continuem válidas se a seguinte for adiada ou recuada.
- **FR-006a**: As três fases DEVEM chegar em um único pull request, com um push ao fim de cada fase. A execução da CI da ponta do PR depois de cada push é a evidência da fase e DEVE ser registrada (identificador da execução e resultado dos quatro checks) antes de a fase seguinte começar.

**React Router 7**

- **FR-007**: O plano DEVE verificar e registrar se algum `<Link>` ou `navigate` recebe entrada externa (URL, parâmetro de rota, resposta da API, entrada digitada), com o resultado por ocorrência encontrada. A conferência preliminar da seção "Verificação do código quanto a navegação com entrada externa" é ponto de partida, não substitui o registro do plano.
- **FR-008**: A subida para o React Router 7 DEVE seguir o caminho de migração oficial a partir da 6.x. O plano DEVE conferir esse caminho na documentação oficial, não em suposição, e registrar as mudanças relevantes para este projeto (pacote usado nos imports, flags de transição, modo de uso da biblioteca).
- **FR-009**: Depois da migração, as rotas, os links, o botão de voltar, a abertura de sessão pela tabela e a página de rota inexistente DEVEM se comportar como antes.

**Vite 8**

- **FR-010**: O Vite DEVE subir para a major 8, com o `@vitejs/plugin-react-swc` mantido, na versão compatível com o Vite 8. Trocar para outro plugin do React está fora do escopo. A alternativa é o Vite 7.3 (com o `@vitejs/plugin-react-swc` compatível), e só se aplica se, para o build passar e a conferência visual bater, for preciso mudar código da aplicação (e não só configuração ou dependências); o motivo do recuo DEVE ser registrado no `research.md`.
- **FR-011**: O plano DEVE conferir na documentação oficial os breaking changes relevantes para este projeto na migração do Vite 5 para o 8 (passando ou não pelas majors intermediárias), e registrar os que se aplicam e os que não se aplicam à configuração atual.
- **FR-012**: Os navegadores-alvo do build, antes e depois, DEVEM ser registrados.
- **FR-013**: A compatibilidade do Node mínimo do projeto (`engines`, `.nvmrc`, CI) com os requisitos do Vite escolhido DEVE ser conferida e registrada. Se o mínimo atual deixar de bastar, a mudança é decisão a apresentar à mantenedora antes de ser feita.
- **FR-013a**: O servidor de desenvolvimento NÃO DEVE ganhar `--host` nem `server.host`. O plano DEVE verificar e registrar no `research.md` que, sem essas opções, o Vite 8 (ou o 7.3, se houver recuo) continua escutando apenas localmente.

**ESLint**

- **FR-014**: O ESLint DEVE subir para a linha 9.39.x, dentro da faixa já declarada em `package.json`, sem alterar regras nem a configuração. O TypeScript permanece em 5.6, o ESLint 10 e o TypeScript 7 ficam fora.

**Verificação do build**

- **FR-015**: Depois da fase do Vite, DEVE existir uma comparação do bundle antes e depois, com lista de arquivos gerados e tamanhos, e explicação para as diferenças relevantes.
- **FR-016**: Depois da fase do Vite, DEVE ser feita uma conferência visual no build de produção servido localmente, por capturas de tela lado a lado com a referência do "antes", cobrindo os gráficos SVG, o mapa da pista, o painel do coach e os estilos dos CSS Modules.
- **FR-016b**: As capturas do "antes" DEVEM ser tiradas na `main`, antes da Fase 1, e servir de referência a qualquer fase. A lista de telas e estados é fixa: dashboard ao vivo, histórico de sessões, análise com os gráficos e o mapa, painel do coach com uma análise em cache, painel do coach com a mensagem de indisponibilidade, e configurações. As capturas de antes e depois DEVEM usar o mesmo tamanho de janela. A comparação é de layout e estilo, não dos valores ao vivo.
- **FR-016c**: Para haver dados na conferência, a API roda como descrito em FR-016a e o dashboard ao vivo recebe o replay da gravação de exemplo a 1x. O método de captura é decisão do plano e NÃO DEVE adicionar dependência ao `package.json`. As capturas ficam em `specs/002-npm-audit-triage/evidence/` e a comparação anotada, no `research.md`.
- **FR-016a**: Na conferência do painel do coach, a API DEVE rodar sem `ANTHROPIC_API_KEY`, apontando por `DB_PATH` para uma cópia do banco real feita com `VACUUM INTO`, com análises já no cache. As análises em cache DEVEM aparecer; uma análise nova DEVE responder 503 e o painel DEVE mostrar a mensagem correspondente. Nenhuma chamada paga é feita, e a cópia do banco não é commitada.

**CI e vigilância contínua**

- **FR-017**: A CI NÃO DEVE ganhar nenhum gate de `npm audit`. Os checks `typecheck`, `lint`, `test` e `build` e o arquivo `ci.yml` permanecem como estão, por serem contrato com o ruleset e o selo do README.
- **FR-018**: A documentação DEVE registrar que os alertas de segurança do Dependabot são ligados pela mantenedora nas configurações do repositório, como tarefa manual dela, sem afirmar que já estão ligados.

**Sem mudança de comportamento**

- **FR-019**: A feature NÃO DEVE mudar o comportamento da aplicação nem o contrato com a API (WebSocket e REST). `src/types/` permanece intacto.
- **FR-020**: Nenhuma dependência nova de estado, gráfico ou dados DEVE ser introduzida (princípio III da constituição). Entram só as atualizações das dependências existentes e o que o Vite e o React Router exigirem.

**Documentação**

- **FR-021**: A constituição DEVE passar por uma única emenda, no primeiro commit da implementação: tirar os números de major das bibliotecas em "Technology and Quality Constraints" (React, TypeScript `strict`, Vite, React Router), dizendo que as versões ficam no `package.json`, que é a fonte única. O Node ≥ 22.17 permanece, por ser uma política com motivo. Assim a constituição é verdadeira antes e depois de cada troca de versão. O Sync Impact Report DEVE ir no corpo desse commit e na descrição do PR, e o incremento de versão da constituição segue a governança.
- **FR-022**: A documentação DEVE descrever só o que existe no código. O `CLAUDE.md` e o `README.md` DEVEM mudar no mesmo commit de cada troca de versão (menções a React Router, Vite, plugin e pilha). Qualquer limitação conhecida que mude (por exemplo, o endereço de escuta do servidor de desenvolvimento) é atualizada nos dois arquivos na mesma mudança.

### Key Entities

- **Vulnerabilidade registrada**: advisory com pacote, severidade, caminho de dependência (qual dependência direta puxa o pacote), exposição (produção ou desenvolvimento), estado final (resolvida ou restante) e, se restante, justificativa.
- **Fase**: conjunto de mudanças de dependência verificável sozinho, com a contagem de auditoria e o resultado dos quatro checks ao final.
- **Comparação de bundle**: lista de arquivos gerados e tamanhos antes e depois da fase do Vite, mais o registro dos navegadores-alvo.
- **Conferência visual**: lista de telas e elementos conferidos no build de produção servido localmente, com o resultado de cada um.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: `npm audit --omit=dev` em um checkout limpo mostra 0 vulnerabilidades (baseline: 3).
- **SC-002**: `npm audit` em um checkout limpo mostra 0 vulnerabilidades altas ou críticas (baseline: 23 altas), e o total é 0 ou cada restante está registrado com justificativa (baseline: 27).
- **SC-003**: Ao final de cada uma das 3 fases, os 4 checks da CI passam, e a contagem de `npm audit` daquela fase está registrada.
- **SC-004**: A comparação de bundle cobre 100% dos arquivos gerados pelo build antes e depois, e toda variação de tamanho total acima de 10% tem explicação registrada. Os 10% são gatilho de explicação, não de reprovação: com explicação registrada, a fase é aceita.
- **SC-005**: A conferência visual cobre 100% da lista fixa de telas e estados (dashboard ao vivo, histórico de sessões, análise com os gráficos e o mapa, painel do coach com análise em cache e com a mensagem de indisponibilidade, configurações), com capturas de antes e depois no mesmo tamanho de janela guardadas em `evidence/`, e toda diferença de layout ou estilo tem explicação anotada no `research.md`.
- **SC-006**: O número de jobs e os nomes dos checks do `ci.yml` são os mesmos de antes (4 checks: `typecheck`, `lint`, `test`, `build`), e nenhum passo de `npm audit` foi adicionado.
- **SC-007**: `src/types/` e o contrato com a API não têm nenhuma alteração, e nenhum teste existente precisou ser modificado para passar. Se algum precisar, a razão é registrada.
- **SC-008**: Os navegadores-alvo do build, antes e depois, estão registrados.

## Assumptions

- A medição de 2026-10-21 reflete o banco de advisories daquele dia. Novos advisories podem aparecer durante a implementação; a contagem final é comparada com o `npm audit` do dia da medição final.
- A simulação foi feita sobre a `main` em `f762435`, num worktree descartável removido depois; nada do repositório foi alterado por ela.
- O app é uma aplicação de cliente (SPA) sem renderização no servidor. O advisory de renderização no servidor do React Router não é explorável aqui, mas é corrigido junto, por fazer parte do pacote.
- O projeto usa `@vitejs/plugin-react-swc`, não `@vitejs/plugin-react`, e o plugin é mantido (decisão do clarify).
- Os guias de migração a conferir são os oficiais (`vite.dev`, `v7.vite.dev`, `v6.vite.dev` para o Vite e a documentação de upgrade do React Router). Em 2026-10-21 foram lidos para a triagem, e o plano os relê.
- A mantenedora liga o Dependabot manualmente e decide quando. A feature não depende disso para ser considerada concluída.
- A hospedagem e o deploy da demo são outro trabalho; esta feature só entrega a árvore de dependências sem vulnerabilidades conhecidas como pré-requisito.
- O Node mínimo atual (22.17) já atende o requisito do Vite 8 (`^20.19.0 || >=22.12.0`); o plano reconfere.
- A CI roda no Linux e a mantenedora desenvolve no Windows; ambas precisam funcionar depois de cada fase, inclusive os binários opcionais de plataforma que o lockfile ganha.
- Fora do escopo: TypeScript 7 (o `typescript-eslint` atual declara suporte a TypeScript `<6.1.0`), ESLint 10, hospedagem e deploy da demo, gate de `npm audit` na CI, e qualquer mudança de funcionalidade da aplicação.
