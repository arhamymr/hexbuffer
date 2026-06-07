'use client';

import * as React from 'react';
import { AppFooter } from '@/components/layout/footer';
import { cn } from '@/lib/utils';
import { TopNav } from './top-nav';
import { AIAssistantPane } from './ai-chat';
import { useAppLayout } from './hooks/use-app-layout';

export function AppLayout({ children }: { children?: React.ReactNode }) {
  const { isAssistantOpen, toggleAssistant } = useAppLayout();

  return (
    <div
      className={cn(
        'h-screen overflow-hidden bg-background flex flex-col rounded-md border shadow-2xl',
      )}
    >
      <TopNav />
      <main className="relative flex min-h-0 flex-1 overflow-hidden">
        <section className={cn('min-w-0 flex-1 overflow-hidden ', isAssistantOpen && 'lg:pr-2')}>
          {children}
        </section>
        {isAssistantOpen && <AIAssistantPane />}
      </main>
      <AppFooter
        isAssistantOpen={isAssistantOpen}
        onToggleAssistant={toggleAssistant}
      />
    </div>
  );
}
