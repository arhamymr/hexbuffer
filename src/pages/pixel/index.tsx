import React, { useState } from 'react';
import { ButtonGroup } from '@/components/ui/button-group';
import { Button } from '@/components/ui/button';
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from '@/components/ui/resizable';
import { CopyIcon, DownloadIcon } from '@phosphor-icons/react';
import { cn } from '@/lib/utils';

import { usePixelPage } from './hooks/use-pixel-page';
import { PixelCanvas } from './components/pixel-canvas';
import { PixelToolbar } from './components/pixel-toolbar';
import { ColorizedJsonView } from './components/colorized-json-view';

export function PixelPage() {
  const page = usePixelPage();
  const [activeTab, setActiveTab] = useState<'editor' | 'json'>('editor');

  return (
    <div className="bg-background h-full p-2">
      <div className="flex h-full min-h-0 flex-col border rounded-md overflow-hidden">
        {/* Top Toolbar */}
        <div className="flex h-10 shrink-0 items-center justify-between border-b bg-muted/40 px-3 gap-2">
          <div className="flex items-center gap-2">
            <ButtonGroup>
              <Button
                variant="outline"
                className={cn(
                  'h-6 text-xs px-2.5',
                  activeTab === 'editor' && 'text-green-500'
                )}
                data-state={activeTab === 'editor' ? 'on' : 'off'}
                onClick={() => setActiveTab('editor')}
              >
                Editor
              </Button>
              <Button
                variant="outline"
                className={cn(
                  'h-6 text-xs px-2.5',
                  activeTab === 'json' && 'text-green-500'
                )}
                data-state={activeTab === 'json' ? 'on' : 'off'}
                onClick={() => setActiveTab('json')}
              >
                JSON Matrix
              </Button>
            </ButtonGroup>

            {page.generating && (
              <span className="text-[10px] px-1.5 py-0.5 rounded font-mono text-white bg-green-600 animate-pulse">
                AI Compiling...
              </span>
            )}
            
            {page.generateError && (
              <span className="text-[10px] px-1.5 py-0.5 rounded font-mono text-white bg-destructive">
                Error
              </span>
            )}
          </div>

          <div className="flex items-center gap-1.5">
            <Button
              variant="outline"
              size="sm"
              onClick={page.handleExportPng}
              className="h-7 text-xs gap-1.5 px-2"
              title="Download compiled image as a high-quality PNG asset"
            >
              <DownloadIcon className="h-3.5 w-3.5" />
              Export PNG
            </Button>
            
            <Button
              variant="outline"
              size="sm"
              onClick={page.handleCopyJson}
              className="h-7 text-xs gap-1.5 px-2"
              title="Copy the raw matrix JSON schema code"
            >
              <CopyIcon className="h-3.5 w-3.5" />
              Copy JSON
            </Button>
          </div>
        </div>

        {/* Content Workspace Split */}
        <main className="min-h-0 flex-1 bg-background">
          <ResizablePanelGroup orientation="horizontal">
            {/* Left side: Canvas Editor */}
            <ResizablePanel defaultSize={60} minSize={35}>
              <div className="h-full bg-background/50">
                <PixelCanvas
                  width={page.width}
                  height={page.height}
                  matrix={page.matrix}
                  palette={page.palette}
                  onCellClick={page.handleCellAction}
                  onCellMouseEnter={page.handleCellMouseEnter}
                />
              </div>
            </ResizablePanel>

            <ResizableHandle withHandle />

            {/* Right side: Editor configuration tabs */}
            <ResizablePanel defaultSize={40} minSize={25}>
              <div className="h-full bg-background border-l">
                {activeTab === 'editor' ? (
                  <PixelToolbar
                    width={page.width}
                    height={page.height}
                    onDimensionChange={page.handleDimensionChange}
                    
                    palette={page.palette}
                    selectedPaletteIndex={page.selectedPaletteIndex}
                    onPaletteSelect={page.handlePaletteSelect}
                    onAddColor={page.handleAddColor}
                    onUpdateColor={page.handleUpdateColor}
                    onDeleteColor={page.handleDeleteColor}
                    
                    activeColorIndex={page.activeColorIndex}
                    onActiveColorSelect={page.setActiveColorIndex}
                    drawMode={page.drawMode}
                    onDrawModeChange={page.setDrawMode}
                    
                    prompt={page.prompt}
                    onPromptChange={page.setPrompt}
                    generating={page.generating}
                    onGenerate={page.handleGenerate}
                    
                    onClear={page.handleClear}
                    onFill={page.handleFill}

                    assetName={page.generatedName}
                    onAssetNameChange={page.setGeneratedName}
                  />
                ) : (
                  <div className="h-full bg-muted/5">
                    {page.generateError ? (
                      <div className="p-4 text-xs font-mono text-destructive bg-destructive/5 h-full overflow-auto whitespace-pre-wrap">
                        <div className="font-bold mb-1">Compilation Failure Details:</div>
                        {page.generateError}
                      </div>
                    ) : (
                      <ColorizedJsonView value={page.formattedJson} />
                    )}
                  </div>
                )}
              </div>
            </ResizablePanel>
          </ResizablePanelGroup>
        </main>
      </div>
    </div>
  );
}
