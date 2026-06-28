import React from 'react';
import {
  PlayIcon,
  FunctionIcon,
  SparkleIcon,
  GlobeIcon,
  ClockIcon,
  BugIcon,
  CheckCircleIcon,
  FunnelIcon,
  ArrowClockwiseIcon,
  FileTextIcon,
  WebhooksLogo,
  Bell,
  TerminalIcon,
  ScanIcon,
  Plug,
  ShieldIcon,
  LightningIcon,
  CodeIcon,
  Hash,
  DownloadIcon,
  FilePlusIcon,
  FileCodeIcon,
  NetworkIcon,
  RadioIcon,
  PulseIcon,
  SquareIcon,
  MagnifyingGlassIcon,
} from '@phosphor-icons/react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from '@/components/ui/tooltip';
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from '@/components/ui/accordion';
import {
  NODE_TYPE_REGISTRY,
  NODE_CATEGORY_GROUPS,
  CATEGORY_ICON_BG,
  CATEGORY_ICON_TEXT,
} from '../constants';
import type { AutomationNodeType, NodeCategory } from '../types';

const categoryIcons: Record<NodeCategory, typeof PlayIcon> = {
  trigger: PlayIcon,
  condition: FunctionIcon,
  action: SparkleIcon,
};

const iconMap: Record<string, typeof PlayIcon> = {
  PlayIcon,
  GlobeIcon,
  ClockIcon,
  BugIcon,
  CheckCircleIcon,
  FunnelIcon,
  SparkleIcon,
  ArrowClockwiseIcon,
  FileTextIcon,
  WebhooksLogo,
  Bell,
  TerminalIcon,
  ScanIcon,
  Plug,
  ShieldIcon,
  LightningIcon,
  CodeIcon,
  Hash,
  DownloadIcon,
  FilePlusIcon,
  FileCodeIcon,
  NetworkIcon,
  RadioIcon,
  PulseIcon,
  SquareIcon,
};

interface ContextMenuState {
  x: number;
  y: number;
  flowX: number;
  flowY: number;
}

interface CanvasContextMenuProps {
  state: ContextMenuState | null;
  onClose: () => void;
  onAddNode: (type: AutomationNodeType, flowX: number, flowY: number) => void;
  hasTriggerNode?: boolean;
  onRemoveTrigger?: () => void;
}

export function CanvasContextMenu({ state, onClose, onAddNode, hasTriggerNode, onRemoveTrigger }: CanvasContextMenuProps) {
  const menuRef = React.useRef<HTMLDivElement>(null);
  const searchRef = React.useRef<HTMLInputElement>(null);
  const [search, setSearch] = React.useState('');

  React.useEffect(() => {
    if (!state) {
      setSearch('');
      return;
    }

    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    // Delay listener so the right-click that opened it doesn't also close it
    const timer = setTimeout(() => {
      document.addEventListener('click', handleClick);
      document.addEventListener('keydown', handleKey);
      document.addEventListener('contextmenu', onClose);
      searchRef.current?.focus();
    }, 0);

    return () => {
      clearTimeout(timer);
      document.removeEventListener('click', handleClick);
      document.removeEventListener('keydown', handleKey);
      document.removeEventListener('contextmenu', onClose);
    };
  }, [state, onClose]);

  if (!state) return null;

  const query = search.toLowerCase().trim();
  const allNodes = Object.values(NODE_TYPE_REGISTRY);

  const filteredByCategory = NODE_CATEGORY_GROUPS.map((g) => ({
    ...g,
    nodes: allNodes.filter(
      (n) =>
        n.category === g.category &&
        (!query ||
          n.label.toLowerCase().includes(query) ||
          n.description.toLowerCase().includes(query) ||
          n.type.toLowerCase().includes(query))
    ),
  }));

  const hasResults = filteredByCategory.some((g) => g.nodes.length > 0);

  // All closed by default; expand all when searching
  const openItems = query ? NODE_CATEGORY_GROUPS.map((g) => g.category) : [];

  return (
    <div
      ref={menuRef}
      className="absolute z-50 w-56 overflow-hidden rounded-lg border bg-popover shadow-lg"
      style={{ left: state.x, top: state.y }}
    >
      {/* MagnifyingGlassIcon input */}
      <div className="border-b px-2 py-1.5">
        <div className="relative">
          <MagnifyingGlassIcon className="absolute left-2 top-1/2 size-3 -translate-y-1/2 text-muted-foreground" />
          <Input
            ref={searchRef}
            className="h-7 pl-7 text-xs"
            placeholder="MagnifyingGlassIcon nodes..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            // Prevent click on input from closing menu
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      </div>

      <div className="max-h-72 overflow-y-auto">
        {!hasResults ? (
          <div className="flex flex-col items-center gap-1 py-4 text-muted-foreground">
            <MagnifyingGlassIcon className="size-3.5 opacity-40" />
            <p className="text-[10px]">No nodes match "{search}"</p>
          </div>
        ) : (
          <Accordion
            type="multiple"
            defaultValue={query ? openItems : undefined}
            key={query ? 'search' : 'default'}
            className="w-full"
          >
            {filteredByCategory.map((group) => {
              if (group.nodes.length === 0) return null;
              const CategoryIcon = categoryIcons[group.category];

              return (
                <AccordionItem
                  key={group.category}
                  value={group.category}
                  className="border-b-0"
                >
                  <AccordionTrigger className="px-3 py-1 hover:no-underline [&>svg]:size-3 [&>svg]:text-muted-foreground/60">
                    <div className="flex items-center gap-1.5">
                      <CategoryIcon className="size-3 text-muted-foreground" />
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                        {group.label}
                      </span>
                    </div>
                  </AccordionTrigger>

                  <AccordionContent className="pb-1">
                    {group.nodes.map((def) => {
                      const Icon = iconMap[def.iconName] || PlayIcon;
                      const isTrigger = def.category === 'trigger';
                      const disabled = isTrigger && hasTriggerNode;
                      return (
                        <Tooltip key={def.type} delayDuration={400}>
                          <TooltipTrigger asChild>
                            <button
                              type="button"
                              className={cn(
                                'flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs',
                                disabled
                                  ? 'opacity-40 cursor-not-allowed'
                                  : 'hover:bg-accent'
                              )}
                              onClick={() => {
                                if (disabled) {
                                  toast.error('Trigger already exists', {
                                    description: 'A workflow can only have one trigger. Remove the existing one first.',
                                    action: {
                                      label: 'Remove',
                                      onClick: () => onRemoveTrigger?.(),
                                    },
                                  });
                                  return;
                                }
                                onAddNode(def.type, state.flowX, state.flowY);
                              }}
                            >
                              <div
                                className={cn(
                                  'flex size-5 shrink-0 items-center justify-center rounded',
                                  CATEGORY_ICON_BG[def.category],
                                )}
                              >
                                <Icon className={cn('size-3', CATEGORY_ICON_TEXT[def.category])} />
                              </div>
                              <div className="min-w-0 flex-1">
                                <span className="truncate block">{def.label}</span>
                              </div>
                            </button>
                          </TooltipTrigger>
                          <TooltipContent side="right" sideOffset={8} className="max-w-48">
                            <p className="font-medium">{def.label}</p>
                            <p className="text-[11px] opacity-80">{def.description}</p>
                          </TooltipContent>
                        </Tooltip>
                      );
                    })}
                  </AccordionContent>
                </AccordionItem>
              );
            })}
          </Accordion>
        )}
      </div>
    </div>
  );
}
