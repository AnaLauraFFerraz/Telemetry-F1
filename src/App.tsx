import AppRouter from "./router/router.tsx";
import { TelemetryProvider } from "./context/TelemetryProvider";
import { ErrorBoundary } from "./components/ErrorBoundary";

function App() {
  return (
    <ErrorBoundary>
      <TelemetryProvider>
        <AppRouter />
      </TelemetryProvider>
    </ErrorBoundary>
  )
}

export default App
