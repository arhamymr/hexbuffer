import React from "react";
import { Routes, Route } from "react-router-dom";
import { CaInstallDialog } from "@/components/ca-install-dialog";
import { startLiveTrafficWatcher, stopLiveTrafficWatcher } from "@/triggers/live-traffic";
import { startPageCrawledWatcher, stopPageCrawledWatcher } from "@/triggers/browser";

const OverviewPage = React.lazy(() =>
  import("@/pages/overview").then((m) => ({ default: m.OverviewPage }))
);
const HttpHistoryPage = React.lazy(() =>
  import("@/pages/http-history").then((m) => ({ default: m.HttpHistoryPage }))
);
const WebSocketHistoryPage = React.lazy(() =>
  import("@/pages/websocket-history").then((m) => ({ default: m.WebSocketHistoryPage }))
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
  import("@/pages/documents").then((m) => ({ default: m.DocumentsPage }))
);

const BrowserAutomationPage = React.lazy(() =>
  import("@/pages/browser").then((m) => ({ default: m.BrowserAutomationPage }))
);
const ListenerPage = React.lazy(() =>
  import("@/pages/listener").then((m) => ({ default: m.ListenerPage }))
);
const DebuggerPage = React.lazy(() =>
  import("@/pages/debugger").then((m) => ({ default: m.DebuggerPage }))
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
      <React.Suspense fallback={<div className="h-full flex items-center justify-center text-muted-foreground text-sm">Loading…</div>}>
        <Routes>
          <Route path="/" element={<OverviewPage />} />
          <Route path="/http-history" element={<HttpHistoryPage />} />
          <Route path="/websocket-history" element={<WebSocketHistoryPage />} />
          <Route path="/intercept" element={<InterceptPage />} />
          <Route path="/repeater" element={<RepeaterPage />} />
          <Route path="/invoker" element={<InvokerPage />} />
          <Route path="/browser" element={<BrowserAutomationPage />} />
          <Route path="/listener" element={<ListenerPage />} />
          <Route path="/debugger" element={<DebuggerPage />} />
          <Route path="/encoder" element={<EncoderPage />} />
          <Route path="/hash" element={<HashPage />} />
          <Route path="/comparer" element={<ComparerPage />} />
          <Route path="/port-scanner" element={<PortScannerPage />} />
          <Route path="/jwt" element={<JwtPage />} />
          <Route path="/xss-generator" element={<XssGeneratorPage />} />
          <Route path="/sql-injection" element={<SqlInjectionPage />} />
          <Route path="/documents" element={<DocumentsPage />} />
          <Route path="/workflow" element={<WorkflowPage />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/regression" element={<RegressionPage />} />
          <Route path="/assistant" element={<AssistantPage />} />
          <Route path="/scratchpad" element={<ScratchpadPage />} />

        </Routes>
      </React.Suspense>
    </>
  );
}

export default AppRoutes;
