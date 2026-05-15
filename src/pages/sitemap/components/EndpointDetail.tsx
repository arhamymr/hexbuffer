import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import type { TreeNodeData } from "../data/mock";
import Editor from "@monaco-editor/react";

interface EndpointDetailProps {
  node: TreeNodeData | null;
}

function getStatusVariant(status: number) {
  if (status >= 200 && status < 300) return "default" as const;
  if (status >= 400 && status < 500) return "destructive" as const;
  if (status >= 500) return "destructive" as const;
  return "secondary" as const;
}

export function EndpointDetail({ node }: EndpointDetailProps) {
  if (!node) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground">
        <p className="text-sm">Select an endpoint to view details</p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      <div className="px-3 py-2 border-b">
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium">Endpoint Details</span>
        </div>
        <div className="flex items-center gap-2 mt-1">
          <Badge variant="default" className="text-[10px] px-1.5 py-0 h-4">{node.method || "GET"}</Badge>
          <span className="text-xs font-mono text-muted-foreground">
            https://{node.label.replace("/api", "")}
            {node.fullPath || ""}
          </span>
        </div>
      </div>
      <div className="flex-1 overflow-hidden">
        <Tabs defaultValue="request" className="h-full flex flex-col">
          <TabsList className="w-full justify-start rounded-none border-b px-3 h-8">
            <TabsTrigger value="request" className="text-xs">Request</TabsTrigger>
            <TabsTrigger value="response" className="text-xs">Response</TabsTrigger>
            <TabsTrigger value="render" className="text-xs">Render</TabsTrigger>
          </TabsList>
          <TabsContent value="request" className="flex-1 overflow-auto p-3">
            <div className="space-y-3">
              <div>
                <h4 className="text-[10px] font-medium text-muted-foreground mb-1.5">
                  HEADERS
                </h4>
                <div className="space-y-0.5">
                  <div className="flex gap-2">
                    <span className="text-xs font-mono text-muted-foreground w-24">
                      Accept:
                    </span>
                    <span className="text-xs font-mono">application/json</span>
                  </div>
                  <div className="flex gap-2">
                    <span className="text-xs font-mono text-muted-foreground w-24">
                      Content-Type:
                    </span>
                    <span className="text-xs font-mono">application/json</span>
                  </div>
                  <div className="flex gap-2">
                    <span className="text-xs font-mono text-muted-foreground w-24">
                      Authorization:
                    </span>
                    <span className="text-xs font-mono">Bearer ***</span>
                  </div>
                </div>
              </div>
              <div>
                <h4 className="text-[10px] font-medium text-muted-foreground mb-1.5">
                  BODY
                </h4>
                <pre className="text-xs font-mono bg-muted/50 rounded p-2 overflow-auto">
{`{
  "name": "John Doe",
  "email": "john@example.com"
}`}
                </pre>
              </div>
            </div>
          </TabsContent>
          <TabsContent value="response" className="flex-1 overflow-auto p-3">
            <div className="space-y-3">
              <div>
                <h4 className="text-[10px] font-medium text-muted-foreground mb-1.5">
                  STATUS
                </h4>
                <div className="flex items-center gap-2">
                  <Badge variant={getStatusVariant(node.status || 200)} className="text-[10px] px-1.5 py-0 h-4">
                    {node.status || 200}
                  </Badge>
                  <span className="text-xs text-muted-foreground">OK</span>
                </div>
              </div>
              <div>
                <h4 className="text-[10px] font-medium text-muted-foreground mb-1.5">
                  HEADERS
                </h4>
                <div className="space-y-0.5">
                  <div className="flex gap-2">
                    <span className="text-xs font-mono text-muted-foreground w-28">
                      Content-Type:
                    </span>
                    <span className="text-xs font-mono">application/json</span>
                  </div>
                  <div className="flex gap-2">
                    <span className="text-xs font-mono text-muted-foreground w-28">
                      X-Request-Id:
                    </span>
                    <span className="text-xs font-mono">req-abc123</span>
                  </div>
                </div>
              </div>
              <div>
                <h4 className="text-[10px] font-medium text-muted-foreground mb-1.5">
                  BODY
                </h4>
                <pre className="text-xs font-mono bg-muted/50 rounded p-2 overflow-auto">
{`{
  "id": 1,
  "name": "John Doe",
  "email": "john@example.com",
  "createdAt": "2024-01-15T10:30:00Z"
}`}
                </pre>
              </div>
            </div>
          </TabsContent>
          <TabsContent value="render" className="flex-1 overflow-hidden p-3">
            <div className="border rounded-md h-full">
              <Editor
                height="100%"
                defaultLanguage="json"
                value={`{
  "id": 1,
  "name": "John Doe",
  "email": "john@example.com",
  "createdAt": "2024-01-15T10:30:00Z"
}`}
                theme="vs-dark"
                options={{
                  readOnly: true,
                  minimap: { enabled: false },
                  fontSize: 11,
                  lineNumbers: "on",
                  wordWrap: "on",
                  automaticLayout: true,
                }}
              />
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}