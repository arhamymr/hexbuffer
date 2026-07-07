import { useState } from 'react';
import { WarningCircleIcon, CopyIcon, CheckIcon } from '@phosphor-icons/react';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from '@/components/ui/resizable';
import type { SqliVulnerability, SqliTechnique } from '../types';
import { TECHNIQUE_LABELS, SEVERITY_COLORS } from '../constants';

interface VulnerabilitiesTabProps {
  vulnerabilities: SqliVulnerability[];
  isRunning: boolean;
  selectedVuln: string | null;
  selectedVulnData: SqliVulnerability | null;
  onSelectVuln: (id: string) => void;
}

export function VulnerabilitiesTab({
  vulnerabilities,
  isRunning,
  selectedVuln,
  selectedVulnData,
  onSelectVuln,
}: VulnerabilitiesTabProps) {
  const [copied, setCopied] = useState(false);

  const handleCopyPoC = () => {
    if (!selectedVulnData?.poc_request) return;
    navigator.clipboard.writeText(selectedVulnData.poc_request);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // ponytail: Simple empty state.
  if (vulnerabilities.length === 0 && !isRunning) {
    return (
      <div className="h-full flex flex-col items-center justify-center gap-2 text-muted-foreground select-none">
        <WarningCircleIcon className="h-10 w-10 text-muted-foreground/35" />
        <span className="text-xs font-semibold">No vulnerabilities detected</span>
        <span className="text-[10px] text-muted-foreground/60 text-center max-w-[240px]">
          Configure parameters, select injection methods, and start scanning to identify weaknesses.
        </span>
      </div>
    );
  }

  return (
    <div className="flex-1 min-h-0 h-full flex flex-col bg-background">
      <ResizablePanelGroup orientation="horizontal" className="h-full w-full">
        {/* Vulnerabilities Table Panel */}
        <ResizablePanel defaultSize={68} minSize={40} className="flex flex-col h-full">
          <ScrollArea className="flex-1 min-h-0">
            <Table className="text-xs border-b">
              <TableHeader className="sticky top-0 z-10 bg-muted/95 border-b backdrop-blur-sm shadow-sm select-none">
                <TableRow className="hover:bg-transparent">
                  <TableHead className="h-9 py-0 font-bold text-muted-foreground uppercase text-[10px] tracking-wider">Parameter</TableHead>
                  <TableHead className="h-9 py-0 font-bold text-muted-foreground uppercase text-[10px] tracking-wider">Location</TableHead>
                  <TableHead className="h-9 py-0 font-bold text-muted-foreground uppercase text-[10px] tracking-wider">Technique</TableHead>
                  <TableHead className="h-9 py-0 font-bold text-muted-foreground uppercase text-[10px] tracking-wider">DBMS</TableHead>
                  <TableHead className="h-9 py-0 font-bold text-muted-foreground uppercase text-[10px] tracking-wider">Severity</TableHead>
                  <TableHead className="h-9 py-0 font-bold text-muted-foreground uppercase text-[10px] tracking-wider">PoC Payload</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {vulnerabilities.map(vuln => {
                  const isSelected = selectedVuln === vuln.id;
                  return (
                    <TableRow
                      key={vuln.id}
                      className={`hover:bg-muted/30 cursor-pointer border-b transition-colors ${
                        isSelected ? 'bg-muted/65 font-medium' : ''
                      }`}
                      onClick={() => onSelectVuln(vuln.id)}
                    >
                      <TableCell className="font-mono py-1.5 font-semibold text-foreground max-w-[120px] truncate">{vuln.param_name}</TableCell>
                      <TableCell className="py-1.5 text-muted-foreground uppercase text-[10px] font-bold">{vuln.param_location}</TableCell>
                      <TableCell className="py-1.5 text-muted-foreground">
                        {TECHNIQUE_LABELS[vuln.technique as SqliTechnique] || vuln.technique.replace('_', ' ')}
                      </TableCell>
                      <TableCell className="py-1.5 font-medium">{vuln.dbms}</TableCell>
                      <TableCell className="py-1.5">
                        <Badge
                          variant="outline"
                          className={`text-[9px] font-extrabold tracking-wide uppercase px-1.5 py-0 h-4 rounded-full select-none ${
                            SEVERITY_COLORS[vuln.severity] || ''
                          }`}
                        >
                          {vuln.severity}
                        </Badge>
                      </TableCell>
                      <TableCell
                        className="font-mono text-[10px] py-1.5 truncate max-w-[160px] text-muted-foreground"
                        title={vuln.poc_request}
                      >
                        {vuln.poc_request}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </ScrollArea>
        </ResizablePanel>

        {selectedVulnData && (
          <>
            <ResizableHandle withHandle />
            
            {/* Vulnerability Details Panel */}
            <ResizablePanel defaultSize={32} minSize={20} className="flex flex-col h-full bg-card/45">
              <div className="flex h-9 shrink-0 items-center justify-between border-b bg-muted/15 px-3 select-none">
                <span className="text-[10px] font-bold uppercase text-muted-foreground tracking-wider">
                  Vulnerability Details
                </span>
                <Badge
                  variant="outline"
                  className={`text-[8px] font-black uppercase px-2 py-0 h-4 rounded-full ${
                    SEVERITY_COLORS[selectedVulnData.severity]
                  }`}
                >
                  {selectedVulnData.severity}
                </Badge>
              </div>
              
              <ScrollArea className="flex-1 min-h-0">
                <div className="p-4 space-y-4 text-xs">
                  {/* Parameter & Location */}
                  <div className="space-y-1">
                    <Label className="text-[10px] text-muted-foreground/75 font-semibold uppercase tracking-wider block">
                      Vulnerable Target
                    </Label>
                    <p className="font-mono text-xs font-semibold text-foreground flex items-center gap-1.5">
                      <span>{selectedVulnData.param_name}</span>
                      <span className="text-[10px] text-muted-foreground uppercase bg-muted/50 border px-1 rounded-sm leading-none py-0.5">
                        {selectedVulnData.param_location}
                      </span>
                    </p>
                  </div>

                  {/* Technique */}
                  <div className="space-y-1">
                    <Label className="text-[10px] text-muted-foreground/75 font-semibold uppercase tracking-wider block">
                      Attack Vector (Technique)
                    </Label>
                    <p className="font-medium text-foreground">
                      {TECHNIQUE_LABELS[selectedVulnData.technique as SqliTechnique] || selectedVulnData.technique}
                    </p>
                  </div>

                  {/* DBMS */}
                  <div className="space-y-1">
                    <Label className="text-[10px] text-muted-foreground/75 font-semibold uppercase tracking-wider block">
                      Database Management System
                    </Label>
                    <p className="font-semibold text-foreground">
                      {selectedVulnData.dbms}
                    </p>
                  </div>

                  {/* Database Fingerprint */}
                  <div className="space-y-1">
                    <Label className="text-[10px] text-muted-foreground/75 font-semibold uppercase tracking-wider block">
                      DBMS Fingerprint
                    </Label>
                    <div className="font-mono text-[10px] text-foreground bg-muted/15 border p-2 rounded-md break-all leading-relaxed">
                      {selectedVulnData.fingerprint || 'No fingerprint returned.'}
                    </div>
                  </div>

                  {/* Proof of Concept Request */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <Label className="text-[10px] text-muted-foreground/75 font-semibold uppercase tracking-wider block">
                        Proof of Concept Payload
                      </Label>
                      <button
                        onClick={handleCopyPoC}
                        className={`flex items-center gap-1 text-[10px] font-medium border px-1.5 py-0.5 rounded transition-all hover:bg-muted/50 ${
                          copied ? 'border-green-500/20 text-green-600 bg-green-500/5' : 'text-muted-foreground'
                        }`}
                      >
                        {copied ? (
                          <>
                            <CheckIcon className="h-3 w-3" />
                            Copied
                          </>
                        ) : (
                          <>
                            <CopyIcon className="h-3 w-3" />
                            Copy Payload
                          </>
                        )}
                      </button>
                    </div>
                    <pre className="p-2.5 bg-muted/20 border rounded-md text-[10px] font-mono whitespace-pre-wrap break-all max-h-48 overflow-y-auto leading-relaxed text-muted-foreground">
                      {selectedVulnData.poc_request}
                    </pre>
                  </div>
                </div>
              </ScrollArea>
            </ResizablePanel>
          </>
        )}
      </ResizablePanelGroup>
    </div>
  );
}
