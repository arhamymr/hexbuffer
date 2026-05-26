import { Navigate, Routes, Route } from "react-router-dom";
import { HttpHistoryPage } from "@/pages/http-history";
import { BruteForcePage } from "@/pages/brute-force";
import { Settings } from "@/pages/settings";
import { RepeaterPage } from "@/pages/repeater";
import { InterceptPage } from "@/pages/intercept";
import { ToolsPage } from "@/pages/tools";
import { AIToolsPage } from "@/pages/ai-tools";
import { DocumentsPage } from "@/pages/documents";
import { BrowserAutomationPage } from "@/pages/browser-automation";

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/history" replace />} />
      <Route path="/history" element={<HttpHistoryPage />} />
      <Route path="/intercept" element={<InterceptPage />} />
      <Route path="/repeater" element={<RepeaterPage />} />
      <Route path="/brute-force" element={<BruteForcePage />} />
      <Route path="/browser-automation" element={<BrowserAutomationPage />} />
      <Route path="/tools" element={<ToolsPage />} />
      <Route path="/ai-tools" element={<AIToolsPage />} />
      <Route path="/documents" element={<DocumentsPage />} />
      <Route path="/settings" element={<Settings />} />
    </Routes>
  );
}

export default AppRoutes;
