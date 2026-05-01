'use client';

import Editor from '@monaco-editor/react';
import { HttpResponse, ViewMode } from './types';

interface ResponseViewerProps {
  response: HttpResponse | null;
  viewMode: ViewMode;
  isLoading: boolean;
}

export function ResponseViewer({ response, viewMode, isLoading }: ResponseViewerProps) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="flex flex-col items-center gap-2 text-muted-foreground">
          <div className="h-8 w-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <span className="text-sm">Waiting for response...</span>
        </div>
      </div>
    );
  }

  if (!response) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-muted-foreground text-sm">
          Send a request to see the response
        </div>
      </div>
    );
  }

  if (viewMode === 'render') {
    return (
      <div className="h-full overflow-auto p-4">
        <iframe
          srcDoc={response.body}
          className="w-full h-full border-0"
          sandbox="allow-scripts allow-same-origin"
          title="Response preview"
        />
      </div>
    );
  }

  if (viewMode === 'pretty') {
    let prettyBody = response.body;
    try {
      const json = JSON.parse(response.body);
      prettyBody = JSON.stringify(json, null, 2);
    } catch {
      // Not JSON, try HTML formatting
      if (response.body.includes('<')) {
        prettyBody = response.body;
      }
    }

    return (
      <Editor
        height="100%"
        defaultLanguage="json"
        value={prettyBody}
        theme="vs-dark"
        options={{
          readOnly: true,
          minimap: { enabled: false },
          fontSize: 13,
          lineNumbers: 'on',
          wordWrap: 'on',
          automaticLayout: true,
        }}
      />
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
      <div className="h-full p-4 bg-muted/50 overflow-auto">
        <pre className="text-xs font-mono whitespace-pre-wrap">
          {textToHex(response.body)}
        </pre>
      </div>
    );
  }

  const rawValue = `HTTP/1.1 ${response.status} ${response.status_text}
${Object.entries(response.headers)
  .map(([k, v]) => `${k}: ${v}`)
  .join('\n')}

${response.body}`;

  return (
    <Editor
      height="100%"
      defaultLanguage="http"
      value={rawValue}
      theme="vs-dark"
      options={{
        readOnly: true,
        minimap: { enabled: false },
        fontSize: 13,
        lineNumbers: 'on',
        wordWrap: 'on',
        automaticLayout: true,
      }}
    />
  );
}