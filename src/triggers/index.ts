export {
  addTarget,
  addTargets,
  deleteTarget,
  deleteAllTargets,
  matchesFilter,
  matchesLiveTrafficTrigger,
  getLiveTrafficWorkflows,
  startLiveTrafficWatcher,
  stopLiveTrafficWatcher,
  openTargetSelector,
  closeTargetSelector,
  toggleStreamPause,
  toggleHistoryMode,
} from './live-traffic';

export type {
  AddTargetParams,
  AddTargetsParams,
  DeleteTargetParams,
  LiveTrafficFilterMatch,
} from './live-traffic';

export {
  toggleIntercept,
  openBrowser as openInterceptBrowser,
  trustCA as trustInterceptCA,
  toggleInterceptEnabled,
  forwardPaused,
} from './intercept';

export {
  forwardRequest as forwardInterceptRequest,
  forwardResponse as forwardInterceptResponse,
  dropRequest as dropInterceptRequest,
  forwardTab as forwardInterceptTab,
} from './intercept';

export {
  startAttack as startInvokerAttack,
  stopAttack as stopInvokerAttack,
  sendToInvoker,
  startInvokerAttack as startInvokerUiAttack,
  stopInvokerAttack as stopInvokerUiAttack,
} from './invoker';

export type { SendToInvokerOptions } from './invoker';

export {
  triggerScan,
  pauseScan as pauseBrowserScan,
  resumeScan as resumeBrowserScan,
  stopScan as stopBrowserScan,
  submitCrawlInput as submitBrowserCrawlInput,
  toggleBrowserCrawl,
  stopBrowserCrawl,
  startBrowserCrawl,
  setBrowserSearch,
} from './browser';
export type { TriggerScanOptions, SubmitCrawlInputOptions } from './browser';

export { sendToRepeater, sendRequest as sendRepeaterRequest } from './repeater';
export type { SendToRepeaterOptions } from './repeater';

export { writeDocument } from './documents';
export type { WriteDocumentOptions } from './documents';

export {
  buildPlayground,
  runPlayground,
  refreshPlaygroundTree,
  closePlaygroundFolder,
} from './playground';

