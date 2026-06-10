'use client';

import React from 'react';
import {
  Play,
  SquareFunction,
  Sparkles,
  Globe,
  Clock,
  Bug,
  CheckCircle,
  Filter,
  RefreshCw,
  FileText,
  Webhook,
  Bell,
  Terminal,
  GripVertical,
  ScanLine,
  Plug,
  Shield,
  Zap,
  Code,
  Hash,
  Download,
  FilePlus,
  FileCode,
  Network,
  Radio,
  Activity,
  Square,
  Search,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from '@/components/ui/accordion';
import { useDnD } from './dnd-context';
import {
  NODE_TYPE_REGISTRY,
  NODE_CATEGORY_GROUPS,
  CATEGORY_ICON_BG,
  CATEGORY_ICON_TEXT,
} from '../constants';
import type { AutomationNodeType, NodeCategory } from '../types';

const categoryIcons: Record<NodeCategory, typeof Play> = {
  trigger: Play,
  condition: SquareFunction,
  action: Sparkles,
};

const iconMap: Record<string, typeof Play> = {
  Play,
  Globe,
  Clock,
  Bug,
  CheckCircle,
  Filter,
  Sparkles,
  RefreshCw,
  FileText,
  Webhook,
  Bell,
  Terminal,
  ScanLine,
  Plug,
  Shield,
  Zap,
  Code,
  Hash,
  Download,
  FilePlus,
  FileCode,
  Network,
  Radio,
  Activity,
  Square,
};

export function NodePalette() {
  const { setType, addNodeAtCenter } = useDnD();
  const [search, setSearch] = React.useState('');

  const handleDragStart = React.useCallback(
    (event: React.DragEvent, nodeType: AutomationNodeType) => {
      setType(nodeType);
      event.dataTransfer.setData('text/plain', nodeType);
      event.dataTransfer.effectAllowed = 'move';
    },
    [setType]
  );

  const handleClick = React.useCallback(
    (nodeType: AutomationNodeType) => {
      addNodeAtCenter?.(nodeType);
    },
    [addNodeAtCenter]
  );

  const query = search.toLowerCase().trim();
  const allNodes = React.useMemo(
    () => Object.values(NODE_TYPE_REGISTRY),
    []
  );

  // Filter nodes by search query
  const filteredByCategory = React.useMemo(() => {
    if (!query) {
      return NODE_CATEGORY_GROUPS.map((g) => ({
        ...g,
        nodes: allNodes.filter((n) => n.category === g.category),
      }));
    }
    return NODE_CATEGORY_GROUPS.map((g) => ({
      ...g,
      nodes: allNodes.filter(
        (n) =>
          n.category === g.category &&
          (n.label.toLowerCase().includes(query) ||
            n.description.toLowerCase().includes(query) ||
            n.type.toLowerCase().includes(query))
      ),
    }));
  }, [query, allNodes]);

  // All open when searching, or default open
  const openItems = query
    ? NODE_CATEGORY_GROUPS.map((g) => g.category)
    : NODE_CATEGORY_GROUPS.map((g) => g.category);

  const hasResults = filteredByCategory.some((g) => g.nodes.length > 0);

  return (
    <div className="flex h-full w-full flex-col border-r bg-background">
      <div className="shrink-0 space-y-2 border-b px-3 py-2">
        <p className="text-xs font-semibold text-muted-foreground">Nodes</p>
        <div className="relative">
          <Search className="absolute left-2 top-1/2 size-3 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="h-7 pl-7 text-xs"
            placeholder="Search nodes..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <ScrollArea className="w-full flex-1">
        {!hasResults ? (
          <div className="flex flex-col items-center gap-1.5 py-8 text-muted-foreground">
            <Search className="size-4 opacity-40" />
            <p className="text-[11px]">No nodes match "{search}"</p>
          </div>
        ) : (
          <Accordion
            type="multiple"
            defaultValue={openItems}
            key={query ? 'search' : 'default'}
            className="w-full px-2 pt-1"
          >
            {filteredByCategory.map((group) => {
              if (group.nodes.length === 0) return null;
              const CategoryIcon = categoryIcons[group.category];

              return (
                <AccordionItem
                  key={group.category}
                  value={group.category}
                  className="w-full border-b-0"
                >
                  <AccordionTrigger className="w-full py-1.5 hover:no-underline [&>svg]:size-3.5 [&>svg]:text-muted-foreground/60">
                    <div className="flex items-center gap-1.5">
                      <CategoryIcon className="size-3 text-muted-foreground" />
                      <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                        {group.label}
                      </span>
                      <Badge variant="outline" className="text-[9px] px-1 py-0 h-3.5">
                        {group.nodes.length}
                      </Badge>
                    </div>
                  </AccordionTrigger>

                  <AccordionContent className="w-full overflow-visible pb-2">
                    <div className="w-full space-y-0.5">
                      {group.nodes.map((def) => {
                        const Icon = iconMap[def.iconName] || Play;
                        return (
                          <div
                            key={def.type}
                            draggable
                            onDragStart={(e) => handleDragStart(e, def.type)}
                            onClick={() => handleClick(def.type)}
                            className={cn(
                              'flex w-full cursor-grab items-center gap-2 rounded-lg border px-2.5 py-2 transition-colors active:cursor-grabbing',
                              'hover:bg-accent hover:border-accent-foreground/20',
                              'active:scale-[0.98]',
                            )}
                          >
                            <div
                              className={cn(
                                'flex size-6 items-center justify-center rounded-md',
                                CATEGORY_ICON_BG[def.category],
                              )}
                            >
                              <Icon className={cn('size-3', CATEGORY_ICON_TEXT[def.category])} />
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-[11px] font-medium">{def.label}</p>
                              <p className="truncate text-[9px] leading-tight text-muted-foreground">
                                {def.description}
                              </p>
                            </div>
                            <GripVertical className="size-3 shrink-0 text-muted-foreground/40" />
                          </div>
                        );
                      })}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              );
            })}
          </Accordion>
        )}
      </ScrollArea>
    </div>
  );
}
