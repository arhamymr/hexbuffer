import React from "react";
import { Routes, Route } from "react-router-dom";
import { CaInstallDialog } from "@/components/ca-install-dialog";

const Settings = React.lazy(() =>
  import("@/pages/settings").then((m) => ({ default: m.Settings }))
);
const ApiCollectionPage = React.lazy(() =>
  import("@/pages/api-collection").then((m) => ({ default: m.ApiCollectionPage }))
);
const CodeAuditPage = React.lazy(() =>
  import("@/pages/code-audit").then((m) => ({ default: m.CodeAuditPage }))
);
const PlaygroundPage = React.lazy(() =>
  import("@/pages/code").then((m) => ({ default: m.PlaygroundPage }))
);

function AppRoutes() {
  return (
    <>
      <CaInstallDialog />
      <React.Suspense fallback={<div className="h-full flex items-center justify-center text-muted-foreground text-sm">Loading…</div>}>
        <Routes>
          <Route path="/" element={<PlaygroundPage />} />
          <Route path="/code-audit" element={<CodeAuditPage />} />
          <Route path="/api-collection" element={<ApiCollectionPage />} />
          <Route path="/settings" element={<Settings />} />
        </Routes>
      </React.Suspense>
    </>
  );
}

export default AppRoutes;
