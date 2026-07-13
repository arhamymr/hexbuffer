// ponytail: simplify layout by using inline split inspector instead of full-screen drawer overlay
import * as React from 'react';
import { Button } from '@/components/ui/button';
import { TextEditor } from '@/components/ui/text-editor';
import { X, ArrowsIn, ArrowsOut } from '@phosphor-icons/react';
import { buildRawHttpRequest, buildRawHttpResponse } from '@/lib/http-message';
import type { AttackConfig, AttackResult, HttpRequest } from '../types';

function replaceMarkedValues(text: string, payloadValues: Record<string, string>) {
  let output = '';
  let searchStart = 0;
  let positionIndex = 0;

  while (true) {
    const start = text.indexOf('$', searchStart);
    if (start === -1) {
      break;
    }

    const end = text.indexOf('$', start + 1);
    if (end === -1) {
      break;
    }

    const positionName = `position_${positionIndex + 1}`;
    const defaultValue = text.slice(start + 1, end);
    output += text.slice(searchStart, start);
    output += payloadValues[positionName] ?? defaultValue;
    searchStart = end + 1;
    positionIndex += 1;
  }

  return output + text.slice(searchStart);
}

function buildModifiedRequest(config: AttackConfig, result: AttackResult) {
  const request: HttpRequest = {
    ...config.base_request,
    url: replaceMarkedValues(config.base_request.url, result.payload_values),
    body: replaceMarkedValues(config.base_request.body, result.payload_values),
    headers: Object.fromEntries(
      Object.entries(config.base_request.headers).map(([name, value]) => [
        replaceMarkedValues(name, result.payload_values),
        replaceMarkedValues(value, result.payload_values),
      ])
    ),
  };

  return buildRawHttpRequest(request);
}

function buildRawAttackResponse(result: AttackResult) {
  if (result.error) {
    return `Error\n\n${result.error}`;
  }

  if (!result.response) {
    return 'No response captured.';
  }

  return buildRawHttpResponse(result.response, { prettyJsonBody: true });
}

interface InvokerResultInspectorProps {
  selectedResult: AttackResult;
  config: AttackConfig;
  onClose: () => void;
}

export function InvokerResultInspector({
  selectedResult,
  config,
  onClose,
}: InvokerResultInspectorProps) {
  const [isStacked, setIsStacked] = React.useState(false);

  const modifiedRequest = React.useMemo(() => {
    return buildModifiedRequest(config, selectedResult);
  }, [config, selectedResult]);

  const rawResponse = React.useMemo(() => {
    return buildRawAttackResponse(selectedResult);
  }, [selectedResult]);

  return (
    <div className="flex h-full min-h-0 flex-col border-t bg-background">
      {/* Header bar */}
      <div className="flex items-center justify-between border-b bg-muted/30 px-3 py-1.5 shrink-0">
        <div className="flex items-center gap-3">
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Result #{selectedResult.id}</span>
          <span className="text-xs text-border">|</span>
          <span className="text-xs text-muted-foreground truncate max-w-[200px] font-mono">
            {selectedResult.payload_values ? Object.values(selectedResult.payload_values).join(', ') : ''}
          </span>
          {selectedResult.response_time_ms && (
            <>
              <span className="text-xs text-border">|</span>
              <span className="text-xs text-muted-foreground">{selectedResult.response_time_ms}ms</span>
            </>
          )}
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            title={isStacked ? "Split side-by-side" : "Stack vertically"}
            onClick={() => setIsStacked(!isStacked)}
          >
            {isStacked ? <ArrowsOut className="size-3.5" /> : <ArrowsIn className="size-3.5" />}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
          >
            <X className="size-3.5" />
          </Button>
        </div>
      </div>

      {/* Editor Content Area */}
      <div className={`min-h-0 flex-1 grid ${isStacked ? 'grid-rows-2 divide-y' : 'grid-cols-2 divide-x'} divide-border`}>
        {/* Request Pane */}
        <div className="flex min-h-0 flex-col overflow-hidden">
          <div className="border-b bg-muted/10 px-3 py-1 shrink-0">
            <span className="text-[11px] font-medium text-muted-foreground">Modified Request</span>
          </div>
          <div className="min-h-0 flex-1">
            <TextEditor
              value={modifiedRequest}
              options={{ readOnly: true }}
            />
          </div>
        </div>

        {/* Response Pane */}
        <div className="flex min-h-0 flex-col overflow-hidden">
          <div className="border-b bg-muted/10 px-3 py-1 shrink-0 flex items-center justify-between">
            <span className="text-[11px] font-medium text-muted-foreground">Captured Response</span>
            {selectedResult.response_length && (
              <span className="text-[10px] text-muted-foreground">{selectedResult.response_length} bytes</span>
            )}
          </div>
          <div className="min-h-0 flex-1">
            <TextEditor
              value={rawResponse}
              options={{ readOnly: true }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
