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
  return { exitCode: 0, message: `${files.length} arquivos de teste encontrados em ${TEST_PATTERN}` };
}
