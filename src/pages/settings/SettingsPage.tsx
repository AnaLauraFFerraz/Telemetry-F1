import { Link } from "react-router-dom";
import { useTelemetry } from "@/context/useTelemetry";
import { useSessions } from "@/api/useSessions";
import { env } from "@/config/env";
import { useIsRecent } from "./useIsRecent";
import styles from "./SettingsPage.module.css";

function StatusDot({ variant }: { variant: "ok" | "warn" | "idle" }) {
  return <span className={`${styles.dot} ${styles[variant]}`} />;
}

export default function SettingsPage() {
  const { connectionState, lastMessageAt } = useTelemetry();
  const udpActive = useIsRecent(lastMessageAt);
  const restCheck = useSessions();

  const wsVariant = connectionState === "connected" ? "ok" : connectionState === "reconnecting" ? "warn" : "idle";
  const restVariant = restCheck.status === "success" ? "ok" : restCheck.status === "loading" ? "idle" : "warn";

  return (
    <div className={styles.page}>
      <nav className={styles.nav}>
        <Link className={styles.navLink} to="/">
          ← Dashboard
        </Link>
        <Link className={styles.navLink} to="/sessions">
          Sessões
        </Link>
      </nav>
      <div className={styles.grid}>
        <div className={styles.panel}>
          <div className={styles.panelTitle}>Conexão</div>
          <div className={styles.panelSub}>Status dos serviços da API</div>

          <div className={styles.row}>
            <div>
              <div className={styles.name}>Jogo → API (UDP)</div>
              <div className={styles.sub}>proxy: última mensagem recebida via WS</div>
            </div>
            <div className={styles.status}>
              <StatusDot variant={udpActive ? "ok" : "idle"} />
              {udpActive ? "Recebendo pacotes" : "Sem dados recentes"}
            </div>
          </div>

          <div className={styles.row}>
            <div>
              <div className={styles.name}>WebSocket</div>
              <div className={styles.sub}>{env.wsUrl}</div>
            </div>
            <div className={styles.status}>
              <StatusDot variant={wsVariant} />
              {connectionState === "connected" ? "Conectado" : connectionState === "reconnecting" ? "Reconectando" : "Conectando"}
            </div>
          </div>

          <div className={styles.row}>
            <div>
              <div className={styles.name}>API REST</div>
              <div className={styles.sub}>{env.httpApiUrl}</div>
            </div>
            <div className={styles.status}>
              <StatusDot variant={restVariant} />
              {restCheck.status === "success" ? "Operacional" : restCheck.status === "loading" ? "Verificando..." : "Indisponível"}
            </div>
          </div>
        </div>

        <div className={styles.panel}>
          <div className={styles.panelTitle}>Fonte de dados</div>
          <div className={styles.panelSub}>De onde a telemetria está vindo agora</div>

          <div className={`${styles.sourceOption} ${styles.sourceActive}`}>
            <div className={styles.radioDot} />
            <div>
              <div className={styles.sourceName}>Jogo ao vivo</div>
              <div className={styles.sourceDesc}>Escutando pacotes UDP do F1 24 em tempo real.</div>
            </div>
          </div>

          <div className={`${styles.sourceOption} ${styles.sourceDisabled}`}>
            <div className={styles.radioDot} />
            <div>
              <div className={styles.sourceName}>Gravação (replay)</div>
              <div className={styles.sourceDesc}>
                Ainda não controlável por aqui — rode <code>npm run replay</code> no terminal da API para testar
                contra uma sessão gravada.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
