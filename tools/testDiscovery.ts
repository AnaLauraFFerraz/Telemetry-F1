export const TEST_PATTERN = "src/**/*.test.ts";

export function scriptUsesQuotedPattern(script: string, pattern: string): boolean {
  return script.includes(`"${pattern}"`);
}

export function filterTestFiles(paths: string[]): string[] {
  return paths.filter((path) => !path.split(/[\\/]/).includes("node_modules"));
}

export function checkDiscovery(files: string[]): { exitCode: number; message: string } {
  if (files.length === 0) {
    return { exitCode: 1, message: `nenhum arquivo de teste encontrado em ${TEST_PATTERN}` };
  }
  const found = files.length === 1 ? "1 arquivo de teste encontrado" : `${files.length} arquivos de teste encontrados`;
  return { exitCode: 0, message: `${found} em ${TEST_PATTERN}` };
}
