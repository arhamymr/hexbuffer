import React from "react";
import { Routes, Route } from "react-router-dom";
import { CaInstallDialog } from "@/components/ca-install-dialog";
import { startLiveTrafficWatcher, stopLiveTrafficWatcher } from "@/triggers/live-traffic";
import { startPageCrawledWatcher, stopPageCrawledWatcher } from "@/triggers/browser";
import { ClipboardWatcher } from "@/components/clipboard-watcher";

const DesktopPage = React.lazy(() =>
  import("@/pages/desktop").then((m) => ({ default: m.DesktopPage }))
);
const HttpHistoryPage = React.lazy(() =>
  import("@/pages/live-traffic/http-history").then((m) => ({ default: m.HttpHistoryPage }))
);
const WebSocketHistoryPage = React.lazy(() =>
  import("@/pages/live-traffic/websocket-history").then((m) => ({ default: m.WebSocketHistoryPage }))
);
const InvokerPage = React.lazy(() =>
  import("@/pages/invoker").then((m) => ({ default: m.InvokerPage }))
);
const Settings = React.lazy(() =>
  import("@/pages/settings").then((m) => ({ default: m.Settings }))
);
const RepeaterPage = React.lazy(() =>
  import("@/pages/repeater").then((m) => ({ default: m.RepeaterPage }))
);
const InterceptPage = React.lazy(() =>
  import("@/pages/intercept").then((m) => ({ default: m.InterceptPage }))
);
const EncoderPage = React.lazy(() =>
  import("@/pages/encoder").then((m) => ({ default: m.EncoderPage }))
);
const HashPage = React.lazy(() =>
  import("@/pages/hash").then((m) => ({ default: m.HashPage }))
);
const ComparerPage = React.lazy(() =>
  import("@/pages/comparer").then((m) => ({ default: m.ComparerPage }))
);
const PortScannerPage = React.lazy(() =>
  import("@/pages/port-scanner").then((m) => ({ default: m.PortScannerPage }))
);
const JwtPage = React.lazy(() =>
  import("@/pages/jwt").then((m) => ({ default: m.JwtPage }))
);
const XssGeneratorPage = React.lazy(() =>
  import("@/pages/xss-generator").then((m) => ({ default: m.XssGeneratorPage }))
);
const SqlInjectionPage = React.lazy(() =>
  import("@/pages/sql-injection").then((m) => ({ default: m.SqlInjectionPage }))
);
const DocumentsPage = React.lazy(() =>
  import("@/pages/markdown").then((m) => ({ default: m.DocumentsPage }))
);

const BrowserAutomationPage = React.lazy(() =>
  import("@/pages/browser").then((m) => ({ default: m.BrowserAutomationPage }))
);
const ListenerPage = React.lazy(() =>
  import("@/pages/listener").then((m) => ({ default: m.ListenerPage }))
);
const InspectorPage = React.lazy(() =>
  import("@/pages/inspector").then((m) => ({ default: m.InspectorPage }))
);

const WorkflowPage = React.lazy(() =>
  import("@/pages/workflow").then((m) => ({ default: m.AutomationPage }))
);
const RegressionPage = React.lazy(() =>
  import("@/pages/regression").then((m) => ({ default: m.RegressionPage }))
);
const AssistantPage = React.lazy(() =>
  import("@/layout/assistant").then((m) => ({ default: m.AssistantPage }))
);
const ScratchpadPage = React.lazy(() =>
  import("@/pages/scratchpad").then((m) => ({ default: m.ScratchpadPage }))
);
const MockForgePage = React.lazy(() =>
  import("@/pages/mock-forge").then((m) => ({ default: m.MockForgePage }))
);
const KanbanPage = React.lazy(() =>
  import("@/pages/kanban").then((m) => ({ default: m.KanbanPage }))
);
const FileExplorerPage = React.lazy(() =>
  import("@/pages/file-explorer").then((m) => ({ default: m.FileExplorerPage }))
);
const TerminalPage = React.lazy(() =>
  import("@/pages/terminal").then((m) => ({ default: m.TerminalPage }))
);



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
      <ClipboardWatcher />
      <CaInstallDialog />
      <React.Suspense fallback={<div className="h-full flex items-center justify-center text-muted-foreground text-sm">Loading…</div>}>
        <Routes>
          <Route path="/" element={<DesktopPage />} />
          <Route path="/http-history" element={<HttpHistoryPage />} />
          <Route path="/websocket-history" element={<WebSocketHistoryPage />} />
          <Route path="/intercept" element={<InterceptPage />} />
          <Route path="/repeater" element={<RepeaterPage />} />
          <Route path="/invoker" element={<InvokerPage />} />
          <Route path="/browser" element={<BrowserAutomationPage />} />
          <Route path="/listener" element={<ListenerPage />} />
          <Route path="/inspector" element={<InspectorPage />} />
          <Route path="/encoder" element={<EncoderPage />} />
          <Route path="/hash" element={<HashPage />} />
          <Route path="/comparer" element={<ComparerPage />} />
          <Route path="/port-scanner" element={<PortScannerPage />} />
          <Route path="/jwt" element={<JwtPage />} />
          <Route path="/xss-generator" element={<XssGeneratorPage />} />
          <Route path="/sql-injection" element={<SqlInjectionPage />} />
          <Route path="/documents" element={<DocumentsPage />} />
          <Route path="/automation" element={<WorkflowPage />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/regression" element={<RegressionPage />} />
          <Route path="/assistant" element={<AssistantPage />} />
          <Route path="/scratchpad" element={<ScratchpadPage />} />
          <Route path="/mock-forge" element={<MockForgePage />} />
          <Route path="/kanban" element={<KanbanPage />} />
          <Route path="/file-explorer" element={<FileExplorerPage />} />
          <Route path="/terminal" element={<TerminalPage />} />


        </Routes>
      </React.Suspense>
    </>
  );
}

export default AppRoutes;
