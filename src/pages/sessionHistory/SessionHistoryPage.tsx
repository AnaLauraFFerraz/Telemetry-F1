import { Link, useNavigate } from "react-router-dom";
import { useSessions } from "@/api/useSessions";
import { SessionsTable } from "@/components/sessions/SessionsTable";
import styles from "./SessionHistoryPage.module.css";

export default function SessionHistoryPage() {
  const navigate = useNavigate();
  const result = useSessions();

  return (
    <div className={styles.page}>
      <nav className={styles.nav}>
        <Link className={styles.navLink} to="/">
          ← Dashboard
        </Link>
        <Link className={styles.navLink} to="/settings">
          Config
        </Link>
      </nav>
      <div className={styles.header}>
        <h2>Sessões gravadas</h2>
        {result.status === "success" && <span className={styles.count}>{result.data.length} sessões</span>}
      </div>

      {result.status === "loading" && <p className={styles.state}>Carregando...</p>}
      {result.status === "error" && <p className={styles.state}>Erro ao carregar sessões: {result.error}</p>}
      {result.status === "success" && result.data.length === 0 && (
        <p className={styles.empty}>Nenhuma sessão gravada ainda. Jogue uma corrida com a API rodando.</p>
      )}
      {result.status === "success" && result.data.length > 0 && (
        <SessionsTable sessions={result.data} onSelect={(id) => navigate(`/sessions/${id}`)} />
      )}
    </div>
  );
}
