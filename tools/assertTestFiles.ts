import { globSync } from "node:fs";
import { TEST_PATTERN, checkDiscovery, filterTestFiles } from "./testDiscovery.ts";

const { exitCode, message } = checkDiscovery(filterTestFiles(globSync(TEST_PATTERN)));

(exitCode === 0 ? console.log : console.error)(`[assertTestFiles] ${message}`);
process.exit(exitCode);
