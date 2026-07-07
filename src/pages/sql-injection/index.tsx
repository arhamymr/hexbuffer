import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from '@/components/ui/resizable';
import { useSqliPage } from './hooks/use-sqli-page';
import { ScanToolbar } from './components/scan-toolbar';
import { ParametersPanel } from './components/parameters-panel';
import { VulnerabilitiesTab } from './components/vulnerabilities-tab';
import { ExtractionTab } from './components/extraction-tab';

export function SqlInjectionPage() {
  const page = useSqliPage();

  return (
    <div className="flex h-full min-h-0 flex-col bg-background">
      <ScanToolbar
        url={page.url}
        onUrlChange={page.setUrl}
        method={page.method}
        onMethodChange={page.setMethod}
        riskLevel={page.riskLevel}
        onRiskLevelChange={page.setRiskLevel}
        techniques={page.techniques}
        onToggleTechnique={page.toggleTechnique}
        isRunning={page.isRunning}
        progress={page.progress}
        error={page.error}
        vulnerabilitiesCount={page.vulnerabilities.length}
        databasesCount={page.databases.length}
        hasUrlAndParams={!!page.url.trim() && page.parameters.length > 0}
        onStart={page.startScan}
        onStop={page.stopScan}
        onClear={page.clearResults}
        onExportJson={page.handleExportJson}
        onExportCsv={page.handleExportCsv}
      />

      <main className="min-h-0 flex-1 flex flex-col">
        {/* Sleek top-level progress bar */}
        {page.progress.total > 0 && (
          <div className="w-full bg-muted/20 shrink-0 border-b">
            <div className="h-[2px] bg-primary/25 rounded-full overflow-hidden w-full relative">
              <div
                className="h-full bg-primary transition-all duration-300 shadow-[0_0_8px_rgba(var(--primary),0.5)]"
                style={{
                  width: `${Math.min(100, (page.progress.current / page.progress.total) * 100)}%`,
                }}
              />
            </div>
            <div className="px-4 py-1 text-[10px] text-muted-foreground font-mono flex items-center justify-between">
              <span>{page.progress.message}</span>
              <span className="font-semibold">{Math.round(Math.min(100, (page.progress.current / page.progress.total) * 100))}%</span>
            </div>
          </div>
        )}

        <ResizablePanelGroup orientation="horizontal" className="flex-1 min-h-0">
          {/* Left panel: parameters config */}
          <ResizablePanel defaultSize={22} minSize={15} maxSize={35} className="flex flex-col">
            <ParametersPanel
              parameters={page.parameters}
              newParamName={page.newParamName}
              newParamValue={page.newParamValue}
              injectCount={page.injectCount}
              onNewParamNameChange={page.setNewParamName}
              onNewParamValueChange={page.setNewParamValue}
              onAddParameter={page.addParameter}
              onRemoveParameter={page.removeParameter}
              onToggleParamInject={page.toggleParamInject}
              onParamValueChange={(name, value) =>
                page.setParameters(prev =>
                  prev.map(p => (p.name === name ? { ...p, value } : p)),
                )
              }
            />
          </ResizablePanel>

          <ResizableHandle withHandle />

          {/* Right panel: results (tabs) */}
          <ResizablePanel defaultSize={78} className="flex flex-col min-h-0">
            <Tabs defaultValue="vulnerabilities" className="h-full flex flex-col min-h-0 bg-background">
              <div className="flex h-9 shrink-0 items-center justify-between border-b bg-muted/15 px-3">
                <TabsList className="h-7 bg-background/50 p-0.5 border shadow-sm rounded-md">
                  <TabsTrigger value="vulnerabilities" className="h-6 text-[11px] px-3 font-medium transition-all">
                    Vulnerabilities
                    {page.vulnerabilities.length > 0 && (
                      <Badge
                        variant="outline"
                        className="ml-1.5 px-1 py-0 h-4 text-[9px] border-amber-500/20 text-amber-600 bg-amber-500/5 font-bold"
                      >
                        {page.vulnerabilities.length}
                      </Badge>
                    )}
                  </TabsTrigger>
                  <TabsTrigger value="extraction" className="h-6 text-[11px] px-3 font-medium transition-all">
                    Data Extraction
                    {page.databases.length > 0 && (
                      <Badge
                        variant="outline"
                        className="ml-1.5 px-1 py-0 h-4 text-[9px] font-bold"
                      >
                        {page.databases.length}
                      </Badge>
                    )}
                  </TabsTrigger>
                </TabsList>
              </div>

              <TabsContent
                value="vulnerabilities"
                className="flex-1 min-h-0 flex flex-col m-0 overflow-hidden"
              >
                <VulnerabilitiesTab
                  vulnerabilities={page.vulnerabilities}
                  isRunning={page.isRunning}
                  selectedVuln={page.selectedVuln}
                  selectedVulnData={page.selectedVulnData}
                  onSelectVuln={page.setSelectedVuln}
                />
              </TabsContent>

              <TabsContent 
                value="extraction" 
                className="flex-1 min-h-0 flex flex-col m-0 overflow-hidden"
              >
                <ExtractionTab
                  databases={page.databases}
                  isRunning={page.isRunning}
                  selectedDb={page.selectedDb}
                  selectedTable={page.selectedTable}
                  selectedDbData={page.selectedDbData}
                  tableData={page.tableData}
                  onSelectDb={page.setSelectedDb}
                  onSelectTable={page.setSelectedTable}
                />
              </TabsContent>
            </Tabs>
          </ResizablePanel>
        </ResizablePanelGroup>
      </main>
    </div>
  );
}
