'use client';

import * as React from 'react';
import { AppFooter } from '@/components/layout/footer';
import { TopNav } from './top-nav';
import { AIAssistantPane } from './ai-chat';
import { useAppLayout } from './hooks/use-app-layout';
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from '@/components/ui/resizable';

const ASSISTANT_PANEL_DEFAULT_SIZE = 40;
const ASSISTANT_PANEL_MIN_SIZE = 18;
const ASSISTANT_PANEL_COLLAPSED_SIZE = 0;

export function AppLayout({ children }: { children?: React.ReactNode }) {
  const { isAssistantOpen, toggleAssistant, assistantPanelRef } = useAppLayout();

  return (
    <div className="h-screen overflow-hidden bg-background flex flex-col rounded-md border shadow-2xl">
      <TopNav />
      <main className="relative flex min-h-0 flex-1 overflow-hidden">
        <ResizablePanelGroup orientation="horizontal">
          <ResizablePanel
            defaultSize={isAssistantOpen ? 100 - ASSISTANT_PANEL_DEFAULT_SIZE : 100}
            minSize={40}
          >
            <section className="h-full min-w-0 overflow-hidden">
              {children}
            </section>
          </ResizablePanel>

          {isAssistantOpen && (
            <>
              <ResizableHandle withHandle />
              <ResizablePanel
                panelRef={assistantPanelRef}
                defaultSize={ASSISTANT_PANEL_DEFAULT_SIZE}
                minSize={ASSISTANT_PANEL_MIN_SIZE}
                maxSize="600px"
                collapsedSize={ASSISTANT_PANEL_COLLAPSED_SIZE}
                collapsible
                onResize={(size) => {
                  if (size.asPercentage <= ASSISTANT_PANEL_COLLAPSED_SIZE && isAssistantOpen) toggleAssistant();
                }}
              >
                <AIAssistantPane />
              </ResizablePanel>
            </>
          )}
        </ResizablePanelGroup>
      </main>
      <AppFooter
        isAssistantOpen={isAssistantOpen}
        onToggleAssistant={toggleAssistant}
      />
    </div>
  );
}
