import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  useCollectionsStore,
  type ContextRecord,
  type KeyValuePair,
} from '@/stores/collections';
import { PlusIcon, TrashIcon, PencilSimpleIcon, CopyIcon } from '@phosphor-icons/react';

interface ContextsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ContextsDialog({ open, onOpenChange }: ContextsDialogProps) {
  const store = useCollectionsStore();
  const [editingContext, setEditingContext] = useState<ContextRecord | null>(null);
  const [name, setName] = useState('');
  const [variables, setVariables] = useState<KeyValuePair[]>([]);
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    if (open) {
      setEditingContext(null);
      setIsCreating(false);
    }
  }, [open]);

  const handleStartCreate = () => {
    setName('');
    setVariables([{ key: '', value: '', enabled: true }]);
    setIsCreating(true);
    setEditingContext(null);
  };

  const handleStartEdit = (ctx: ContextRecord) => {
    setName(ctx.name);
    try {
      const parsed = JSON.parse(ctx.variables);
      setVariables(
        Array.isArray(parsed)
          ? parsed.map((v: KeyValuePair) => ({ ...v, enabled: true }))
          : []
      );
    } catch {
      setVariables([]);
    }
    setEditingContext(ctx);
    setIsCreating(false);
  };

  const handleAddVar = () => {
    setVariables([...variables, { key: '', value: '', enabled: true }]);
  };

  const handleRemoveVar = (index: number) => {
    setVariables(variables.filter((_, i) => i !== index));
  };

  const handleVarChange = (index: number, field: 'key' | 'value', val: string) => {
    const updated = [...variables];
    updated[index][field] = val;
    setVariables(updated);
  };

  const handleSave = async () => {
    if (!name.trim()) return;

    const filteredVars = variables.filter((v) => v.key.trim() !== '');

    if (isCreating) {
      await store.createContext(name, filteredVars);
    } else if (editingContext) {
      await store.updateContext(editingContext.id, name, filteredVars);
    }

    setIsCreating(false);
    setEditingContext(null);
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this environment?')) {
      await store.deleteContext(id);
      if (editingContext?.id === id) {
        setEditingContext(null);
      }
    }
  };

  const handleDuplicate = async (ctx: ContextRecord) => {
    let vars: KeyValuePair[] = [];
    try {
      const parsed = JSON.parse(ctx.variables);
      vars = Array.isArray(parsed)
        ? parsed.map((v: KeyValuePair) => ({ ...v, enabled: true }))
        : [];
    } catch {
      vars = [];
    }
    await store.createContext(`Copy of ${ctx.name}`, vars);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="h-full max-h-[70vh] sm:max-w-[820px] flex flex-col p-2">
        <DialogHeader>
          <DialogTitle>Manage Environment Contexts</DialogTitle>
        </DialogHeader>

        <div className="flex-1 min-h-0 grid grid-cols-5 gap-2 mt-4">
          {/* SidebarIcon list */}
          <div className="col-span-2 border-r pr-2 flex flex-col min-h-0">
            <Button size="sm" className="w-full mb-3" onClick={handleStartCreate}>
              <PlusIcon className="h-4 w-4 mr-2" /> New Environment
            </Button>
            <ScrollArea className="flex-1">
              <div className="space-y-1 pr-2">
                {store.contexts.map((ctx) => (
                  <div
                    key={ctx.id}
                    className={`flex items-center justify-between p-2 rounded-md text-sm cursor-pointer group hover:bg-muted ${editingContext?.id === ctx.id ? 'bg-secondary font-medium' : ''
                      }`}
                    onClick={() => handleStartEdit(ctx)}
                  >
                    <span className="truncate text-sm flex-1 pr-2">{ctx.name}</span>
                    <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7 text-muted-foreground hover:text-foreground"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleStartEdit(ctx);
                        }}
                      >
                        <PencilSimpleIcon className="h-3 w-3" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7 text-muted-foreground hover:text-foreground"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDuplicate(ctx);
                        }}
                      >
                        <CopyIcon className="h-3 w-3" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7 text-destructive hover:bg-destructive/10"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(ctx.id);
                        }}
                      >
                        <TrashIcon className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                ))}
                {store.contexts.length === 0 && (
                  <div className="text-center text-xs text-muted-foreground py-8">
                    No environments configured
                  </div>
                )}
              </div>
            </ScrollArea>
          </div>

          {/* Edit Form */}
          <div className="col-span-3 flex flex-col min-h-0">
            {isCreating || editingContext ? (
              <div className="flex flex-col h-full min-h-0 space-y-2">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Environment Name
                  </label>
                  <Input
                    placeholder="e.g. Production, Development"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </div>

                <div className="flex-1 flex flex-col min-h-0 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Variables
                    </span>
                    <Button variant="outline" size="sm" className="h-7 px-2" onClick={handleAddVar}>
                      <PlusIcon className="h-3.5 w-3.5 mr-1" /> Add Row
                    </Button>
                  </div>

                  <ScrollArea className="flex-1 border rounded-md p-2">
                    <div className="space-y-2">
                      {variables.map((item, index) => (
                        <div key={index} className="flex items-center space-x-2">
                          <Input
                            placeholder="Variable key"
                            className="font-mono text-xs h-8"
                            value={item.key}
                            onChange={(e) => handleVarChange(index, 'key', e.target.value)}
                          />
                          <Input
                            placeholder="Value"
                            className="font-mono text-xs h-8"
                            value={item.value}
                            onChange={(e) => handleVarChange(index, 'value', e.target.value)}
                          />
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive"
                            onClick={() => handleRemoveVar(index)}
                          >
                            <TrashIcon className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                      {variables.length === 0 && (
                        <div className="text-center text-xs text-muted-foreground py-8">
                          No variables. Click Add Row to configure.
                        </div>
                      )}
                    </div>
                  </ScrollArea>
                  <p className="text-[11px] text-muted-foreground/70 leading-relaxed">
                    Reference variables in request URLs or headers using{" "}
                    <code className="font-mono bg-muted px-1 rounded text-[11px]">{"{{variable_key}}"}</code>{" "}
                    syntax.
                  </p>

                </div>

                <DialogFooter className="pt-2 border-t">
                  <Button variant="ghost" onClick={() => {
                    setIsCreating(false);
                    setEditingContext(null);
                  }}>
                    Cancel
                  </Button>
                  <Button onClick={handleSave} disabled={!name.trim()}>
                    Save Environment
                  </Button>
                </DialogFooter>
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-center p-4">
                <span className="text-sm font-medium text-muted-foreground">
                  Select an environment to edit or create a new one.
                </span>
                <span className="text-xs text-muted-foreground/60 max-w-[200px] mt-1">
                  Variables can be referenced in request URLs or headers using double braces, e.g.
                  {" "}<code className="font-mono bg-muted px-1 rounded">{"{{base_url}}"}</code>
                </span>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
