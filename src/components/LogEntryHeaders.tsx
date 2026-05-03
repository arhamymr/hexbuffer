import type { ProxyLogEntry } from '@/stores/trafficStore';

interface LogEntryHeadersProps {
  proxyData: ProxyLogEntry;
}

export function LogEntryHeaders({ proxyData }: LogEntryHeadersProps) {
  return (
    <div className="space-y-3 text-xs font-mono">
      <div>
        <div className="font-semibold text-muted-foreground mb-1">REQUEST HEADERS</div>
        <div className="bg-background p-2 rounded max-h-48 overflow-auto">
          {proxyData.request_headers ? (
            proxyData.request_headers.map(([k, v]) => (
              <div key={k} className="break-all"><span className="text-blue-600">{k}:</span> {v}</div>
            ))
          ) : (
            <span className="text-muted-foreground">No headers</span>
          )}
        </div>
      </div>
      {proxyData.response_headers && proxyData.response_headers.length > 0 && (
        <div>
          <div className="font-semibold text-muted-foreground mb-1">RESPONSE HEADERS</div>
          <div className="bg-background p-2 rounded max-h-48 overflow-auto">
            {proxyData.response_headers.map(([k, v]) => (
              <div key={k} className="break-all"><span className="text-green-600">{k}:</span> {v}</div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
