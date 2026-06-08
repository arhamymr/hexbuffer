// Browser automation tools (scan lifecycle, navigation, tab detection, crawl context)
export {
  // Scan lifecycle
  createTriggerScanTool,
  createPauseScanTool,
  createResumeScanTool,
  createStopScanTool,
  // Navigation & interaction
  createNavigateToTool,
  createSubmitCrawlCredentialsTool,
  createRequestHumanSelectionTool,
  // Tab detection
  createGetBrowserTabsTool,
  createGetActiveBrowserTabTool,
  // Crawl context
  createListCrawlSessionsTool,
  createGetCrawlContextTool,
  createGetRecentInsightsTool,
} from './browser-automation/index.mjs';

// Target scope tools
export { createAddScopeTool, createDeleteScopeTool, createDeleteAllScopesTool } from './live-traffic/index.mjs';

// URL analysis tools
export {
  createExtractFromUrlTool,
  createAnalyzeTargetUrlTool,
} from './url-analysis/index.mjs';

// Traffic analysis tools
export {
  createGetProxySummaryTool,
  createGetProxyRequestTool,
  createListProxyHostsTool,
} from './traffic-analysis/index.mjs';

// Testing tools
export {
  createSendToInvokerTool,
  createSendToRepeaterTool,
} from './testing-tools/index.mjs';

// Proxy tools
export { createStartProxyTool } from './proxy/index.mjs';

// Document tools
export { createWriteDocumentSectionTool } from './documents/index.mjs';
