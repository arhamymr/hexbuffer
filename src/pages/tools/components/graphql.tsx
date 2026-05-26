'use client';

import * as React from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { TextEditor } from '@/components/ui/text-editor';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Copy,
  FileJson,
  Minimize2,
  Sparkles,
  Trash2,
  Wand2,
} from 'lucide-react';
import { cn } from '@/lib/utils';

type GraphqlMode = 'builder' | 'snippets';

interface OperationSummary {
  type: 'query' | 'mutation' | 'subscription' | 'anonymous';
  name: string;
}

interface JsonValidationResult {
  value: Record<string, unknown>;
  error: string | null;
}

const DEFAULT_QUERY = `query GetUser($id: ID!) {
  user(id: $id) {
    id
    name
    email
  }
}`;

const DEFAULT_VARIABLES = `{
  "id": "1"
}`;

const INTROSPECTION_QUERY = `query IntrospectionQuery {
  __schema {
    queryType {
      name
    }
    mutationType {
      name
    }
    subscriptionType {
      name
    }
    types {
      kind
      name
      fields(includeDeprecated: true) {
        name
        args {
          name
          type {
            kind
            name
            ofType {
              kind
              name
            }
          }
        }
        type {
          kind
          name
          ofType {
            kind
            name
          }
        }
      }
    }
  }
}`;

const TYPE_LIST_QUERY = `query TypeList {
  __schema {
    types {
      kind
      name
      description
    }
  }
}`;

const FIELD_ARGS_QUERY = `query FieldArgs {
  __type(name: "Query") {
    fields {
      name
      args {
        name
        defaultValue
        type {
          kind
          name
        }
      }
    }
  }
}`;

const snippetOptions = [
  { id: 'introspection', label: 'Introspection', value: INTROSPECTION_QUERY },
  { id: 'types', label: 'Types', value: TYPE_LIST_QUERY },
  { id: 'fieldArgs', label: 'Field Args', value: FIELD_ARGS_QUERY },
];

function parseVariables(input: string): JsonValidationResult {
  if (!input.trim()) {
    return { value: {}, error: null };
  }

  try {
    const parsed = JSON.parse(input);

    if (!parsed || Array.isArray(parsed) || typeof parsed !== 'object') {
      return { value: {}, error: 'Variables must be a JSON object.' };
    }

    return { value: parsed as Record<string, unknown>, error: null };
  } catch (error) {
    return {
      value: {},
      error: error instanceof Error ? error.message : 'Invalid JSON variables.',
    };
  }
}

function summarizeOperations(query: string): OperationSummary[] {
  const operations = Array.from(query.matchAll(/\b(query|mutation|subscription)\s+([_A-Za-z][_0-9A-Za-z]*)?/g))
    .map((match) => ({
      type: match[1] as OperationSummary['type'],
      name: match[2] || 'Anonymous',
    }));

  if (operations.length === 0 && query.trim().startsWith('{')) {
    return [{ type: 'anonymous', name: 'Anonymous' }];
  }

  return operations;
}

