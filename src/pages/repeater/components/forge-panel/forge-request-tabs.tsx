import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { TextEditor } from '@/components/ui/text-editor';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { buttonGroupVariants } from '@/components/ui/button-group';
import { cn } from '@/lib/utils';
import { Trash2, Plus } from 'lucide-react';
import type { KeyValuePair, ActiveRequestState } from '@/stores/collections';

// ── Shared key-value list editor ──

interface KeyValueEditorProps {
  items: KeyValuePair[];
  onItemChange: (index: number, field: 'key' | 'value', value: string) => void;
  onItemToggle: (index: number) => void;
  onAdd: () => void;
  onRemove: (index: number) => void;
  noun: string;
  emptyMessage: string;
}

function KeyValueEditor({
  items,
  onItemChange,
  onItemToggle,
  onAdd,
  onRemove,
  noun,
  emptyMessage,
}: KeyValueEditorProps) {
  return (
    <div className="space-y-2">
      <div className="flex justify-between items-center px-1">
        <span className="text-[10px] uppercase font-bold text-muted-foreground">
          {noun}
        </span>
        <Button variant="ghost" size="sm" className="h-7 px-2" onClick={onAdd}>
          <Plus className="h-3.5 w-3.5 mr-1" /> Add
        </Button>
      </div>
      {items.map((item, index) => (
        <div key={index} className="flex items-center space-x-2">
          <input
            type="checkbox"
            checked={item.enabled}
            onChange={() => onItemToggle(index)}
            className="rounded border-muted shrink-0"
          />
          <Input
            placeholder="Name"
            className="h-8 font-mono text-xs"
            value={item.key}
            onChange={(e) => onItemChange(index, 'key', e.target.value)}
          />
          <Input
            placeholder="Value"
            className="h-8 font-mono text-xs"
            value={item.value}
            onChange={(e) => onItemChange(index, 'value', e.target.value)}
          />
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-muted-foreground hover:text-destructive shrink-0"
            onClick={() => onRemove(index)}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ))}
      {items.length === 0 && (
        <div className="text-center text-xs text-muted-foreground py-8">
          {emptyMessage}
        </div>
      )}
    </div>
  );
}

// ── Request tabs ──

interface ForgeRequestTabsProps {
  queryParams: KeyValuePair[];
  req: ActiveRequestState;
  activeReqTab: string;
  onReqTabChange: (tab: string) => void;
  onQueryParamChange: (index: number, field: 'key' | 'value', value: string) => void;
  onQueryParamToggle: (index: number) => void;
  onAddQueryParam: () => void;
  onRemoveQueryParam: (index: number) => void;
  onHeaderChange: (index: number, field: 'key' | 'value', value: string) => void;
  onHeaderToggle: (index: number) => void;
  onAddHeader: () => void;
  onRemoveHeader: (index: number) => void;
  onBodyTypeChange: (bodyType: string) => void;
  onBodyChange: (body: string) => void;
  onPreScriptChange: (script: string) => void;
  onTestScriptChange: (script: string) => void;
}

const BODY_OPTIONS = ['none', 'raw', 'json'] as const;

export function ForgeRequestTabs({
  queryParams,
  req,
  activeReqTab,
  onReqTabChange,
  onQueryParamChange,
  onQueryParamToggle,
  onAddQueryParam,
  onRemoveQueryParam,
  onHeaderChange,
  onHeaderToggle,
  onAddHeader,
  onRemoveHeader,
  onBodyTypeChange,
  onBodyChange,
  onPreScriptChange,
  onTestScriptChange,
}: ForgeRequestTabsProps) {
  return (
    <div className="border rounded-lg p-2 bg-background/50 flex flex-col min-h-0">
      <Tabs value={activeReqTab} onValueChange={onReqTabChange} className="flex-1 flex flex-col min-h-0">
        <TabsList className={cn(buttonGroupVariants({ orientation: "horizontal" }), "shrink-0 w-full h-auto p-0 mb-2")}>
          {['params', 'headers', 'body', 'scripts'].map((t) => (
            <TabsTrigger
              key={t}
              value={t}
              className="rounded-md border data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:border-primary data-[state=active]:shadow-none px-4 py-2 capitalize text-xs"
            >
              {t}
            </TabsTrigger>
          ))}
        </TabsList>

        {/* ── Params tab ── */}
        <TabsContent value="params" className="flex-1 min-h-0 mt-2">
          <ScrollArea className="h-full">
            <KeyValueEditor
              items={queryParams}
              onItemChange={onQueryParamChange}
              onItemToggle={onQueryParamToggle}
              onAdd={onAddQueryParam}
              onRemove={onRemoveQueryParam}
              noun="Query Parameters"
              emptyMessage="No URL query parameters. Add parameter above to configure."
            />
          </ScrollArea>
        </TabsContent>

        {/* ── Headers tab ── */}
        <TabsContent value="headers" className="flex-1 min-h-0 mt-2">
          <ScrollArea className="h-full">
            <KeyValueEditor
              items={req.headers}
              onItemChange={onHeaderChange}
              onItemToggle={onHeaderToggle}
              onAdd={onAddHeader}
              onRemove={onRemoveHeader}
              noun="Headers"
              emptyMessage="No custom headers."
            />
          </ScrollArea>
        </TabsContent>

        {/* ── Body tab ── */}
        <TabsContent value="body" className="flex-1 min-h-0 mt-2 flex flex-col">
          <div className="flex items-center space-x-4 mb-2 shrink-0">
            <span className="text-[10px] uppercase font-bold text-muted-foreground">Body Format:</span>
            <div className="flex space-x-3 text-xs">
              {BODY_OPTIONS.map((t) => (
                <label key={t} className="flex items-center space-x-1 cursor-pointer font-medium">
                  <input
                    type="radio"
                    checked={req.bodyType === t}
                    onChange={() => onBodyTypeChange(t)}
                    className="text-primary focus:ring-primary"
                  />
                  <span className="capitalize">{t}</span>
                </label>
              ))}
            </div>
          </div>
          <div className="flex-1 min-h-0 border rounded-md overflow-hidden bg-background">
            {req.bodyType === 'none' ? (
              <div className="h-full flex items-center justify-center text-xs text-muted-foreground font-medium">
                This request does not have a body payload.
              </div>
            ) : (
              <TextEditor
                value={req.body}
                onChange={(val) => onBodyChange(val || '')}
              />
            )}
          </div>
        </TabsContent>

        {/* ── Scripts tab ── */}
        <TabsContent value="scripts" className="flex-1 min-h-0 mt-2 flex flex-col space-y-4">
          <div className="grid grid-cols-2 gap-4 flex-1 min-h-0">
            <div className="flex flex-col min-h-0 space-y-1">
              <Label className="text-[10px] uppercase font-bold text-muted-foreground">
                Pre-Request Script
              </Label>
              <div className="flex-1 min-h-0 border rounded-md overflow-hidden bg-background">
                <TextEditor
                  value={req.preScript}
                  onChange={(val) => onPreScriptChange(val || '')}
                />
              </div>
            </div>
            <div className="flex flex-col min-h-0 space-y-1">
              <Label className="text-[10px] uppercase font-bold text-muted-foreground">
                Test / Assertion Script
              </Label>
              <div className="flex-1 min-h-0 border rounded-md overflow-hidden bg-background">
                <TextEditor
                  value={req.testScript}
                  onChange={(val) => onTestScriptChange(val || '')}
                />
              </div>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
