'use client';

import { motion, AnimatePresence } from 'motion/react';

import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useSidebarNav } from './use-floating-nav';

import { useFloatingPageButtons } from './use-floating-page-buttons';

export function DockPageButtons() {
  const { pathname } = useSidebarNav();
  const pageButtons = useFloatingPageButtons(pathname);

  const hasVisible = pageButtons.some((btn) => btn.visible);

  return (
    <AnimatePresence mode="popLayout">
      {hasVisible && (
        <motion.div
          key="dock-page-buttons"
          className="relative p-[1px] rounded-lg overflow-hidden flex items-center justify-center"
          initial={{ opacity: 0, y: 12, scale: 0.88 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 10, scale: 0.88 }}
          transition={{ duration: 0.45, ease: [0.23, 1, 0.32, 1] }}
        >
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
                        initial={{ scale: 0.5, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.5, opacity: 0 }}
                        transition={{ duration: 0.3, ease: 'easeOut' }}
                        className={cn(
                          'relative flex items-center justify-center rounded-sm transition-colors hover:scale-110',
                          btn.showLabel ? 'h-7 gap-1.5 px-2.5 text-xs font-medium' : 'size-7',
                          !btn.variant && 'text-muted-foreground hover:bg-muted/80 hover:text-foreground',
                          !btn.variant && btn.isActive && 'bg-primary/15 text-primary',
                          btn.variant === 'primary' && 'bg-primary text-primary-foreground hover:bg-primary/90',
                          btn.variant === 'destructive' && 'bg-destructive text-destructive-foreground hover:bg-destructive/90',
                        )}
                        onClick={btn.onClick}
                      >
                        <btn.icon className={cn('size-4', btn.showLabel && 'shrink-0')} />
                        {btn.showLabel && <span>{btn.label}</span>}
                      </motion.button>
                    </TooltipTrigger>
                    <TooltipContent side="top" sideOffset={12}>{btn.label}</TooltipContent>
                  </Tooltip>
                ),
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

