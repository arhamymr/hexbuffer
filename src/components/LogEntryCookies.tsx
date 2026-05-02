import type { ProxyLogEntry } from '@/hooks/useDebugLogs';
import { CookieDisplay, parseCookieHeader } from './CookieDisplay';

interface LogEntryCookiesProps {
  proxyData: ProxyLogEntry;
}

export function LogEntryCookies({ proxyData }: LogEntryCookiesProps) {
  const requestCookies = parseCookieHeader(
    proxyData.request_headers?.find(([k]) => k.toLowerCase() === 'cookie')?.[1]
  );
  const responseCookies = parseCookieHeader(
    proxyData.response_headers?.find(([k]) => k.toLowerCase() === 'set-cookie')?.[1]
  );

  return (
    <div className="space-y-3 text-xs font-mono">
      <div>
        <div className="font-semibold text-muted-foreground mb-1">REQUEST COOKIES</div>
        <div className="bg-background p-2 rounded max-h-48 overflow-auto">
          <CookieDisplay cookies={requestCookies} />
        </div>
      </div>
      <div>
        <div className="font-semibold text-muted-foreground mb-1">RESPONSE COOKIES</div>
        <div className="bg-background p-2 rounded max-h-48 overflow-auto">
          <CookieDisplay cookies={responseCookies} />
        </div>
      </div>
    </div>
  );
}
