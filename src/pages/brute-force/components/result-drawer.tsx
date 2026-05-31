'use client';

import {
  Drawer,
  DrawerContent,
} from '@/components/ui/drawer';
import { TextEditor } from '@/components/ui/text-editor';
import { buildRawHttpRequest, buildRawHttpResponse } from '@/lib/http-message';
import { useBruteForceStore } from '@/stores/bruto-force';
import type { AttackConfig, AttackResult, HttpRequest } from '../types';

function replaceMarkedValues(text: string, payloadValues: Record<string, string>) {
  let output = '';
  let searchStart = 0;
  let positionIndex = 0;

  while (true) {
    const start = text.indexOf('§', searchStart);
    if (start === -1) {
      break;
    }

    const end = text.indexOf('§', start + 1);
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

export function BruteForceResultDrawer() {
  const selectedResult = useBruteForceStore((s) => {
    const tab = s.tabs.find((t) => t.id === s.activeTabId);
    return tab?.selectedResult ?? null;
  });
  const config = useBruteForceStore((s) => {
    const tab = s.tabs.find((t) => t.id === s.activeTabId);
    return tab?.config ?? null;
  });
  const setSelectedResult = useBruteForceStore((s) => s.setSelectedResult);

  return (
    <Drawer
      open={Boolean(selectedResult)}
      onOpenChange={(open) => {
        if (!open) {
          setSelectedResult(null);
        }
      }}
    >
      <DrawerContent className="h-[88vh] max-h-[88vh]">
        <div className="grid min-h-0 flex-1 grid-cols-2 gap-3 p-4">
          <div className="flex min-h-0 flex-col overflow-hidden rounded-lg border bg-background">
            <div className="border-b bg-muted/50 px-3 py-2">
              <span className="text-sm font-medium">Modified Request</span>
            </div>
            <div className="min-h-0 flex-1">
              <TextEditor
                language="http"
                value={
                  selectedResult && config
                    ? buildModifiedRequest(config, selectedResult)
                    : 'Select a result to preview the modified request.'
                }
                options={{
                  readOnly: true,
                  scrollBeyondLastLine: false,
                }}
              />
            </div>
          </div>

          <div className="flex min-h-0 flex-col overflow-hidden rounded-lg border bg-background">
            <div className="flex items-center justify-between gap-3 border-b bg-muted/50 px-3 py-2">
              <span className="text-sm font-medium">Response</span>
              {selectedResult && (
                <span className="text-xs text-muted-foreground">
                  {selectedResult.response_time_ms ? `${selectedResult.response_time_ms}ms` : '-'}
                </span>
              )}
            </div>
            <div className="min-h-0 flex-1">
              <TextEditor
                language="http"
                value={
                  selectedResult
                    ? buildRawAttackResponse(selectedResult)
                    : 'Select a result to preview the response.'
                }
                options={{
                  readOnly: true,
                  scrollBeyondLastLine: false,
                }}
              />
            </div>
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
