'use client';

import * as React from 'react';
import Editor from '@monaco-editor/react';
import { HttpRequest, ViewMode } from './types';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface RequestEditorProps {
  request: HttpRequest;
  viewMode: ViewMode;
  onChange: (request: Partial<HttpRequest>) => void;
}

export function RequestEditor({ request, viewMode, onChange }: RequestEditorProps) {
  const [headersText, setHeadersText] = React.useState('');
  const [paramsText, setParamsText] = React.useState('');

  React.useEffect(() => {
    const headers = Object.entries(request.headers)
      .map(([k, v]) => `${k}: ${v}`)
      .join('\n');
    setHeadersText(headers);

    try {
      const url = new URL(request.url);
      const params = Array.from(url.searchParams.entries())
        .map(([k, v]) => `${k}=${v}`)
        .join('&');
      setParamsText(params);
    } catch {
      setParamsText('');
    }
  }, [request.headers, request.url]);

  if (viewMode === 'params') {
    return (
      <div className="flex flex-col h-full p-4">
        <div className="grid grid-cols-4 gap-4 mb-4">
          <div className="col-span-1">
            <Label className="text-xs text-muted-foreground mb-1 block">Method</Label>
            <Select
              value={request.method}
              onValueChange={(value) => onChange({ method: value })}
            >
              <SelectTrigger className="h-8">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS'].map((m) => (
                  <SelectItem key={m} value={m}>
                    {m}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="col-span-3">
            <Label className="text-xs text-muted-foreground mb-1 block">URL</Label>
            <Input
              value={request.url}
              onChange={(e) => onChange({ url: e.target.value })}
              placeholder="http://example.com/path"
              className="h-8 font-mono text-sm"
            />
          </div>
        </div>

        <div className="mb-4">
          <Label className="text-xs text-muted-foreground mb-1 block">Query Parameters</Label>
          <textarea
            className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-mono h-24"
            placeholder="param1=value1&param2=value2"
            value={paramsText}
            onChange={(e) => {
              try {
                const url = new URL(request.url);
                url.search = e.target.value;
                onChange({ url: url.toString() });
              } catch {
                // ignore invalid URL
              }
            }}
          />
        </div>

        <div className="flex-1">
          <Label className="text-xs text-muted-foreground mb-1 block">Headers</Label>
          <textarea
            className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-mono h-48"
            placeholder="Content-Type: application/json"
            value={headersText}
            onChange={(e) => {
              const newHeaders: Record<string, string> = {};
              e.target.value.split('\n').forEach((line) => {
                const colonIndex = line.indexOf(':');
                if (colonIndex > 0) {
                  const key = line.substring(0, colonIndex).trim();
                  const value = line.substring(colonIndex + 1).trim();
                  if (key) newHeaders[key] = value;
                }
              });
              onChange({ headers: newHeaders });
            }}
          />
        </div>

        <div className="mt-4">
          <Label className="text-xs text-muted-foreground mb-1 block">Body</Label>
          <textarea
            className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-mono h-32"
            placeholder='{"key": "value"}'
            value={request.body}
            onChange={(e) => onChange({ body: e.target.value })}
          />
        </div>
      </div>
    );
  }

  if (viewMode === 'pretty') {
    return (
      <div className="flex flex-col h-full p-4">
        <div className="grid grid-cols-4 gap-4 mb-4">
          <div className="col-span-1">
            <Label className="text-xs text-muted-foreground mb-1 block">Method</Label>
            <Select
              value={request.method}
              onValueChange={(value) => onChange({ method: value })}
            >
              <SelectTrigger className="h-8">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS'].map((m) => (
                  <SelectItem key={m} value={m}>
                    {m}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="col-span-3">
            <Label className="text-xs text-muted-foreground mb-1 block">URL</Label>
            <Input
              value={request.url}
              onChange={(e) => onChange({ url: e.target.value })}
              placeholder="http://example.com/path"
              className="h-8 font-mono text-sm"
            />
          </div>
        </div>

        <div className="flex-1">
          <Label className="text-xs text-muted-foreground mb-1 block">Body</Label>
          <div className="border rounded-md h-64 overflow-hidden">
            <Editor
              height="100%"
              defaultLanguage="json"
              value={request.body}
              onChange={(value) => onChange({ body: value || '' })}
              theme="vs-dark"
              options={{
                minimap: { enabled: false },
                fontSize: 13,
                lineNumbers: 'on',
                wordWrap: 'on',
                formatOnPaste: true,
                automaticLayout: true,
              }}
            />
          </div>
        </div>
      </div>
    );
  }

  if (viewMode === 'hex') {
    const textToHex = (text: string): string => {
      const lines: string[] = [];
      for (let i = 0; i < text.length; i += 16) {
        const chunk = text.slice(i, i + 16);
        const hex = Array.from(chunk)
          .map((c) => c.charCodeAt(0).toString(16).padStart(2, '0'))
          .join(' ');
        const ascii = chunk
          .split('')
          .map((c) => (c.charCodeAt(0) >= 32 && c.charCodeAt(0) < 127 ? c : '.'))
          .join('');
        lines.push(
          `${i.toString(16).padStart(8, '0')}  ${hex.padEnd(48, ' ')}  ${ascii}`
        );
      }
      return lines.join('\n');
    };

    return (
      <div className="h-full p-4 bg-muted/50">
        <pre className="text-xs font-mono whitespace-pre-wrap">
          {textToHex(
            `${request.method} ${request.url} HTTP/1.1\n${Object.entries(request.headers)
              .map(([k, v]) => `${k}: ${v}`)
              .join('\n')}\n\n${request.body}`
          )}
        </pre>
      </div>
    );
  }

  const rawValue = `${request.method} ${request.url} HTTP/1.1
${Object.entries(request.headers)
  .map(([k, v]) => `${k}: ${v}`)
  .join('\n')}

${request.body}`;

  return (
    <Editor
      height="100%"
      defaultLanguage="http"
      value={rawValue}
      onChange={(value) => {
        if (!value) return;
        const lines = value.split('\n');
        const requestLine = lines[0].split(' ');
        if (requestLine.length >= 2) {
          const method = requestLine[0];
          const url = requestLine.slice(1).join(' ');

          const headers: Record<string, string> = {};
          let bodyStartIndex = 1;
          for (let i = 1; i < lines.length; i++) {
            if (lines[i].trim() === '') {
              bodyStartIndex = i + 1;
              break;
            }
            const colonIndex = lines[i].indexOf(':');
            if (colonIndex > 0) {
              const key = lines[i].substring(0, colonIndex).trim();
              const headerValue = lines[i].substring(colonIndex + 1).trim();
              headers[key] = headerValue;
            }
          }

          const body = lines.slice(bodyStartIndex).join('\n');

          onChange({
            method,
            url,
            headers,
            body,
          });
        }
      }}
      theme="vs-dark"
      options={{
        minimap: { enabled: false },
        fontSize: 13,
        lineNumbers: 'on',
        wordWrap: 'on',
        automaticLayout: true,
      }}
    />
  );
}