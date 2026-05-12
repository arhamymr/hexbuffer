import { Routes, Route, useLocation } from "react-router-dom";
import { useEffect } from "react";
import { useAppStore } from "@/stores/appStore";
import { TabBar } from "@/components/tab-bar";
import { TargetSelectorDialog } from "@/components/target-selector-dialog";
import { Card, CardContent } from "@/components/ui/card";
import { RepeaterPage } from "@/components/repeater";
import { BruteForcePage } from "@/components/brute-force";
import { FindingsPage } from "@/components/findings";
import { DebuggerPage } from "@/components/DebuggerPage";
import { Settings } from "@/components/settings";

function HomePage() {
  const location = useLocation();
  const pathname = location.pathname;

  const targets = useAppStore((s) => s.targets);
  const routeTabs = useAppStore((s) => s.routeTabs);
  const activeTabId = useAppStore((s) => s.activeTabId);
  const fetchTargets = useAppStore((s) => s.fetchTargets);
  const addTab = useAppStore((s) => s.addTab);

  const tabs = routeTabs[pathname] || [];
  const activeTab = (tabs.length > 0 && activeTabId[pathname])
    ? tabs.find(t => t.id === activeTabId[pathname]) || tabs[0]
    : tabs[0] || null;

  useEffect(() => {
    fetchTargets();
  }, [fetchTargets]);

  const activeTarget = targets.find(t => t.id === activeTab?.targetId) || null;

  const handleAddTab = (target: typeof activeTarget) => {
    if (target) {
      addTab(pathname, target);
    }
  };

  return (
    <div className="h-full flex flex-col border-b">
      <div className="flex items-center gap-2 mb-2">
        <TabBar route={pathname} />
        <TargetSelectorDialog
          existingTargets={targets}
          onTargetSelected={handleAddTab}
          onTargetsUpdated={fetchTargets}
        />
      </div>

      {tabs.length === 0 ? (
        <Card>
          <CardContent className="py-12">
            <div className="text-center text-muted-foreground">
              <p className="mb-2">No target selected</p>
              <p className="text-sm mb-4">Create or select a target to start capturing API calls</p>
              <TargetSelectorDialog
                existingTargets={targets}
                onTargetSelected={(target) => {
                  handleAddTab(target);
                }}
                onTargetsUpdated={fetchTargets}
              />
            </div>
          </CardContent>
        </Card>
      ) : activeTarget ? (
        <Card>
          <CardContent className="py-12">
            <div className="text-center text-muted-foreground">
              <p className="mb-2">Target: {activeTarget.name}</p>
              <p className="text-sm">Proxy functionality has been removed</p>
            </div>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}

function HistoryPageContent() {
  const location = useLocation();
  const pathname = location.pathname;

  const targets = useAppStore((s) => s.targets);
  const fetchTargets = useAppStore((s) => s.fetchTargets);
  const getActiveTab = useAppStore((s) => s.getActiveTab);
  const getRouteTabs = useAppStore((s) => s.getRouteTabs);
  const addTab = useAppStore((s) => s.addTab);
  const tabs = getRouteTabs(pathname);
  const activeTab = getActiveTab(pathname);

  useEffect(() => {
    fetchTargets();
  }, [fetchTargets]);

  const activeTarget = targets.find(t => t.id === activeTab?.targetId) || null;

  const handleAddTab = (target: typeof activeTarget) => {
    if (target) {
      addTab(pathname, target);
    }
  };

  return (
    <>
      <div className="flex items-center gap-2 mb-4">
        <TabBar route={pathname} />
        <TargetSelectorDialog
          existingTargets={targets}
          onTargetSelected={handleAddTab}
          onTargetsUpdated={fetchTargets}
        />
      </div>
      {tabs.length === 0 ? (
        <Card>
          <CardContent className="py-12">
            <div className="text-center text-muted-foreground">
              <p className="mb-2">No target selected</p>
              <p className="text-sm mb-4">Create or select a target to view history</p>
              <TargetSelectorDialog
                existingTargets={targets}
                onTargetSelected={(target) => {
                  handleAddTab(target);
                }}
                onTargetsUpdated={fetchTargets}
              />
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          <h1 className="text-3xl font-bold">History</h1>
          <p className="text-muted-foreground">Coming soon...</p>
        </div>
      )}
    </>
  );
}

function FindingsPageContent() {
  const location = useLocation();
  const pathname = location.pathname;

  const targets = useAppStore((s) => s.targets);
  const fetchTargets = useAppStore((s) => s.fetchTargets);
  const getActiveTab = useAppStore((s) => s.getActiveTab);
  const getRouteTabs = useAppStore((s) => s.getRouteTabs);
  const addTab = useAppStore((s) => s.addTab);
  const tabs = getRouteTabs(pathname);
  const activeTab = getActiveTab(pathname);

  useEffect(() => {
    fetchTargets();
  }, [fetchTargets]);

  const activeTarget = targets.find(t => t.id === activeTab?.targetId) || null;

  const handleAddTab = (target: typeof activeTarget) => {
    if (target) {
      addTab(pathname, target);
    }
  };

  return (
    <>
      <div className="flex items-center gap-2 mb-4">
        <TabBar route={pathname} />
        <TargetSelectorDialog
          existingTargets={targets}
          onTargetSelected={handleAddTab}
          onTargetsUpdated={fetchTargets}
        />
      </div>
      {tabs.length === 0 ? (
        <Card>
          <CardContent className="py-12">
            <div className="text-center text-muted-foreground">
              <p className="mb-2">No target selected</p>
              <p className="text-sm mb-4">Create or select a target to view findings</p>
              <TargetSelectorDialog
                existingTargets={targets}
                onTargetSelected={(target) => {
                  handleAddTab(target);
                }}
                onTargetsUpdated={fetchTargets}
              />
            </div>
          </CardContent>
        </Card>
      ) : (
        <FindingsPage
          targets={targets.map((t) => ({ id: t.id, name: t.name }))}
          selectedTargetId={activeTarget?.id || null}
        />
      )}
    </>
  );
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/repeater" element={<RepeaterPageWrapper />} />
      <Route path="/brute-force" element={<BruteForcePage />} />
      <Route path="/history" element={<HistoryPageContent />} />
      <Route path="/debugger" element={<DebuggerPage />} />
      <Route path="/findings" element={<FindingsPageContent />} />
      <Route path="/settings" element={<Settings />} />
    </Routes>
  );
}

function RepeaterPageWrapper() {
  const pendingRepeaterRequest = useAppStore((s) => s.pendingRepeaterRequest);
  const setPendingRepeaterRequest = useAppStore((s) => s.setPendingRepeaterRequest);
  const [initialRequest, setInitialRequest] = React.useState<any>(null);

  React.useEffect(() => {
    if (pendingRepeaterRequest) {
      setInitialRequest(pendingRepeaterRequest);
      setPendingRepeaterRequest(null);
    }
  }, [pendingRepeaterRequest, setPendingRepeaterRequest]);

  return <RepeaterPage initialRequest={initialRequest} />;
}

export default AppRoutes;