import { useCallback } from "react";
import { useFetch } from "./useFetch";
import { fetchSessionDetail } from "./sessionsApi";

export function useSessionDetail(id: number) {
  const fetcher = useCallback(() => fetchSessionDetail(id), [id]);
  return useFetch(fetcher, [id]);
}
