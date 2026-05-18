import { Routes, Route } from "react-router-dom";
import { HttpHistoryPage } from "@/pages/http-history";
import { BruteForcePage } from "@/pages/brute-force";
import { Settings } from "@/pages/settings";
import { RepeaterPage } from "@/pages/repeater";
import { ToolsPage } from "@/pages/tools";
import { AIToolsPage } from "@/pages/ai-tools";
import { DashboardPage } from "@/pages/dashboard";

function AppRoutes() {
  return (
    <Routes>
      <Route path="/dashboard" element={<DashboardPage />} />
      <Route path="/" element={<HttpHistoryPage />} />
      <Route path="/repeater" element={<RepeaterPage />} />
      <Route path="/brute-force" element={<BruteForcePage />} />
      <Route path="/tools" element={<ToolsPage />} />
      <Route path="/ai-tools" element={<AIToolsPage />} />
      <Route path="/settings" element={<Settings />} />
    </Routes>
  );
}

export default AppRoutes;
