import { Badge } from '@/components/ui/badge';
import {
  InspectorSection,
  buildCookiesList,
  buildHeadersList,
  buildParamsList,
} from '@/pages/live-traffic/components/log-table/inspector';
import { StatusBadge, getMethodBadge } from '@/pages/live-traffic/components/log-table/utils';
import { getBodyPreview } from '../lib/packet-utils';
import type { HttpMessage } from '../types';

interface HttpParserPanelProps {
  message?: HttpMessage;
}

export function HttpParserPanel({ message }: HttpParserPanelProps) {
  if (!message) {
    return (
      <div className="flex h-full items-center justify-center p-4 text-center text-sm text-muted-foreground">
        Select HTTP traffic to view parsed method, headers, cookies, query params, and decoded body.
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="border-b px-3 py-2">
        <div className="flex items-center gap-2">
          {message.direction === 'request' && message.method ? getMethodBadge(message.method) : <StatusBadge status={message.statusCode ?? null} />}
          <span className="min-w-0 truncate font-mono text-xs">
            {message.direction === 'request' ? `${message.host ?? ''}${message.url ?? ''}` : message.statusText}
          </span>
        </div>
      </div>
      <div className="min-h-0 flex-1 overflow-auto p-3">
        <InspectorSection title="Headers" items={buildHeadersList(message.headers)} defaultView="table" />
        <InspectorSection title="Cookies" items={buildCookiesList(message.cookies)} defaultView="table" defaultOpen={false} />
        <InspectorSection title="Query Params" items={buildParamsList(message.queryParams)} defaultView="table" defaultOpen={false} />
        <InspectorSection
          title={`Body Preview (${message.bodyPreviewType})`}
          items={[{ name: 'Body', value: getBodyPreview(message) }]}
          defaultView="text"
        />
      </div>
    </div>
  );
}
