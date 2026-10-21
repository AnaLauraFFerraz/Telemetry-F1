// Lista os arquivos de um dist/ com tamanho bruto, gzip (nível 9) e brotli (qualidade 11).
// Como rodar: node specs/002-npm-audit-triage/evidence/tools/bundleSizes.mjs <caminho/do/dist>
// Só usa node:fs, node:path e node:zlib; imprime uma tabela Markdown com a linha de total.
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { gzipSync, brotliCompressSync, constants } from "node:zlib";

const root = process.argv[2];
if (!root) {
  console.error("uso: node bundleSizes.mjs <dist>");
  process.exit(1);
}

function walk(dir) {
  return readdirSync(dir).flatMap((name) => {
    const full = join(dir, name);
    return statSync(full).isDirectory() ? walk(full) : [full];
  });
}

const rows = walk(root)
  .map((file) => {
    const buf = readFileSync(file);
    return {
      file: relative(root, file).replaceAll("\\", "/"),
      raw: buf.length,
      gzip: gzipSync(buf, { level: 9 }).length,
      brotli: brotliCompressSync(buf, { params: { [constants.BROTLI_PARAM_QUALITY]: 11 } }).length,
    };
  })
  .sort((a, b) => a.file.localeCompare(b.file));

const total = rows.reduce((t, r) => ({ raw: t.raw + r.raw, gzip: t.gzip + r.gzip, brotli: t.brotli + r.brotli }), { raw: 0, gzip: 0, brotli: 0 });

console.log("| Arquivo | Bruto (B) | gzip -9 (B) | brotli 11 (B) |");
console.log("|---|---:|---:|---:|");
for (const r of rows) console.log(`| \`${r.file}\` | ${r.raw} | ${r.gzip} | ${r.brotli} |`);
console.log(`| **Total** | ${total.raw} | ${total.gzip} | ${total.brotli} |`);
