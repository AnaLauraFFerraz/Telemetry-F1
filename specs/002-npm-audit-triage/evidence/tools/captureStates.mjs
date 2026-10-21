// Captura os 6 estados da lista fixa do front, num viewport fixo, com o Playwright instalado FORA do repositório.
//
// Como rodar (o front de produção já servido por `npm run preview`, a API já no ar e a conferência da chave feita):
//   PLAYWRIGHT_BROWSERS_PATH=<pasta dos navegadores> node captureStates.mjs \
//     --playwright-dir <pasta onde o playwright foi instalado> --base http://localhost:4173 \
//     --prefix antes --session <id> --cache-lap <volta com análise em cache> --nocache-lap <volta sem cache> \
//     --out <pasta de saída> [--dashboard-wait-ms 8000]
//
// Entradas:
//   --playwright-dir  ou a variável PLAYWRIGHT_DIR: pasta com `npm i playwright@<versão>` (precisa ter node_modules/playwright).
//   PLAYWRIGHT_BROWSERS_PATH (variável, obrigatória): a pasta dos navegadores. Tem de ser a mesma definida na instalação
//                     (`npx playwright install chromium`), senão o Chromium não é encontrado.
//   --prefix          antes, depois ou depois-vite73 (o NN do nome do arquivo).
//
// Versão do Playwright usada nesta feature: 1.63.0 (o valor aprovado fica registrado no research.md).
// Sem o Playwright resolvido a partir de --playwright-dir ou PLAYWRIGHT_DIR, o script sai com mensagem clara:
// ele nunca tenta resolver o Playwright de dentro do repositório.
//
// Arquivos gerados em --out: NN-1-dashboard.png, NN-2-historico.png, NN-3-analise.png, NN-4-coach-cache.png,
// NN-5-coach-503.png, NN-6-configuracoes.png. No estado 5 o POST de análise tem de responder 503, senão o script falha.
import { createRequire } from "node:module";
import { mkdirSync } from "node:fs";
import { join, resolve } from "node:path";

function fail(message) {
  console.error(`captureStates: ${message}`);
  process.exit(1);
}

const args = Object.fromEntries(
  process.argv.slice(2).reduce((acc, token, i, all) => {
    if (token.startsWith("--")) acc.push([token.slice(2), all[i + 1]]);
    return acc;
  }, [])
);

const playwrightDir = args["playwright-dir"] ?? process.env.PLAYWRIGHT_DIR;
if (!playwrightDir) {
  fail("informe a pasta do Playwright com --playwright-dir ou PLAYWRIGHT_DIR (instalada fora do repositório).");
}
if (!process.env.PLAYWRIGHT_BROWSERS_PATH) {
  fail("defina PLAYWRIGHT_BROWSERS_PATH com a mesma pasta de navegadores usada na instalação.");
}
for (const name of ["base", "prefix", "session", "cache-lap", "nocache-lap", "out"]) {
  if (!args[name]) fail(`falta o argumento --${name}.`);
}

let chromium;
try {
  const requireFromPlaywrightDir = createRequire(join(resolve(playwrightDir), "package.json"));
  ({ chromium } = requireFromPlaywrightDir("playwright"));
} catch (err) {
  fail(`não achei o pacote playwright em ${resolve(playwrightDir)}: ${err.message}`);
}

const base = args.base.replace(/\/$/, "");
const prefix = args.prefix;
const sessionId = args.session;
const cacheLap = args["cache-lap"];
const noCacheLap = args["nocache-lap"];
const out = resolve(args.out);
const dashboardWaitMs = Number(args["dashboard-wait-ms"] ?? 8000);
const viewport = { width: 1440, height: 900 };

mkdirSync(out, { recursive: true });
const file = (n, name) => join(out, `${prefix}-${n}-${name}.png`);

const browser = await chromium.launch();
const page = await browser.newPage({ viewport });

async function settle() {
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(1000);
}

try {
  // 1. dashboard ao vivo, num ponto fixo do roteiro depois do início do replay
  await page.goto(`${base}/`);
  await page.waitForTimeout(dashboardWaitMs);
  await page.screenshot({ path: file(1, "dashboard"), fullPage: true });

  // 2. histórico de sessões
  await page.goto(`${base}/sessions`);
  await page.getByRole("button", { name: /^Abrir sessão/ }).first().waitFor();
  await settle();
  await page.screenshot({ path: file(2, "historico"), fullPage: true });

  // 3. análise com os gráficos e o mapa, com a volta de comparação que tem análise em cache
  await page.goto(`${base}/sessions/${sessionId}`);
  const cacheCheckbox = page.getByLabel(`Comparar volta ${cacheLap}`);
  await cacheCheckbox.waitFor();
  if (!(await cacheCheckbox.isChecked())) await cacheCheckbox.check();
  await settle();
  await page.screenshot({ path: file(3, "analise"), fullPage: true });

  // 4. coach com análise em cache: a resposta traz o selo "Análise em cache"
  await page.getByRole("button", { name: "Analisar diferença" }).click();
  await page.getByText("Análise em cache").waitFor();
  await settle();
  await page.screenshot({ path: file(4, "coach-cache"), fullPage: true });

  // 5. coach indisponível: volta de comparação sem cache; o POST tem de responder 503
  await page.getByLabel(`Comparar volta ${noCacheLap}`).check();
  await settle();
  const [response] = await Promise.all([
    page.waitForResponse((r) => r.request().method() === "POST" && r.url().includes(`/sessions/${sessionId}/analysis`)),
    page.getByRole("button", { name: "Analisar diferença" }).click(),
  ]);
  if (response.status() !== 503) {
    throw new Error(`o POST de análise sem cache respondeu ${response.status()}, esperado 503`);
  }
  await page.getByText("Coaching indisponível").waitFor();
  await settle();
  await page.screenshot({ path: file(5, "coach-503"), fullPage: true });

  // 6. configurações
  await page.goto(`${base}/settings`);
  await settle();
  await page.screenshot({ path: file(6, "configuracoes"), fullPage: true });

  console.log(`ok: 6 capturas em ${out} (prefixo ${prefix}, viewport ${viewport.width}x${viewport.height}, POST sem cache = 503)`);
} catch (err) {
  console.error(`captureStates: falhou: ${err.message}`);
  process.exitCode = 1;
} finally {
  await browser.close();
}
