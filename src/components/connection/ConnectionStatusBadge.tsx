import type { ConnectionState } from "@/context/telemetryContext";
import styles from "./ConnectionStatusBadge.module.css";

const STATE_META: Record<ConnectionState, { dotClass: "ok" | "warn" | "idle"; text: string }> = {
  connected: { dotClass: "ok", text: "Conectado" },
  connecting: { dotClass: "idle", text: "Conectando" },
  reconnecting: { dotClass: "warn", text: "Reconectando" },
  disconnected: { dotClass: "idle", text: "Desconectado" },
};

interface ConnectionStatusBadgeProps {
  state: ConnectionState;
  label?: string;
}

export function ConnectionStatusBadge({ state, label }: ConnectionStatusBadgeProps) {
  const meta = STATE_META[state];
  return (
    <div className={styles.badge}>
      <span className={`${styles.dot} ${styles[meta.dotClass]}`} />
      <span className={styles.text}>{label ? `${label} · ${meta.text}` : meta.text}</span>
    </div>
  );
}
