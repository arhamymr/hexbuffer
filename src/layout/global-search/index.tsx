import { useLocation } from 'react-router-dom';

import { DesktopSearch } from './desktop-search';
import { HttpHistorySearch } from './http-history-search';
import { WebSocketHistorySearch } from './websocket-history-search';
import { BrowserAutomationSearch } from './browser-automation-search';
import { InvokerSearch } from './invoker-search';
import { ListenerSearch } from './listener-search';
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

  if (pathname === '/') return <DesktopSearch />;
  if (pathname === '/http-history') return <HttpHistorySearch />;
  if (pathname === '/websocket-history') return <WebSocketHistorySearch />;
  if (pathname.startsWith('/browser-automation')) return <BrowserAutomationSearch />;
  if (pathname.startsWith('/invoker')) return <InvokerSearch />;
  if (pathname.startsWith('/listener')) return <ListenerSearch />;

  return <DefaultSearch />;
}
