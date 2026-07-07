import { Link } from "react-router-dom";
import styles from "./NotFoundPage.module.css";

export default function NotFoundPage() {
  return (
    <div className={styles.page}>
      <h2 className={styles.title}>Página não encontrada</h2>
      <p className={styles.sub}>Essa rota não existe no app de telemetria.</p>
      <Link className={styles.link} to="/">
        ← Voltar pro dashboard
      </Link>
    </div>
  );
}
