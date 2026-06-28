import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { ButtonGroup } from "@/components/ui/button-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { TextEditor } from "@/components/ui/text-editor";
import { Trash2, Plus } from "lucide-react";
import type { KeyValuePair, ActiveRequestState } from "@/stores/collections";
import { cn } from "@/lib/utils";
import { ColorizedUrlInput } from "./colorized-url-input";

// ── Shared key-value list editor ──

interface KeyValueEditorProps {
  items: KeyValuePair[];
  onItemChange: (index: number, field: "key" | "value", value: string) => void;
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
          <Checkbox
            checked={item.enabled}
            onCheckedChange={() => onItemToggle(index)}
          />
          <div className="flex w-full">
            <ColorizedUrlInput
              placeholder="Name"
              className="font-mono rounded-none text-xs border-r-0"
              value={item.key}
              onChange={(v) => onItemChange(index, "key", v)}
            />
            <ColorizedUrlInput
              placeholder="Value"
              className="font-mono text-xs rounded-none"
              value={item.value}
              onChange={(v) => onItemChange(index, "value", v)}
            />
          </div>
         
          <Button
            variant="ghost"
            size="icon"
            className="w-4 mr-4 text-muted-foreground hover:text-destructive shrink-0"
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
  onQueryParamChange: (
    index: number,
    field: "key" | "value",
    value: string,
  ) => void;
  onQueryParamToggle: (index: number) => void;
  onAddQueryParam: () => void;
  onRemoveQueryParam: (index: number) => void;
  onHeaderChange: (
    index: number,
    field: "key" | "value",
    value: string,
  ) => void;
  onHeaderToggle: (index: number) => void;
  onAddHeader: () => void;
  onRemoveHeader: (index: number) => void;
  onBodyTypeChange: (bodyType: string) => void;
  onBodyChange: (body: string) => void;
  onPreScriptChange: (script: string) => void;
  onTestScriptChange: (script: string) => void;
}

const BODY_OPTIONS = ["none", "raw", "json"] as const;

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
      <div className="flex-1 flex flex-col min-h-0">
        <ButtonGroup
          orientation="horizontal"
          className="shrink-0 w-full h-auto p-0 mb-2"
        >
          {(["params", "headers", "body", "scripts"] as const).map((t) => (
            <Button
              key={t}
              variant="outline"
              size="sm"
              className={cn("uppercase text-xs", activeReqTab === t && "text-primary")}
              onClick={() => onReqTabChange(t)}
            >
              {t}
            </Button>
          ))}
        </ButtonGroup>

        {/* ── Params tab ── */}
        {activeReqTab === "params" && (
          <div className="flex-1 min-h-0 mt-2">
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
          </div>
        )}

        {/* ── Headers tab ── */}
        {activeReqTab === "headers" && (
          <div className="flex-1 min-h-0 mt-2">
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
          </div>
        )}

        {/* ── Body tab ── */}
        {activeReqTab === "body" && (
          <div className="flex-1 min-h-0 mt-2 flex flex-col">
            <div className="flex items-center space-x-4 mb-2 shrink-0">
              <span className="text-[10px] uppercase font-bold text-muted-foreground">
                Body Format:
              </span>
              <RadioGroup
                value={req.bodyType}
                onValueChange={onBodyTypeChange}
                className="flex space-x-3"
              >
                {BODY_OPTIONS.map((t) => (
                  <label
                    key={t}
                    className="flex items-center space-x-1 cursor-pointer font-medium text-xs"
                  >
                    <RadioGroupItem value={t} />
                    <span className="capitalize">{t}</span>
                  </label>
                ))}
              </RadioGroup>
            </div>
            <div className="flex-1 min-h-0 border rounded-md overflow-hidden bg-background">
              {req.bodyType === "none" ? (
                <div className="h-full flex items-center justify-center text-xs text-muted-foreground font-medium">
                  This request does not have a body payload.
                </div>
              ) : (
                <TextEditor
                  value={req.body}
                  onChange={(val) => onBodyChange(val || "")}
                />
              )}
            </div>
          </div>
        )}

        {/* ── Scripts tab ── */}
        {activeReqTab === "scripts" && (
          <div className="flex-1 min-h-0 mt-2 flex flex-col space-y-4">
            <div className="grid grid-cols-2 gap-4 flex-1 min-h-0">
              <div className="flex flex-col min-h-0 space-y-1">
                <Label className="text-[10px] uppercase font-bold text-muted-foreground">
                  Pre-Request Script
                </Label>
                <div className="flex-1 min-h-0 border rounded-md overflow-hidden bg-background">
                  <TextEditor
                    value={req.preScript}
                    onChange={(val) => onPreScriptChange(val || "")}
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
                    onChange={(val) => onTestScriptChange(val || "")}
                  />
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
