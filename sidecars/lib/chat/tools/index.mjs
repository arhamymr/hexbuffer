// Browser automation tools (scan lifecycle, navigation, tab detection, crawl context)
export {
  triggerScanDef,
  pauseScanDef,
  resumeScanDef,
  stopScanDef,
  navigateToDef,
  submitCrawlCredentialsDef,
  requestHumanSelectionDef,
  getBrowserTabsDef,
  getActiveBrowserTabDef,
  listCrawlSessionsDef,
  getCrawlContextDef,
  getRecentInsightsDef,
} from './browser-automation/index.mjs';

// Target scope tools
export { addScopeDef, deleteScopeDef, deleteAllScopesDef } from './live-traffic/index.mjs';

// URL analysis tools
export { extractFromUrlDef, analyzeTargetUrlDef } from './url-analysis/index.mjs';

// Traffic analysis tools
export { getProxySummaryDef, getProxyRequestDef, listProxyHostsDef } from './traffic-analysis/index.mjs';

// Testing tools
export { sendToInvokerDef, sendToRepeaterDef } from './testing-tools/index.mjs';

// Proxy tools
export { startProxyDef } from './proxy/index.mjs';

// Document tools
export { writeDocumentSectionDef } from './documents/index.mjs';

// Repeater tools
export {
  createWorkspaceDef,
  createCollectionDef,
  createFolderDef,
  createEndpointDef,
  selectEndpointDef,
  listWorkspacesDef,
  listCollectionsDef,
} from './repeater/index.mjs';
