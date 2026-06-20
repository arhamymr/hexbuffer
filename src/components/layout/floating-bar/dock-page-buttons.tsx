'use client';

import { motion, AnimatePresence } from 'motion/react';

import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import type { PageButton } from './use-floating-page-buttons';
import { useSidebarNav } from './use-floating-nav';

import { useFloatingPageButtons } from './use-floating-page-buttons';

export function DockPageButtons() {
const { pathname } = useSidebarNav();
 const pageButtons = useFloatingPageButtons(pathname);

  const hasVisible = pageButtons.some((btn) => btn.visible);
  if (!hasVisible) return null;

  return (
    <div className="relative p-[1px] rounded-lg overflow-hidden flex items-center justify-center">
      {/* Glowing border beam */}
      <div className="absolute top-1/2 left-1/2 aspect-square w-[300%] h-[300%] bg-border-beam animate-border-beam pointer-events-none" />

      <div className="relative z-10 flex items-center gap-1 rounded-[calc(var(--radius)-2px)] bg-background/90 px-1 py-1 backdrop-blur-xl">
        <AnimatePresence mode="popLayout">
          {pageButtons.map((btn) =>
            btn.visible && (
              <Tooltip key={btn.key}>
                <TooltipTrigger asChild>
                  <motion.button
                    type="button"
                    initial={{ scale: 0.4 }}
                    animate={{ scale: 1 }}
                    transition={{ duration: 0.2, ease: 'easeOut' }}
                    className={cn(
                      'relative flex size-7 items-center justify-center rounded-sm transition-all hover:scale-110',
                      !btn.variant && 'text-muted-foreground hover:bg-muted/80 hover:text-foreground',
                      !btn.variant && btn.isActive && 'bg-primary/15 text-primary',
                      btn.variant === 'primary' && 'bg-primary text-primary-foreground hover:bg-primary/90',
                      btn.variant === 'destructive' && 'bg-destructive text-destructive-foreground hover:bg-destructive/90',
                    )}
                    onClick={btn.onClick}
                  >
                    <btn.icon className="size-4" />
                  </motion.button>
                </TooltipTrigger>
                <TooltipContent side="top" sideOffset={12}>{btn.label}</TooltipContent>
              </Tooltip>
            ),
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
