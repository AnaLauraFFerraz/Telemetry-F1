import { BrowserRouter, Routes, Route } from "react-router-dom";
import DashboardPage from "@/pages/dashboard/DashboardPage";
import SessionHistoryPage from "@/pages/sessionHistory/SessionHistoryPage";
import SessionAnalysisPage from "@/pages/sessionAnalysis/SessionAnalysisPage";
import SettingsPage from "@/pages/settings/SettingsPage";
import NotFoundPage from "@/pages/notFound/NotFoundPage";

function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<DashboardPage />} />
        <Route path="/sessions" element={<SessionHistoryPage />} />
        <Route path="/sessions/:id" element={<SessionAnalysisPage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </BrowserRouter>
  );
}

export default AppRouter;
