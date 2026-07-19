import { useState, useRef } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { ButtonGroup } from "@/components/ui/button-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { TextEditor } from "@/components/ui/text-editor";
import { Switch } from "@/components/ui/switch";
import { TrashIcon, PlusIcon, UploadSimpleIcon, ImageSquareIcon } from '@phosphor-icons/react';
import type { KeyValuePair, ActiveRequestState } from "@/stores/collections";
import { cn } from "@/lib/utils";
import { ColorizedUrlInput } from "@/components/ui/select-env-input";

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
          <PlusIcon className="h-3.5 w-3.5 mr-1" /> Add
        </Button>
      </div>
      {items.map((item, index) => (
        <div key={index} className="flex items-center space-x-2">
          <Checkbox
            checked={item.enabled}
            onCheckedChange={() => onItemToggle(index)}
          />
          <div className="flex-1 flex min-w-0">
            <ColorizedUrlInput
              placeholder="Name"
              className="font-mono rounded-none text-xs border-r-0 flex-1 w-0 min-w-0"
              value={item.key}
              onChange={(v) => onItemChange(index, "key", v)}
            />
            <ColorizedUrlInput
              placeholder="Value"
              className="font-mono text-xs rounded-none flex-1 w-0 min-w-0"
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
            <TrashIcon className="h-4 w-4" />
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
  onBodyChange: (body: string, contentType?: string) => void;
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
  const [isImageMode, setIsImageMode] = useState(() => {
    // ponytail: default to image mode if the body is already an image data URL
    return req.body.startsWith("data:image/");
  });
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string;
      if (result) {
        onBodyChange(result, file.type);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        if (result) {
          onBodyChange(result, file.type);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const getFileInfo = () => {
    if (!req.body.startsWith("data:image/")) return null;
    const match = req.body.match(/^data:([^;]+);base64,/);
    const mimeType = match ? match[1] : "unknown";
    const base64Len = req.body.split(",")[1]?.length || 0;
    const sizeBytes = Math.round((base64Len * 3) / 4);
    const sizeKb = (sizeBytes / 1024).toFixed(1);
    return { mimeType, sizeKb };
  };

  const fileInfo = getFileInfo();
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
          <div className="flex-1 min-h-0 mt-2 flex flex-col font-sans">
            <div className="flex items-center justify-between mb-2 shrink-0">
              <div className="flex items-center space-x-4">
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

              {req.bodyType !== "none" && (
                <div className="flex items-center space-x-2">
                  <Label htmlFor="image-mode-switch" className="text-xs text-muted-foreground cursor-pointer font-medium">
                    Image mode
                  </Label>
                  <Switch
                    id="image-mode-switch"
                    checked={isImageMode}
                    onCheckedChange={setIsImageMode}
                  />
                </div>
              )}
            </div>

            <div className="flex-1 min-h-0 border rounded-md overflow-hidden bg-background">
              {req.bodyType === "none" ? (
                <div className="h-full flex items-center justify-center text-xs text-muted-foreground font-medium">
                  This request does not have a body payload.
                </div>
              ) : isImageMode ? (
                <div className="h-full flex flex-col items-center justify-center p-6 bg-muted/5">
                  {req.body.startsWith("data:image/") ? (
                    <div className="flex flex-col items-center space-y-4 w-full max-w-md">
                      <div className="relative group max-h-60 border rounded-lg overflow-hidden bg-muted/20 flex items-center justify-center p-2 shadow-sm">
                        <img
                          src={req.body}
                          alt="Request body preview"
                          className="max-h-56 object-contain rounded-md select-none"
                        />
                      </div>
                      {fileInfo && (
                        <div className="text-center space-y-1">
                          <p className="text-xs font-mono text-muted-foreground">
                            {fileInfo.mimeType} • {fileInfo.sizeKb} KB
                          </p>
                        </div>
                      )}
                      <div className="flex items-center space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => fileInputRef.current?.click()}
                        >
                          <UploadSimpleIcon className="h-4 w-4 mr-1.5" />
                          Replace Image
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-destructive hover:text-destructive hover:bg-destructive/10"
                          onClick={() => onBodyChange("")}
                        >
                          <TrashIcon className="h-4 w-4 mr-1.5" />
                          Remove
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div
                      onDragOver={handleDragOver}
                      onDragLeave={handleDragLeave}
                      onDrop={handleDrop}
                      className={cn(
                        "w-full max-w-md border-2 border-dashed rounded-lg p-8 flex flex-col items-center justify-center space-y-3 transition-colors",
                        isDragging ? "border-primary bg-primary/5" : "border-muted-foreground/20 hover:border-muted-foreground/40"
                      )}
                    >
                      <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center text-muted-foreground">
                        <ImageSquareIcon className="h-6 w-6" />
                      </div>
                      <div className="text-center space-y-1">
                        <p className="text-sm font-semibold">Upload an image</p>
                        <p className="text-xs text-muted-foreground">
                          Drag and drop your image file here, or click below
                        </p>
                      </div>
                      <Button
                        size="sm"
                        onClick={() => fileInputRef.current?.click()}
                      >
                        Choose File
                      </Button>
                    </div>
                  )}
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    accept="image/*"
                    className="hidden"
                  />
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
