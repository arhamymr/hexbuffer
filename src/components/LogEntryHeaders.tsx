import type { ApiCall } from '@/types';

interface LogEntryHeadersProps {
  call: ApiCall;
}

export function LogEntryHeaders({ call }: LogEntryHeadersProps) {
  const requestHeaders = Object.entries(call.headers);
  const responseHeaders = Object.entries(call.response_headers);

  return (
    <div className="space-y-3 text-xs font-mono">
      <div>
        <div className="font-semibold text-muted-foreground mb-1">REQUEST HEADERS</div>
        <div className="bg-background p-2 rounded max-h-48 overflow-auto">
          {requestHeaders.length > 0 ? (
            requestHeaders.map(([k, v]) => (
              <div key={k} className="break-all">
                <span className="text-blue-600">{k}:</span> {v}
              </div>
            ))
          ) : (
            <span className="text-muted-foreground">No headers</span>
          )}
        </div>
      </div>
      {responseHeaders.length > 0 && (
        <div>
          <div className="font-semibold text-muted-foreground mb-1">RESPONSE HEADERS</div>
          <div className="bg-background p-2 rounded max-h-48 overflow-auto">
            {responseHeaders.map(([k, v]) => (
              <div key={k} className="break-all">
                <span className="text-green-600">{k}:</span> {v}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}