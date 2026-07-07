import { Component, type ErrorInfo, type ReactNode } from "react";

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

/**
 * Sem isso, um erro de render em qualquer componente (ex: um campo
 * inesperadamente null vindo de um pacote malformado) deixa a tela toda em
 * branco sem explicação nenhuma pro usuário.
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error("[ErrorBoundary] erro de render:", error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: 24, maxWidth: 480 }}>
          <h2 style={{ margin: "0 0 8px" }}>Algo deu errado</h2>
          <p style={{ color: "var(--ink-dim)", fontSize: 13, margin: 0 }}>
            Recarregue a página. Se o erro persistir, confira o console do navegador para detalhes.
          </p>
        </div>
      );
    }
    return this.props.children;
  }
}
