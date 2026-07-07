import { useCallback } from "react";
import { useFetch } from "./useFetch";
import { fetchSessions } from "./sessionsApi";

export function useSessions() {
  const fetcher = useCallback(() => fetchSessions(), []);
  return useFetch(fetcher, []);
}