function minifyGraphql(query: string): string {
  return query
    .replace(/#[^\n\r]*/g, '')
    .replace(/\s+/g, ' ')
    .replace(/\s*([{}():!,\[\]=|@])\s*/g, '$1')
    .trim();
}

function formatGraphql(query: string): string {
  const compact = minifyGraphql(query);
  let output = '';
  let depth = 0;
  let parenDepth = 0;
  let inString = false;
  let escaped = false;

  const newline = () => {
    output = output.trimEnd();
    output += '\n' + '  '.repeat(Math.max(depth, 0));
  };

  for (let index = 0; index < compact.length; index += 1) {
    const char = compact[index];

    if (inString) {
      output += char;
      if (escaped) {
        escaped = false;
      } else if (char === '\\') {
        escaped = true;
      } else if (char === '"') {
        inString = false;
      }
      continue;
    }

    if (char === '"') {
      inString = true;
      output += char;
      continue;
    }

    if (char === '{') {
      output = output.trimEnd() + ' {';
      depth += 1;
      newline();
      continue;
    }

    if (char === '}') {
      depth -= 1;
      newline();
      output += '}';
      const next = compact[index + 1];
      if (next && next !== '}') {
        newline();
      }
      continue;
    }

    if (char === '(') {
      parenDepth += 1;
      output += char;
      continue;
    }

    if (char === ')') {
      parenDepth = Math.max(parenDepth - 1, 0);
      output += char;
      continue;
    }

    if (char === ',') {
      output += ', ';
      continue;
    }

    if (char === ' ' && depth > 0 && parenDepth === 0) {
      newline();
      continue;
    }

    output += char;
  }

  return output
    .split('\n')
    .map((line) => line.trimEnd())
    .filter((line, index, lines) => line.trim() || index === lines.length - 1)
    .join('\n')
    .trim();
}

function buildRequestBody(query: string, variables: Record<string, unknown>, operationName: string): string {
  const body: Record<string, unknown> = {
    query,
    variables,
  };

  if (operationName.trim()) {
    body.operationName = operationName.trim();
  }

  return JSON.stringify(body, null, 2);
}

async function copyText(value: string) {
  await navigator.clipboard.writeText(value);
}

export function GraphqlTool() {
  const [mode, setMode] = React.useState<GraphqlMode>('builder');
  const [query, setQuery] = React.useState(DEFAULT_QUERY);
  const [variables, setVariables] = React.useState(DEFAULT_VARIABLES);
  const [operationName, setOperationName] = React.useState('GetUser');
  const [selectedSnippet, setSelectedSnippet] = React.useState(snippetOptions[0].id);

  const variableResult = React.useMemo(() => parseVariables(variables), [variables]);
  const operations = React.useMemo(() => summarizeOperations(query), [query]);
  const requestBody = React.useMemo(
    () => buildRequestBody(query, variableResult.value, operationName),
    [query, variableResult.value, operationName]
  );
  const activeSnippet = snippetOptions.find((snippet) => snippet.id === selectedSnippet) ?? snippetOptions[0];

  const handleFormat = () => setQuery((current) => formatGraphql(current));
  const handleMinify = () => setQuery((current) => minifyGraphql(current));
  const handleUseSnippet = () => {
    setQuery(activeSnippet.value);
    setOperationName(activeSnippet.label.replace(/\s+/g, ''));
    setMode('builder');
  };
  const handleClear = () => {
    setQuery('');
    setVariables('{}');
    setOperationName('');
  };

  return (
    <div className="flex h-full flex-col gap-4 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="font-medium">GraphQL Tools</h3>
          <p className="text-xs text-muted-foreground">Prepare operations, variables, and JSON request bodies.</p>
        </div>
        <Tabs value={mode} onValueChange={(value) => setMode(value as GraphqlMode)}>
          <TabsList className="grid grid-cols-2">
            <TabsTrigger value="builder">Builder</TabsTrigger>
            <TabsTrigger value="snippets">Snippets</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {mode === 'builder' ? (
        <div className="grid min-h-0 flex-1 grid-cols-1 gap-3 xl:grid-cols-[minmax(0,1.1fr)_minmax(360px,0.9fr)]">
          <div className="flex min-h-0 flex-col gap-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap items-center gap-2">
                <Label>Operation</Label>
                {operations.length > 0 ? (
                  operations.map((operation) => (
                    <Badge key={`${operation.type}-${operation.name}`} variant="secondary" className="capitalize">
                      {operation.type}: {operation.name}
                    </Badge>
                  ))
                ) : (
                  <Badge variant="outline">No operation detected</Badge>
                )}
              </div>
              <div className="flex items-center gap-1">
                <Button variant="outline" size="xs" onClick={handleFormat}>
                  <Sparkles className="h-3.5 w-3.5" />
                  Format
                </Button>
                <Button variant="outline" size="xs" onClick={handleMinify}>
                  <Minimize2 className="h-3.5 w-3.5" />
                  Minify
                </Button>
                <Button variant="ghost" size="xs" className="h-7 px-2" onClick={handleClear}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
            <div className="min-h-[340px] flex-1 overflow-hidden rounded-md border">
              <TextEditor
                language="plaintext"
                value={query}
                onChange={(value) => setQuery(value ?? '')}
                options={{ scrollBeyondLastLine: false }}
              />
            </div>
          </div>

          <div className="grid min-h-0 grid-rows-[auto_minmax(160px,0.7fr)_minmax(180px,1fr)] gap-3">
            <div className="space-y-2">
              <Label htmlFor="graphql-operation-name">Operation Name</Label>
              <Input
                id="graphql-operation-name"
                value={operationName}
                onChange={(event) => setOperationName(event.target.value)}
                placeholder="Optional operationName"
              />
            </div>

            <div className="flex min-h-0 flex-col gap-2">
              <div className="flex items-center justify-between">
                <Label>Variables</Label>
                <Badge variant={variableResult.error ? 'destructive' : 'outline'}>
                  {variableResult.error ? 'Invalid JSON' : 'Valid JSON'}
                </Badge>
              </div>
              <Textarea
                className={cn('min-h-0 flex-1 font-mono text-sm', variableResult.error && 'border-destructive')}
                value={variables}
                onChange={(event) => setVariables(event.target.value)}
                spellCheck={false}
              />
              {variableResult.error && <p className="text-xs text-destructive">{variableResult.error}</p>}
            </div>

            <div className="flex min-h-0 flex-col gap-2">
              <div className="flex items-center justify-between">
                <Label>POST Body</Label>
                <Button
                  variant="ghost"
                  size="xs"
                  className="h-7 px-2"
                  onClick={() => copyText(requestBody)}
                  disabled={Boolean(variableResult.error)}
                >
                  <Copy className="h-3.5 w-3.5" />
                </Button>
              </div>
              <Textarea className="min-h-0 flex-1 font-mono text-sm" value={requestBody} readOnly spellCheck={false} />
            </div>
          </div>
        </div>
      ) : (
        <div className="grid min-h-0 flex-1 grid-cols-1 gap-3 lg:grid-cols-[240px_minmax(0,1fr)]">
          <div className="flex flex-col gap-2">
            {snippetOptions.map((snippet) => (
              <button
                key={snippet.id}
                type="button"
                className={cn(
                  'flex items-center gap-2 rounded-md border px-3 py-2 text-left text-sm transition-colors hover:bg-muted',
                  selectedSnippet === snippet.id && 'border-primary bg-muted'
                )}
                onClick={() => setSelectedSnippet(snippet.id)}
              >
                <FileJson className="h-4 w-4 text-muted-foreground" />
                {snippet.label}
              </button>
            ))}
            <Button className="mt-2" size="xs" onClick={handleUseSnippet}>
              <Wand2 className="h-4 w-4" />
              Use Snippet
            </Button>
          </div>

          <div className="flex min-h-0 flex-col gap-2">
            <div className="flex items-center justify-between">
              <Label>{activeSnippet.label}</Label>
              <Button variant="ghost" size="xs" className="h-7 px-2" onClick={() => copyText(activeSnippet.value)}>
                <Copy className="h-3.5 w-3.5" />
              </Button>
            </div>
            <div className="min-h-[420px] flex-1 overflow-hidden rounded-md border">
              <TextEditor
                language="plaintext"
                value={activeSnippet.value}
                options={{ readOnly: true, scrollBeyondLastLine: false }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
