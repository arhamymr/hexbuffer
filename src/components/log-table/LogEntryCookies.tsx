import type { ApiCall } from '@/types';
import { CookieDisplay, parseCookieHeader } from './cookie-display';

interface LogEntryCookiesProps {
  call: ApiCall;
}

export function LogEntryCookies({ call }: LogEntryCookiesProps) {
  const requestCookies = parseCookieHeader(call.headers['cookie']);
  const responseCookies = parseCookieHeader(call.response_headers['set-cookie']);

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