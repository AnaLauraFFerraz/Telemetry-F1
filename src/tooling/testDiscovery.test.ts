import { test } from "node:test";
import assert from "node:assert/strict";
import { TEST_PATTERN, checkDiscovery, filterTestFiles } from "../../tools/testDiscovery.ts";

test("TEST_PATTERN é o glob do script test", () => {
  assert.equal(TEST_PATTERN, "src/**/*.test.ts");
});

test("checkDiscovery reprova a descoberta vazia com a mensagem em português", () => {
  const result = checkDiscovery([]);
  assert.equal(result.exitCode, 1);
  assert.equal(result.message, "nenhum arquivo de teste encontrado em src/**/*.test.ts");
});

test("checkDiscovery aprova e informa a contagem", () => {
  const result = checkDiscovery(["src/a.test.ts", "src/b/c.test.ts"]);
  assert.equal(result.exitCode, 0);
  assert.equal(result.message, "2 arquivos de teste encontrados em src/**/*.test.ts");
});

test("filterTestFiles descarta node_modules com separador /", () => {
  assert.deepEqual(
    filterTestFiles(["src/a/b.test.ts", "src/node_modules/x/a.test.ts"]),
    ["src/a/b.test.ts"],
  );
});

test("filterTestFiles descarta node_modules com separador \\", () => {
  assert.deepEqual(
    filterTestFiles(["src\\a\\b.test.ts", "src\\node_modules\\x\\a.test.ts"]),
    ["src\\a\\b.test.ts"],
  );
});

test("filterTestFiles mantém nomes parecidos com node_modules", () => {
  assert.deepEqual(
    filterTestFiles(["src/node_modules_old/a.test.ts", "src/x/node_modules/a.test.ts"]),
    ["src/node_modules_old/a.test.ts"],
  );
});
