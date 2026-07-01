import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';
import {
  useCollectionsStore,
  type ContextRecord,
  type KeyValuePair,
} from '@/stores/collections';
import {
  PlusIcon,
  TrashIcon,
  PencilSimpleIcon,
  CopyIcon,
  GlobeIcon,
  MagnifyingGlassIcon,
  SparkleIcon,
  CheckIcon,
} from '@phosphor-icons/react';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'motion/react';

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
  const [searchQuery, setSearchQuery] = useState('');
  const [deletingContextId, setDeletingContextId] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setEditingContext(null);
      setIsCreating(false);
      setSearchQuery('');
      setDeletingContextId(null);
    }
  }, [open]);

  const handleStartCreate = () => {
    setName('');
    setVariables([{ key: '', value: '', enabled: true }]);
    setIsCreating(true);
    setEditingContext(null);
    setDeletingContextId(null);
  };

  const handleStartEdit = (ctx: ContextRecord) => {
    setName(ctx.name);
    try {
      const parsed = JSON.parse(ctx.variables);
      setVariables(
        Array.isArray(parsed)
          ? parsed.map((v: any) => ({
              key: v.key || '',
              value: v.value || '',
              enabled: typeof v.enabled === 'boolean' ? v.enabled : true,
            }))
          : []
      );
    } catch {
      setVariables([]);
    }
    setEditingContext(ctx);
    setIsCreating(false);
    setDeletingContextId(null);
  };

  const handleBuildFromRequest = () => {
    const store = useCollectionsStore.getState();
    const req = store.activeRequest;

    const varKeys = new Set<string>();

    const scan = (str: string) => {
      const matches = str.match(/\{\{([^}]+)\}\}/g);
      if (matches) {
        matches.forEach((m) => {
          const key = m.slice(2, -2).trim();
          if (key) varKeys.add(key);
        });
      }
    };

    scan(req.url || '');
    req.queryParams.forEach((p) => {
      scan(p.key || '');
      scan(p.value || '');
    });
    req.headers.forEach((h) => {
      scan(h.key || '');
      scan(h.value || '');
    });
    scan(req.body || '');

    if (varKeys.size === 0) {
      toast.info('No environment variables found in the active request.');
      return;
    }

    const currentVars = [...variables];
    let addedCount = 0;

    varKeys.forEach((key) => {
      if (!currentVars.some((v) => v.key === key)) {
        currentVars.push({ key, value: '', enabled: true });
        addedCount++;
      }
    });

    if (addedCount > 0) {
      setVariables(currentVars);
      toast.success(`Imported ${addedCount} variable(s) from the active request.`);
    } else {
      toast.info('All variables from the active request are already in this environment.');
    }
  };

  const handleAddVar = () => {
    setVariables([...variables, { key: '', value: '', enabled: true }]);
  };

  const handleRemoveVar = (index: number) => {
    setVariables(variables.filter((_, i) => i !== index));
  };

  const handleVarChange = (index: number, field: 'key' | 'value' | 'enabled', val: any) => {
    const updated = [...variables];
    updated[index] = { ...updated[index], [field]: val };
    setVariables(updated);
  };

  const handleSave = async () => {
    if (!name.trim()) return;

    const filteredVars = variables.filter((v) => v.key.trim() !== '');

    if (isCreating) {
      await store.createContext(name, filteredVars);
      toast.success(`Created environment: ${name}`);
    } else if (editingContext) {
      await store.updateContext(editingContext.id, name, filteredVars);
      toast.success(`Updated environment: ${name}`);
    }

    setIsCreating(false);
    setEditingContext(null);
  };

  const handleConfirmDelete = async (id: string) => {
    await store.deleteContext(id);
    setDeletingContextId(null);
    if (editingContext?.id === id) {
      setEditingContext(null);
    }
    toast.success('Environment deleted');
  };

  const handleDuplicate = async (ctx: ContextRecord) => {
    let vars: KeyValuePair[] = [];
    try {
      const parsed = JSON.parse(ctx.variables);
      vars = Array.isArray(parsed)
        ? parsed.map((v: any) => ({
            key: v.key || '',
            value: v.value || '',
            enabled: typeof v.enabled === 'boolean' ? v.enabled : true,
          }))
        : [];
    } catch {
      vars = [];
    }
    await store.createContext(`Copy of ${ctx.name}`, vars);
    toast.success(`Duplicated environment: ${ctx.name}`);
  };

  const getVariablesSummary = (ctx: ContextRecord) => {
    try {
      const vars = JSON.parse(ctx.variables);
      if (!Array.isArray(vars) || vars.length === 0) return 'No variables';
      const keys = vars.filter((v: any) => v.key?.trim()).map((v: any) => v.key.trim());
      if (keys.length === 0) return 'No variables';
      if (keys.length <= 2) return keys.join(', ');
      return `${keys.slice(0, 2).join(', ')} (+${keys.length - 2} more)`;
    } catch {
      return 'No variables';
    }
  };

  const filteredContexts = store.contexts.filter((ctx) =>
    ctx.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[850px] h-[580px] flex flex-col p-0 overflow-hidden border border-border/80 shadow-2xl rounded-xl bg-background animate-in fade-in-50 zoom-in-95 duration-200">
        <div className="flex-1 flex min-h-0 divide-x divide-border">
          {/* Left Sidebar */}
          <div className="w-[280px] shrink-0 bg-muted/20 flex flex-col min-h-0">
            {/* Sidebar Header */}
            <div className="p-4 border-b border-border flex flex-col gap-3 shrink-0">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-xs text-foreground tracking-tight">Environments</span>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-7 w-7 rounded-md transition-transform active:scale-95 text-muted-foreground hover:text-foreground hover:bg-muted"
                  onClick={handleStartCreate}
                  title="Create Environment"
                >
                  <PlusIcon className="h-4 w-4" />
                </Button>
              </div>

              {/* Search bar */}
              <div className="relative">
                <MagnifyingGlassIcon className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  placeholder="Search environments..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8 h-8 text-xs bg-background/50 focus-visible:bg-background border-border/60 focus-visible:ring-1 focus-visible:ring-primary/30"
                />
              </div>
            </div>

            {/* Sidebar Environments List */}
            <ScrollArea className="flex-1">
              <div className="p-2 space-y-1">
                {filteredContexts.map((ctx) => {
                  const isActive = store.activeContextId === ctx.id;
                  const isSelected = editingContext?.id === ctx.id;
                  const isDeleting = deletingContextId === ctx.id;

                  return (
                    <div
                      key={ctx.id}
                      className={`group relative flex flex-col p-2.5 rounded-lg text-sm cursor-pointer border transition-all duration-200 select-none ${
                        isSelected
                          ? 'bg-accent/40 border-accent/80 shadow-xs'
                          : 'hover:bg-muted/40 border-transparent'
                      }`}
                      onClick={() => {
                        if (!isDeleting) handleStartEdit(ctx);
                      }}
                    >
                      {isDeleting ? (
                        <div className="flex flex-col gap-1.5 py-0.5" onClick={(e) => e.stopPropagation()}>
                          <span className="text-[11px] font-semibold text-destructive uppercase tracking-wider flex items-center gap-1 animate-pulse">
                            Delete Environment?
                          </span>
                          <div className="flex items-center gap-1.5">
                            <Button
                              variant="destructive"
                              className="h-6 px-2 text-[10px] font-medium"
                              onClick={() => handleConfirmDelete(ctx.id)}
                            >
                              Confirm
                            </Button>
                            <Button
                              variant="ghost"
                              className="h-6 px-2 text-[10px] font-medium hover:bg-muted"
                              onClick={() => setDeletingContextId(null)}
                            >
                              Cancel
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <div className="flex items-center justify-between min-w-0">
                            <span
                              className={`truncate font-medium flex-1 text-xs pr-1 ${
                                isSelected ? 'text-foreground font-semibold' : 'text-muted-foreground group-hover:text-foreground'
                              }`}
                            >
                              {ctx.name}
                            </span>

                            {isActive && (
                              <span className="flex items-center gap-1 text-[10px] font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded-full border border-emerald-500/20 shrink-0">
                                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                Active
                              </span>
                            )}
                          </div>

                          {/* Subtitle / Variables summary */}
                          <span className="text-[10px] text-muted-foreground/60 mt-1 truncate max-w-[210px]">
                            {getVariablesSummary(ctx)}
                          </span>

                          {/* Action buttons on hover */}
                          <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity bg-gradient-to-l from-muted/30 via-background/90 to-transparent pl-4 py-1.5">
                            {!isActive && (
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-6 w-6 text-muted-foreground hover:text-emerald-500 rounded-md transition-colors"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  store.setActiveContextId(ctx.id);
                                  toast.success(`Activated environment: ${ctx.name}`);
                                }}
                                title="Set Active"
                              >
                                <CheckIcon className="h-3 w-3" />
                              </Button>
                            )}
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-6 w-6 text-muted-foreground hover:text-foreground rounded-md"
                              onClick={(e) => {
                                  e.stopPropagation();
                                  handleStartEdit(ctx);
                              }}
                              title="Edit"
                            >
                              <PencilSimpleIcon className="h-3 w-3" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-6 w-6 text-muted-foreground hover:text-foreground rounded-md"
                              onClick={(e) => {
                                  e.stopPropagation();
                                  handleDuplicate(ctx);
                              }}
                              title="Duplicate"
                            >
                              <CopyIcon className="h-3 w-3" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-6 w-6 text-destructive hover:bg-destructive/10 rounded-md"
                              onClick={(e) => {
                                  e.stopPropagation();
                                  setDeletingContextId(ctx.id);
                              }}
                              title="Delete"
                            >
                              <TrashIcon className="h-3 w-3" />
                            </Button>
                          </div>
                        </>
                      )}
                    </div>
                  );
                })}

                {filteredContexts.length === 0 && (
                  <div className="text-center text-xs text-muted-foreground py-12 px-4 flex flex-col items-center justify-center gap-2">
                    <GlobeIcon className="h-8 w-8 text-muted-foreground/30 stroke-[1.5]" />
                    <span>
                      {searchQuery ? 'No matching environments' : 'No environments configured'}
                    </span>
                    {!searchQuery && (
                      <Button
                        variant="outline"
                        className="mt-2"
                        onClick={handleStartCreate}
                      >
                        Add Environment
                      </Button>
                    )}
                  </div>
                )}
              </div>
            </ScrollArea>
          </div>

          {/* Right Details / Editor Column */}
          <div className="flex-1 flex flex-col min-h-0 bg-background">
            <AnimatePresence mode="wait">
              {isCreating || editingContext ? (
                <motion.div
                  key={editingContext?.id || 'create'}
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  transition={{ duration: 0.15, ease: [0.23, 1, 0.32, 1] }}
                  className="flex-1 flex flex-col min-h-0"
                >
                  {/* Header section with editable title */}
                  <div className="p-4 border-b border-border flex items-center justify-between gap-4 bg-muted/5 shrink-0">
                    <div className="flex-1 min-w-0">
                      <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider block mb-1">
                        Environment Name
                      </span>
                      <input
                        type="text"
                        placeholder="e.g. Production, Development"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="w-full text-base font-semibold text-foreground bg-transparent border-none outline-none focus:ring-0 p-0 placeholder:text-muted-foreground/50 truncate pb-0.5"
                      />
                    </div>

                    <div className="flex items-center gap-1.5">
                      <Button
                        variant="outline"
                        className="h-8 px-2.5 text-xs font-medium gap-1.5 transition-all hover:bg-muted active:scale-[0.97]"
                        onClick={handleBuildFromRequest}
                      >
                        <SparkleIcon className="h-3.5 w-3.5 text-primary animate-pulse" />
                        <span>Pull Request Vars</span>
                      </Button>
                      <Button
                        variant="outline"
                        className="h-8 px-2.5 text-xs font-medium gap-1.5 transition-all hover:bg-muted active:scale-[0.97]"
                        onClick={handleAddVar}
                      >
                        <PlusIcon className="h-3.5 w-3.5" />
                        <span>Add Row</span>
                      </Button>
                    </div>
                  </div>

                  {/* Variables Table Body */}
                  <div className="flex-1 min-h-0 flex flex-col">
                    {/* Table Header */}
                    <div className="grid grid-cols-[36px_1fr_1.2fr_36px] gap-2 px-6 py-2 border-b border-border/60 bg-muted/10 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider shrink-0">
                      <div className="text-center">Active</div>
                      <div>Key</div>
                      <div>Value</div>
                      <div className="text-center">Action</div>
                    </div>

                    {/* Table Rows scroll area */}
                    <ScrollArea className="flex-1">
                      <div className="px-4 py-2 space-y-1.5">
                        {variables.map((item, index) => (
                          <motion.div
                            key={index}
                            initial={{ opacity: 0, y: 2 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.1, delay: Math.min(index * 0.02, 0.15) }}
                            className="grid grid-cols-[36px_1fr_1.2fr_36px] gap-2 items-center rounded-lg border border-transparent hover:border-border/50 hover:bg-muted/10 p-1 transition-all duration-150"
                          >
                            <div className="flex justify-center items-center">
                              <Checkbox
                                checked={item.enabled !== false}
                                onCheckedChange={(checked) =>
                                  handleVarChange(index, 'enabled', !!checked)
                                }
                                className="h-4 w-4 border-muted-foreground/30 data-[state=checked]:border-primary"
                              />
                            </div>

                            <Input
                              placeholder="VARIABLE_KEY"
                              value={item.key}
                              onChange={(e) => handleVarChange(index, 'key', e.target.value)}
                              className={`font-mono text-xs h-8 bg-muted/20 border-none shadow-none focus-visible:ring-1 focus-visible:ring-primary/30 focus-visible:bg-background ${
                                item.enabled === false ? 'opacity-50 line-through text-muted-foreground' : ''
                              }`}
                            />

                            <Input
                              placeholder="Value"
                              value={item.value}
                              onChange={(e) => handleVarChange(index, 'value', e.target.value)}
                              className={`font-mono text-xs h-8 bg-muted/20 border-none shadow-none focus-visible:ring-1 focus-visible:ring-primary/30 focus-visible:bg-background ${
                                item.enabled === false ? 'opacity-50 text-muted-foreground' : ''
                              }`}
                            />

                            <div className="flex justify-center items-center">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-md transition-colors"
                                onClick={() => handleRemoveVar(index)}
                              >
                                <TrashIcon className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </motion.div>
                        ))}

                        {variables.length === 0 && (
                          <div className="flex flex-col items-center justify-center py-16 px-4 text-center border border-dashed border-border/80 rounded-xl m-2 bg-muted/5 animate-in fade-in-50 zoom-in-98 duration-200">
                            <GlobeIcon className="h-8 w-8 text-muted-foreground/30 stroke-[1.5] mb-2" />
                            <span className="text-xs font-semibold text-muted-foreground mb-1">
                              No Variables Configured
                            </span>
                            <span className="text-[11px] text-muted-foreground/60 max-w-[250px] mb-4">
                              Add variables to refer to endpoint URLs, tokens, and other workspace settings dynamically.
                            </span>
                            <Button
                              variant="outline"
                              className="gap-1.5 active:scale-[0.97]"
                              onClick={handleAddVar}
                            >
                              <PlusIcon className="h-3.5 w-3.5" />
                              <span>Add First Variable</span>
                            </Button>
                          </div>
                        )}
                      </div>
                    </ScrollArea>

                    {/* Footer Help Bar */}
                    <div className="p-3 bg-muted/5 border-t border-border flex items-center justify-between text-[10px] text-muted-foreground shrink-0 select-none">
                      <span>
                        Reference variables in requests using: <code className="font-mono bg-muted/40 px-1 py-0.5 rounded text-foreground">{"{{variable_key}}"}</code>
                      </span>
                    </div>
                  </div>

                  {/* Dialog Footer Actions */}
                  <div className="p-4 border-t border-border flex justify-end gap-2 shrink-0 bg-muted/5">
                    <Button
                      variant="ghost"
                      onClick={() => {
                        setIsCreating(false);
                        setEditingContext(null);
                      }}
                      className="h-8 text-xs font-medium active:scale-[0.97]"
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={handleSave}
                      disabled={!name.trim()}
                      className="h-8 text-xs font-medium active:scale-[0.97]"
                    >
                      Save Environment
                    </Button>
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  key="empty"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.15 }}
                  className="flex-1 flex flex-col items-center justify-center text-center p-8 bg-muted/5"
                >
                  <div className="h-16 w-16 rounded-full bg-gradient-to-b from-primary/10 to-primary/5 flex items-center justify-center border border-primary/20 shadow-xs mb-4">
                    <GlobeIcon className="h-8 w-8 text-primary/80 stroke-[1.5]" />
                  </div>
                  <h3 className="text-sm font-semibold tracking-tight text-foreground">
                    Environments & Variables
                  </h3>
                  <p className="text-xs text-muted-foreground/70 max-w-[280px] mt-1.5 leading-relaxed">
                    Configure environment variables to hold sets of key-value variables. You can easily switch active environments to run requests under different contexts.
                  </p>
                  <p className="text-[11px] text-muted-foreground/50 max-w-[260px] mt-2.5 leading-relaxed">
                    Reference active variables in URLs, queries, and headers using double braces, e.g. <code className="font-mono bg-muted px-1 rounded">{"{{base_url}}"}</code>.
                  </p>
                  <Button
                    onClick={handleStartCreate}
                    className="mt-6 gap-1.5 active:scale-[0.97]"
                  >
                    <PlusIcon className="h-4 w-4" />
                    <span>Create Environment</span>
                  </Button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
