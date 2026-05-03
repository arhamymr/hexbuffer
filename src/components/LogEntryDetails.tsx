import type { ApiCall } from '@/types';
import { formatBytes } from './constants';

interface LogEntryDetailsProps {
  call: ApiCall;
}

export function LogEntryDetails({ call }: LogEntryDetailsProps) {
  return (
    <div className="space-y-3 text-xs font-mono">
      <div className="grid grid-cols-2 gap-2">
        <div>
          <span className="text-muted-foreground">Method:</span> {call.method}
        </div>
        <div>
          <span className="text-muted-foreground">Status:</span> {call.response_status}{' '}
          {call.response_status_text}
        </div>
        <div>
          <span className="text-muted-foreground">Host:</span> {call.host}
        </div>
        <div>
          <span className="text-muted-foreground">Path:</span> {call.path}
        </div>
        <div>
          <span className="text-muted-foreground">Duration:</span> {call.duration_ms}ms
        </div>
        <div>
          <span className="text-muted-foreground">Client Bytes:</span>{' '}
          {formatBytes(call.request_body_size)}
        </div>
        <div>
          <span className="text-muted-foreground">Server Bytes:</span>{' '}
          {formatBytes(call.response_body_size)}
        </div>
      </div>
      {call.url && (
        <div>
          <span className="text-muted-foreground">URL:</span>
          <div className="mt-1 p-2 bg-background rounded break-all">{call.url}</div>
        </div>
      )}
    </div>
  );
}