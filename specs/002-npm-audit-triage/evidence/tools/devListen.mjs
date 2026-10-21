// Sobe o servidor de dev do Vite (sem --host) no diretório atual, espera ficar pronto,
// mostra a saída do Vite e os sockets em LISTEN da porta, e encerra o processo.
// Como rodar (Windows, na raiz do projeto a medir, com as dependências instaladas):
//   node <caminho>/specs/002-npm-audit-triage/evidence/tools/devListen.mjs <porta>
// Usa o Vite de node_modules do diretório atual, não o do commit; netstat e taskkill são do Windows.
import { spawn, execSync } from "node:child_process";

const port = process.argv[2] ?? "5191";
const strip = (s) => s.replace(/\x1b\[[0-9;]*m/g, "");
const child = spawn(process.execPath, ["node_modules/vite/bin/vite.js", "--port", port, "--strictPort"], {
  env: { ...process.env, VITE_WS_URL: "ws://localhost:8080", VITE_HTTP_API_URL: "http://localhost:3001" },
});

let out = "";
const timer = setTimeout(() => finish("timeout esperando o Vite"), 30000);
child.stdout.on("data", (d) => {
  out += d.toString();
  if (/Local:/.test(strip(out))) setTimeout(() => finish(), 1500);
});
child.stderr.on("data", (d) => (out += d.toString()));

let done = false;
function finish(reason) {
  if (done) return;
  done = true;
  clearTimeout(timer);
  console.log(strip(out));
  if (reason) console.log(reason);
  const netstat = execSync("netstat -ano -p TCP & netstat -ano -p TCPv6", { shell: "cmd.exe" }).toString();
  console.log("--- LISTEN na porta " + port);
  console.log(netstat.split(/\r?\n/).filter((l) => l.includes(":" + port + " ") && /LISTEN/.test(l)).join("\n") || "(nenhum)");
  execSync(`taskkill /pid ${child.pid} /T /F`, { stdio: "ignore" });
  process.exit(0);
}
