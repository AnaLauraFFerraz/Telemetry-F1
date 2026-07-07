function readEnvVar(name: keyof ImportMetaEnv): string {
  const value = import.meta.env[name];
  if (!value) {
    throw new Error(`Variável de ambiente ${name} não definida. Confira seu .env (veja .env.example).`);
  }
  return value;
}

export const env = {
  wsUrl: readEnvVar("VITE_WS_URL"),
  httpApiUrl: readEnvVar("VITE_HTTP_API_URL"),
};
