import type { ProxyLogEntry } from '@/stores/trafficStore';

interface LogEntryBodyProps {
  proxyData: ProxyLogEntry;
}

export function LogEntryBody({ proxyData }: LogEntryBodyProps) {
  return (
    <div className="space-y-3 text-xs font-mono">
      <div>
        <div className="font-semibold text-muted-foreground mb-1">REQUEST BODY ({proxyData.request_body_size || 0} bytes)</div>
        <div className="bg-background p-2 rounded max-h-48 overflow-auto whitespace-pre-wrap">
          {proxyData.request_body || <span className="text-muted-foreground">No body</span>}
        </div>
      </div>
      <div>
        <div className="font-semibold text-muted-foreground mb-1">RESPONSE BODY ({proxyData.response_body_size || 0} bytes)</div>
        <div className="bg-background p-2 rounded max-h-48 overflow-auto whitespace-pre-wrap">
          {proxyData.response_body ? (
            proxyData.response_body.length > 1000
              ? proxyData.response_body.substring(0, 1000) + '...'
              : proxyData.response_body
          ) : (
            <span className="text-muted-foreground">No body</span>
          )}
        </div>
      </div>
    </div>
  );
}
