import { globSync, readFileSync } from "node:fs";
import {
  TEST_PATTERN,
  checkDiscovery,
  filterTestFiles,
  scriptUsesQuotedPattern,
} from "./testDiscovery.ts";

const testScript: string = JSON.parse(readFileSync("package.json", "utf8")).scripts?.test ?? "";

if (!scriptUsesQuotedPattern(testScript, TEST_PATTERN)) {
  console.error(
    `[assertTestFiles] o script test do package.json precisa conter "${TEST_PATTERN}" entre aspas duplas`,
  );
  process.exit(1);
}

const { exitCode, message } = checkDiscovery(filterTestFiles(globSync(TEST_PATTERN)));

(exitCode === 0 ? console.log : console.error)(`[assertTestFiles] ${message}`);
process.exit(exitCode);
