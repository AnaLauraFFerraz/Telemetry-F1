import type { KeyboardEvent } from "react";
import type { SessionSummary } from "@/types/rest";
import { formatSessionDateTime, formatSessionDuration } from "@/utils/formatDate";
import { formatLapTime } from "@/utils/formatLapTime";
import styles from "./SessionsTable.module.css";

interface SessionsTableProps {
  sessions: SessionSummary[];
  onSelect: (id: number) => void;
}

export function SessionsTable({ sessions, onSelect }: SessionsTableProps) {
  function handleKeyDown(event: KeyboardEvent<HTMLTableRowElement>, id: number) {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      onSelect(id);
    }
  }

  return (
    <table className={styles.table}>
      <thead>
        <tr>
          <th>Sessão</th>
          <th>Duração</th>
          <th>Voltas</th>
          <th>Melhor volta</th>
          <th></th>
        </tr>
      </thead>
      <tbody>
        {sessions.map((session) => {
          const { date, time } = formatSessionDateTime(session.startedAt);
          return (
            <tr
              key={session.id}
              tabIndex={0}
              role="button"
              aria-label={`Abrir sessão de ${date} ${time}`}
              onClick={() => onSelect(session.id)}
              onKeyDown={(event) => handleKeyDown(event, session.id)}
            >
              <td>
                <span className={styles.date}>{date}</span>
                <span className={styles.time}>{time}</span>
              </td>
              <td className={styles.mono}>{formatSessionDuration(session.startedAt, session.lastSeenAt)}</td>
              <td className={styles.mono}>{session.lapCount}</td>
              <td className={`${styles.mono} ${styles.best}`}>{formatLapTime(session.bestLapTimeMs)}</td>
              <td className={styles.open}>abrir →</td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
