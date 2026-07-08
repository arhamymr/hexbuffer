
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CopyIcon, TrashIcon } from '@phosphor-icons/react';
import { useXssGeneratorPage } from './hooks/use-xss-generator-page';
import { PayloadLibraryPanel } from './components/payload-library-panel';
import { PayloadBuilderPanel } from './components/payload-builder-panel';
import { CATEGORY_LABELS } from './constants';
import type { XssPayloadCategory } from './types';

export function XssGeneratorPage() {
  const page = useXssGeneratorPage();

  const isEmpty = !page.basePayload && !page.encodedOutput;

  return (
    <div className="flex h-full min-h-0 flex-col bg-background">
      {/* Toolbar */}
      <div className="flex shrink-0 items-center justify-between border-b px-2 py-1 gap-3">
        <Tabs
          value={page.activeCategory}
          onValueChange={(v) => page.setActiveCategory(v as XssPayloadCategory)}
        >
          <TabsList>
            {(Object.keys(CATEGORY_LABELS) as XssPayloadCategory[]).map((cat) => (
              <TabsTrigger key={cat} value={cat}>
                {CATEGORY_LABELS[cat]}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>

        <div className="flex items-center gap-1 shrink-0">
          <Button
            variant="outline"
            onClick={() => page.handleCopy(page.encodedOutput)}
            disabled={!page.encodedOutput}
          >
            <CopyIcon />
            Copy Output
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={page.handleClear}
            disabled={isEmpty}
          >
            <TrashIcon />
          </Button>
        </div>
      </div>

      <main className="flex min-h-0 flex-1">
        <div className="w-72 shrink-0">
          <PayloadLibraryPanel
            filteredPayloads={page.filteredPayloads}
            onSelectPayload={page.handleSelectPayload}
          />
        </div>

        <div className="flex-1 min-w-0">
          <PayloadBuilderPanel
            basePayload={page.basePayload}
            onBasePayloadChange={page.setBasePayload}
            encodings={page.encodings}
            onToggleEncoding={page.toggleEncoding}
            injectionContext={page.injectionContext}
            onInjectionContextChange={page.setInjectionContext}
            encodedOutput={page.encodedOutput}
            onCopy={page.handleCopy}
          />
        </div>
      </main>
    </div>
  );
}
