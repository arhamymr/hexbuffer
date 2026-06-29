import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CopyIcon, TrashIcon, LightningIcon } from '@phosphor-icons/react';
import { useXssGeneratorPage } from './hooks/use-xss-generator-page';
import { PayloadLibraryPanel } from './components/payload-library-panel';
import { PayloadBuilderPanel } from './components/payload-builder-panel';

export function XssGeneratorPage() {
  const page = useXssGeneratorPage();

  const isEmpty = !page.basePayload && !page.encodedOutput;

  return (
    <div className="flex h-full min-h-0 flex-col bg-background">
      {/* Toolbar */}
      <div className="flex h-10 shrink-0 items-center justify-between border-b bg-muted/40 px-3 gap-2">
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="font-normal text-[10px] py-px h-5 gap-1">
            <LightningIcon className="h-3 w-3 text-amber-500 fill-amber-500/20" />
            XSS Generator
          </Badge>
          <Badge variant="secondary" className="font-normal text-[10px] py-px h-5">
            {page.filteredPayloads.length} payloads
          </Badge>
        </div>

        <div className="flex items-center gap-1.5">
          <Button
            variant="outline"
            size="sm"
            onClick={() => page.handleCopy(page.encodedOutput)}
            disabled={!page.encodedOutput}
            className="h-7 text-xs gap-1 px-2"
          >
            <CopyIcon className="h-3 w-3" />
            Copy Output
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={page.handleClear}
            disabled={isEmpty}
            className="h-7 w-7 text-muted-foreground hover:text-foreground"
          >
            <TrashIcon className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      <main className="min-h-0 flex-1 flex flex-col">
        <section className="grid h-full min-h-0 grid-cols-1 lg:grid-cols-[300px_1fr]">
          <PayloadLibraryPanel
            activeCategory={page.activeCategory}
            onCategoryChange={page.setActiveCategory}
            filteredPayloads={page.filteredPayloads}
            onSelectPayload={page.handleSelectPayload}
          />

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
        </section>
      </main>
    </div>
  );
}
