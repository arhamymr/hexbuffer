import * as React from 'react';

// Lazy load tool pages
const OverviewPage = React.lazy(() => import("@/pages/overview").then((m) => ({ default: m.OverviewPage })));
const HttpHistoryPage = React.lazy(() => import("@/pages/http-history").then((m) => ({ default: m.HttpHistoryPage })));
const WebSocketHistoryPage = React.lazy(() => import("@/pages/websocket-history").then((m) => ({ default: m.WebSocketHistoryPage })));
const InvokerPage = React.lazy(() => import("@/pages/invoker").then((m) => ({ default: m.InvokerPage })));
const Settings = React.lazy(() => import("@/pages/settings").then((m) => ({ default: m.Settings })));
const RepeaterPage = React.lazy(() => import("@/pages/repeater").then((m) => ({ default: m.RepeaterPage })));
const InterceptPage = React.lazy(() => import("@/pages/intercept").then((m) => ({ default: m.InterceptPage })));
const EncoderPage = React.lazy(() => import("@/pages/encoder").then((m) => ({ default: m.EncoderPage })));
const HashPage = React.lazy(() => import("@/pages/hash").then((m) => ({ default: m.HashPage })));
const ComparerPage = React.lazy(() => import("@/pages/comparer").then((m) => ({ default: m.ComparerPage })));
const PortScannerPage = React.lazy(() => import("@/pages/port-scanner").then((m) => ({ default: m.PortScannerPage })));
const JwtPage = React.lazy(() => import("@/pages/jwt").then((m) => ({ default: m.JwtPage })));
const XssGeneratorPage = React.lazy(() => import("@/pages/xss-generator").then((m) => ({ default: m.XssGeneratorPage })));
const SqlInjectionPage = React.lazy(() => import("@/pages/sql-injection").then((m) => ({ default: m.SqlInjectionPage })));
const DocumentsPage = React.lazy(() => import("@/pages/documents").then((m) => ({ default: m.DocumentsPage })));
const BrowserAutomationPage = React.lazy(() => import("@/pages/browser").then((m) => ({ default: m.BrowserAutomationPage })));
const ListenerPage = React.lazy(() => import("@/pages/listener").then((m) => ({ default: m.ListenerPage })));
const DebuggerPage = React.lazy(() => import("@/pages/debugger").then((m) => ({ default: m.DebuggerPage })));
const WorkflowPage = React.lazy(() => import("@/pages/workflow").then((m) => ({ default: m.AutomationPage })));
const RegressionPage = React.lazy(() => import("@/pages/regression").then((m) => ({ default: m.RegressionPage })));
const AssistantPage = React.lazy(() => import("@/layout/assistant").then((m) => ({ default: m.AssistantPage })));
const ScratchpadPage = React.lazy(() => import("@/pages/scratchpad").then((m) => ({ default: m.ScratchpadPage })));

export const pageComponentMap: Record<string, React.ComponentType<any>> = {
  '/': OverviewPage,
  '/http-history': HttpHistoryPage,
  '/websocket-history': WebSocketHistoryPage,
  '/intercept': InterceptPage,
  '/repeater': RepeaterPage,
  '/invoker': InvokerPage,
  '/browser': BrowserAutomationPage,
  '/listener': ListenerPage,
  '/debugger': DebuggerPage,
  '/encoder': EncoderPage,
  '/hash': HashPage,
  '/comparer': ComparerPage,
  '/port-scanner': PortScannerPage,
  '/jwt': JwtPage,
  '/xss-generator': XssGeneratorPage,
  '/sql-injection': SqlInjectionPage,
  '/documents': DocumentsPage,
  '/automation': WorkflowPage,
  '/settings': Settings,
  '/regression': RegressionPage,
  '/assistant': AssistantPage,
  '/scratchpad': ScratchpadPage,
};
