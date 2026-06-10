export {
  addTarget,
  addTargets,
  deleteTarget,
  deleteAllTargets,
} from './live-traffic';

export type {
  AddTargetParams,
  AddTargetsParams,
  DeleteTargetParams,
} from './live-traffic';

export {
  toggleIntercept,
  openBrowser as openInterceptBrowser,
  trustCA as trustInterceptCA,
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
} from './invoker';

export type { SendToInvokerOptions } from './invoker';

export {
  triggerScan,
  pauseScan as pauseBrowserScan,
  resumeScan as resumeBrowserScan,
  stopScan as stopBrowserScan,
  submitCrawlInput as submitBrowserCrawlInput,
} from './browser-automation';
export type { TriggerScanOptions, SubmitCrawlInputOptions } from './browser-automation';

export { sendToRepeater } from './repeater';
export type { SendToRepeaterOptions } from './repeater';

export { writeDocument } from './documents';
export type { WriteDocumentOptions } from './documents';
