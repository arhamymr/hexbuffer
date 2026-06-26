import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
        {page.progress.total > 0 && (
          <div className="px-3 py-1 bg-muted/5 border-b space-y-1">
            <div className="h-1 bg-muted rounded-full overflow-hidden w-full">
              <div
                className="h-full bg-primary transition-all duration-300"
                style={{
                  width: `${Math.min(100, (page.progress.current / page.progress.total) * 100)}%`,
                }}
              />
            </div>
            <div className="text-[10px] text-muted-foreground font-medium">
              {page.progress.message}
            </div>
          </div>
        )}

        <div className="grid h-full min-h-0 grid-cols-1 lg:grid-cols-3">
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

          <div className="lg:col-span-2 flex flex-col min-h-0 bg-background">
            <Tabs defaultValue="vulnerabilities" className="h-full flex flex-col min-h-0">
              <div className="flex h-8 shrink-0 items-center border-b bg-muted/15 px-2">
                <TabsList className="h-6 bg-background p-0.5 border">
                  <TabsTrigger value="vulnerabilities" className="h-5 text-[11px] px-2.5">
                    Vulnerabilities
                    {page.vulnerabilities.length > 0 && (
                      <Badge
                        variant="outline"
                        className="ml-1 px-1 h-4 text-[9px] border-amber-500/20 text-amber-600 bg-amber-500/5 font-semibold"
                      >
                        {page.vulnerabilities.length}
                      </Badge>
                    )}
                  </TabsTrigger>
                  <TabsTrigger value="extraction" className="h-5 text-[11px] px-2.5">
                    Data Extraction
                    {page.databases.length > 0 && (
                      <Badge
                        variant="outline"
                        className="ml-1 px-1 h-4 text-[9px] font-semibold"
                      >
                        {page.databases.length}
                      </Badge>
                    )}
                  </TabsTrigger>
                </TabsList>
              </div>

              <TabsContent
                value="vulnerabilities"
                className="flex-1 min-h-0 flex flex-col m-0"
              >
                <VulnerabilitiesTab
                  vulnerabilities={page.vulnerabilities}
                  isRunning={page.isRunning}
                  selectedVuln={page.selectedVuln}
                  selectedVulnData={page.selectedVulnData}
                  onSelectVuln={page.setSelectedVuln}
                />
              </TabsContent>

              <TabsContent value="extraction" className="flex-1 min-h-0 flex flex-col m-0">
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
          </div>
        </div>
      </main>
    </div>
  );
}
