import { useCallback, useEffect, useState } from "react";

export type FetchState<T> = { status: "loading" } | { status: "error"; error: string } | { status: "success"; data: T };

/**
 * Hook genérico de data-fetching. Sem lib (react-query/SWR) - o volume de
 * chamadas do app (3 endpoints, sem mutação, sem cache cross-page) não
 * justifica a dependência.
 */
export function useFetch<T>(fn: () => Promise<T>, deps: unknown[]): FetchState<T> & { refetch: () => void } {
  const [state, setState] = useState<FetchState<T>>({ status: "loading" });
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setState({ status: "loading" });

    fn()
      .then((data) => {
        if (!cancelled) setState({ status: "success", data });
      })
      .catch((err: unknown) => {
        if (!cancelled) setState({ status: "error", error: err instanceof Error ? err.message : "Erro desconhecido" });
      });

    return () => {
      cancelled = true;
    };
    // fn é recriada a cada render pelo chamador; deps explícitas evitam refetch em loop.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, reloadToken]);

  const refetch = useCallback(() => setReloadToken((t) => t + 1), []);

  return { ...state, refetch };
}
