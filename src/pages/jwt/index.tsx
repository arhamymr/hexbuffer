import { ButtonGroup } from '@/components/ui/button-group';
import { Button } from '@/components/ui/button';
import { CopyIcon, TrashIcon } from '@phosphor-icons/react';
import { cn } from '@/lib/utils';
import { useJwtPage } from './hooks/use-jwt-page';
import { JwtDecodeView } from './components/jwt-decode-view';
import { JwtGenerateView } from './components/jwt-generate-view';

export function JwtPage() {
  const page = useJwtPage();

  const isEmpty =
    page.mode === 'decode'
      ? !page.tokenInput
      : !page.genHeader && !page.genPayload && !page.generatedToken;

  return (
    <div  className="bg-background h-full p-2">
      <div className="flex h-full min-h-0 flex-col border rounded-md overflow-hidden">
 {/* Toolbar */}
      <div className="flex h-10 shrink-0 items-center justify-between border-b bg-muted/40 px-3 gap-2">
        <div className="flex items-center gap-2">
          <ButtonGroup>
            <Button
              variant="outline"
              className={cn(
                'h-6 text-xs px-2.5',
                page.mode === 'decode' && 'text-green-500',
              )}
              data-state={page.mode === 'decode' ? 'on' : 'off'}
              onClick={() => page.setMode('decode')}
            >
              Decode
            </Button>
            <Button
              variant="outline"
              className={cn(
                'h-6 text-xs px-2.5',
                page.mode === 'generate' && 'text-green-500',
              )}
              data-state={page.mode === 'generate' ? 'on' : 'off'}
              onClick={() => page.setMode('generate')}
            >
              Generate
            </Button>
          </ButtonGroup>

          {page.mode === 'decode' && page.decoded && (
            <span className="text-[10px] px-1 py-0.5 rounded font-mono text-white bg-blue-600">
              {page.decoded.algorithm}
            </span>
          )}
          {page.mode === 'decode' && page.vulnerabilities.length > 0 && (
            <span className="text-[10px] px-1 py-0.5 rounded font-mono text-white bg-amber-600">
              {page.vulnerabilities.length} finding
              {page.vulnerabilities.length !== 1 ? 's' : ''}
            </span>
          )}
        </div>

        <div className="flex items-center gap-1.5">
          {page.mode === 'decode' && (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => page.handleCopy(page.tokenInput)}
                disabled={!page.tokenInput}
                className="h-7 text-xs gap-1 px-2"
              >
                <CopyIcon className="h-3 w-3" />
                CopyIcon Token
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={page.handleClear}
                disabled={!page.tokenInput}
                className="h-7 w-7 text-muted-foreground hover:text-foreground"
              >
                <TrashIcon className="h-3.5 w-3.5" />
              </Button>
            </>
          )}
          {page.mode === 'generate' && (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => page.handleCopy(page.generatedToken)}
                disabled={!page.generatedToken}
                className="h-7 text-xs gap-1 px-2"
              >
                <CopyIcon className="h-3 w-3" />
                CopyIcon Token
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={page.handleClearGenerate}
                disabled={isEmpty}
                className="h-7 w-7 text-muted-foreground hover:text-foreground"
              >
                <TrashIcon className="h-3.5 w-3.5" />
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Content */}
      <main className="min-h-0 flex-1 flex flex-col">
        {page.mode === 'decode' ? (
          <JwtDecodeView
            tokenInput={page.tokenInput}
            setTokenInput={page.setTokenInput}
            decoded={page.decoded}
            vulnerabilities={page.vulnerabilities}
            decodeError={page.decodeError}
            onCopy={page.handleCopy}
          />
        ) : (
          <JwtGenerateView
            genHeader={page.genHeader}
            setGenHeader={page.setGenHeader}
            genPayload={page.genPayload}
            setGenPayload={page.setGenPayload}
            genSecret={page.genSecret}
            setGenSecret={page.setGenSecret}
            genAlgorithm={page.genAlgorithm}
            setGenAlgorithm={page.setGenAlgorithm}
            generatedToken={page.generatedToken}
            genError={page.genError}
            generating={page.generating}
            onGenerate={page.handleGenerate}
            onCopy={page.handleCopy}
          />
        )}
      </main>
      </div>
     
    </div>
  );
}
