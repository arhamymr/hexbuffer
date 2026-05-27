import { Routes, Route } from "react-router-dom";
import { LiveTrafficPage } from "@/pages/live-traffic";
import { BruteForcePage } from "@/pages/brute-force";
import { Settings } from "@/pages/settings";
import { RepeaterPage } from "@/pages/repeater";
import { InterceptPage } from "@/pages/intercept";
import { ToolsPage } from "@/pages/tools";
import { AIToolsPage } from "@/pages/ai-tools";
import { DocumentsPage } from "@/pages/documents";
import { BrowserAutomationPage } from "@/pages/browser-automation";
import { PacketCapturePage } from "@/pages/packet-capture";
import { GlobalCaInstallDialog } from "@/components/global-ca-install-dialog";

function AppRoutes() {
  return (
    <>
      <GlobalCaInstallDialog />
      <Routes>
        <Route path="/" element={<LiveTrafficPage />} />
        <Route path="/intercept" element={<InterceptPage />} />
        <Route path="/repeater" element={<RepeaterPage />} />
        <Route path="/brute-force" element={<BruteForcePage />} />
        <Route path="/browser-automation" element={<BrowserAutomationPage />} />
        <Route path="/packet-capture" element={<PacketCapturePage />} />
        <Route path="/tools" element={<ToolsPage />} />
        <Route path="/ai-tools" element={<AIToolsPage />} />
        <Route path="/documents" element={<DocumentsPage />} />
        <Route path="/settings" element={<Settings />} />
      </Routes>
    </>
  );
}

export default AppRoutes;
