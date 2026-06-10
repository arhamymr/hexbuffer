import { Routes, Route } from "react-router-dom";
import { LiveTrafficPage } from "@/pages/live-traffic";
import { InvokerPage } from "@/pages/invoker";
import { Settings } from "@/pages/settings";
import { RepeaterPage } from "@/pages/repeater";
import { InterceptPage } from "@/pages/intercept";
import { ToolsPage } from "@/pages/tools";
import { AIToolsPage } from "@/pages/ai-tools";
import { DocumentsPage } from "@/pages/documents";
import { BrowserAutomationPage } from "@/pages/browser";
import { ListenerPage } from "@/pages/listener";
import { DebuggerPage } from "@/pages/debugger";
import { InspectorPage } from "@/pages/inspector";
import { AutomationPage } from "@/pages/automation";
// import { PacketCapturePage } from "@/pages/packet-capture";
import { CaInstallDialog } from "@/components/ca-install-dialog";

function AppRoutes() {
  return (
    <>
      <CaInstallDialog />
      <Routes>
        <Route path="/" element={<LiveTrafficPage />} />
        <Route path="/intercept" element={<InterceptPage />} />
        <Route path="/repeater" element={<RepeaterPage />} />
        <Route path="/invoker" element={<InvokerPage />} />
        <Route path="/browser-automation" element={<BrowserAutomationPage />} />
        <Route path="/listener" element={<ListenerPage />} />
        {/* <Route path="/packet-capture" element={<PacketCapturePage />} /> */}
        <Route path="/debugger" element={<DebuggerPage />} />
        <Route path="/tools" element={<ToolsPage />} />
        <Route path="/ai-tools" element={<AIToolsPage />} />
        <Route path="/documents" element={<DocumentsPage />} />
        <Route path="/inspector" element={<InspectorPage />} />
        <Route path="/automation" element={<AutomationPage />} />
        <Route path="/settings" element={<Settings />} />
      </Routes>
    </>
  );
}

export default AppRoutes;
