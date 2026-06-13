import React from "react";
import { Routes, Route } from "react-router-dom";
import { LiveTrafficPage } from "@/pages/live-traffic";
import { InvokerPage } from "@/pages/invoker";
import { Settings } from "@/pages/settings";
import { RepeaterPage } from "@/pages/repeater";
import { InterceptPage } from "@/pages/intercept";
import { ToolsPage } from "@/pages/tools";
import { DocumentsPage } from "@/pages/documents";
import { BrowserAutomationPage } from "@/pages/browser";
import { ListenerPage } from "@/pages/listener";
import { DebuggerPage } from "@/pages/debugger";
import { AutomationPage } from "@/pages/automation";
import { ThreatsPage } from "@/pages/threats";
import { CaInstallDialog } from "@/components/ca-install-dialog";
import { AssistantPage } from "@/pages/assistant";
import { startLiveTrafficWatcher, stopLiveTrafficWatcher } from "@/triggers/live-traffic";
import { startPageCrawledWatcher, stopPageCrawledWatcher } from "@/triggers/browser-automation";

function AutomationEventWatchers() {
  React.useEffect(() => {
    startLiveTrafficWatcher();
    startPageCrawledWatcher();

    return () => {
      stopLiveTrafficWatcher();
      stopPageCrawledWatcher();
    };
  }, []);

  return null;
}

function AppRoutes() {
  return (
    <>
      <AutomationEventWatchers />
      <CaInstallDialog />
      <Routes>
        <Route path="/" element={<AssistantPage />} />
        <Route path="/live-traffic" element={<LiveTrafficPage />} />
        <Route path="/intercept" element={<InterceptPage />} />
        <Route path="/repeater" element={<RepeaterPage />} />
        <Route path="/invoker" element={<InvokerPage />} />
        <Route path="/browser-automation" element={<BrowserAutomationPage />} />
        <Route path="/listener" element={<ListenerPage />} />
        <Route path="/debugger" element={<DebuggerPage />} />
        <Route path="/tools" element={<ToolsPage />} />
        <Route path="/documents" element={<DocumentsPage />} />
        <Route path="/automation" element={<AutomationPage />} />
        <Route path="/threats" element={<ThreatsPage />} />
        <Route path="/settings" element={<Settings />} />
      </Routes>
    </>
  );
}

export default AppRoutes;
