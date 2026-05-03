import type { ApiCall } from '@/types';

interface LogEntryBodyProps {
  call: ApiCall;
}

export function LogEntryBody({ call }: LogEntryBodyProps) {
  return (
    <div className="space-y-3 text-xs font-mono">
      <div>
        <div className="font-semibold text-muted-foreground mb-1">
          REQUEST BODY ({call.request_body_size || 0} bytes)
        </div>
        <div className="bg-background p-2 rounded max-h-48 overflow-auto whitespace-pre-wrap">
          {call.request_body || <span className="text-muted-foreground">No body</span>}
        </div>
      </div>
      <div>
        <div className="font-semibold text-muted-foreground mb-1">
          RESPONSE BODY ({call.response_body_size || 0} bytes)
        </div>
        <div className="bg-background p-2 rounded max-h-48 overflow-auto whitespace-pre-wrap">
          {call.response_body ? (
            call.response_body.length > 1000
              ? call.response_body.substring(0, 1000) + '...'
              : call.response_body
          ) : (
            <span className="text-muted-foreground">No body</span>
          )}
        </div>
      </div>
    </div>
  );
}