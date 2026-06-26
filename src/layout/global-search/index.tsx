import { useLocation } from 'react-router-dom';

import { OverviewSearch } from './overview-search';
import { LiveTrafficSearch } from './live-traffic-search';
import { BrowserAutomationSearch } from './browser-automation-search';
import { InvokerSearch } from './invoker-search';
import { DefaultSearch } from './default-search';

// Pages where global search should be hidden
const HIDDEN_PATHS = [
  '/intercept', '/repeater',
  '/automation', '/regression',
  '/threats', '/debugger', '/documents',
  '/encoder', '/hash', '/comparer', '/port-scanner', '/jwt', '/xss-generator', '/sql-injection',
];

export function GlobalSearch() {
  const { pathname } = useLocation();

  if (HIDDEN_PATHS.some((p) => pathname.startsWith(p))) return null;

  if (pathname === '/') return <OverviewSearch />;
  if (pathname === '/live-traffic') return <LiveTrafficSearch />;
  if (pathname.startsWith('/browser-automation')) return <BrowserAutomationSearch />;
  if (pathname.startsWith('/invoker')) return <InvokerSearch />;

  return <DefaultSearch />;
}
