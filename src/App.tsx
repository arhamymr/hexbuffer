import React from "react";
import { Routes, Route } from "react-router-dom";
import { CaInstallDialog } from "@/components/ca-install-dialog";
import { startLiveTrafficWatcher, stopLiveTrafficWatcher } from "@/triggers/live-traffic";
import { startPageCrawledWatcher, stopPageCrawledWatcher } from "@/triggers/browser";

const OverviewPage = React.lazy(() =>
  import("@/pages/overview").then((m) => ({ default: m.OverviewPage }))
);
const LiveTrafficPage = React.lazy(() =>
  import("@/pages/live-traffic").then((m) => ({ default: m.LiveTrafficPage }))
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
const ToolsPage = React.lazy(() =>
  import("@/pages/tools").then((m) => ({ default: m.ToolsPage }))
);
const DocumentsPage = React.lazy(() =>
  import("@/pages/documents").then((m) => ({ default: m.DocumentsPage }))
);
const ApiCollectionPage = React.lazy(() =>
  import("@/pages/api-collection").then((m) => ({ default: m.ApiCollectionPage }))
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
const AutomationPage = React.lazy(() =>
  import("@/pages/automation").then((m) => ({ default: m.AutomationPage }))
);
const ThreatsPage = React.lazy(() =>
  import("@/pages/threats").then((m) => ({ default: m.ThreatsPage }))
);
const RegressionPage = React.lazy(() =>
  import("@/pages/regression").then((m) => ({ default: m.RegressionPage }))
);
const CodeAuditPage = React.lazy(() =>
  import("@/pages/code-audit").then((m) => ({ default: m.CodeAuditPage }))
);
const PlaygroundPage = React.lazy(() =>
  import("@/pages/code").then((m) => ({ default: m.PlaygroundPage }))
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
          <Route path="/live-traffic" element={<LiveTrafficPage />} />
          <Route path="/intercept" element={<InterceptPage />} />
          <Route path="/repeater" element={<RepeaterPage />} />
          <Route path="/invoker" element={<InvokerPage />} />
          <Route path="/browser" element={<BrowserAutomationPage />} />
          <Route path="/listener" element={<ListenerPage />} />
          <Route path="/debugger" element={<DebuggerPage />} />
          <Route path="/tools" element={<ToolsPage />} />
          <Route path="/documents" element={<DocumentsPage />} />
          <Route path="/api-collection" element={<ApiCollectionPage />} />
          <Route path="/automation" element={<AutomationPage />} />
          <Route path="/threats" element={<ThreatsPage />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/regression" element={<RegressionPage />} />
          <Route path="/code-audit" element={<CodeAuditPage />} />
          <Route path="/playground" element={<PlaygroundPage />} />
        </Routes>
      </React.Suspense>
    </>
  );
}

export default AppRoutes;
