import AppRouter from "./router/router.tsx";
import { TelemetryProvider } from "./context/TelemetryProvider";

function App() {
  return (
    <TelemetryProvider>
      <AppRouter />
    </TelemetryProvider>
  )
}

export default App
