import { WarningCircleIcon } from '@phosphor-icons/react';
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
  if (vulnerabilities.length === 0 && !isRunning) {
    return (
      <div className="h-full flex flex-col items-center justify-center gap-2 text-muted-foreground">
        <WarningCircleIcon className="h-8 w-8 text-muted-foreground/55" />
        <p className="text-xs">No vulnerabilities found. Configure target and start scan.</p>
      </div>
    );
  }

  return (
    <div className="flex-1 min-h-0 flex">
      <ScrollArea className="flex-1 border-r">
        <Table className="text-xs">
          <TableHeader className="sticky top-0 z-10 bg-background">
            <TableRow className="hover:bg-transparent">
              <TableHead className="h-8 py-0">Parameter</TableHead>
              <TableHead className="h-8 py-0">Location</TableHead>
              <TableHead className="h-8 py-0">Technique</TableHead>
              <TableHead className="h-8 py-0">DBMS</TableHead>
              <TableHead className="h-8 py-0">Severity</TableHead>
              <TableHead className="h-8 py-0">PoC</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {vulnerabilities.map(vuln => (
              <TableRow
                key={vuln.id}
                className={`hover:bg-muted/30 cursor-pointer ${selectedVuln === vuln.id ? 'bg-muted/65' : ''}`}
                onClick={() => onSelectVuln(vuln.id)}
              >
                <TableCell className="font-mono py-1">{vuln.param_name}</TableCell>
                <TableCell className="py-1">{vuln.param_location}</TableCell>
                <TableCell className="py-1">{vuln.technique.replace('_', ' ')}</TableCell>
                <TableCell className="py-1">{vuln.dbms}</TableCell>
                <TableCell className="py-1">
                  <Badge
                    variant="outline"
                    className={`text-[9px] px-1 py-0 h-4 uppercase ${SEVERITY_COLORS[vuln.severity]}`}
                  >
                    {vuln.severity}
                  </Badge>
                </TableCell>
                <TableCell
                  className="font-mono text-[11px] py-1 truncate max-w-[120px]"
                  title={vuln.poc_request}
                >
                  {vuln.poc_request}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </ScrollArea>

      {selectedVulnData && (
        <div className="w-72 flex flex-col shrink-0 border-l">
          <div className="p-2 border-b bg-muted/10">
            <span className="text-[11px] font-semibold uppercase text-muted-foreground tracking-wider">
              Details
            </span>
          </div>
          <ScrollArea className="flex-1 p-3">
            <div className="space-y-3 text-xs">
              <div>
                <Label className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider block">
                  Parameter
                </Label>
                <p className="font-mono text-xs font-semibold">
                  {selectedVulnData.param_name} ({selectedVulnData.param_location})
                </p>
              </div>
              <div>
                <Label className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider block">
                  Technique
                </Label>
                <p>{TECHNIQUE_LABELS[selectedVulnData.technique as SqliTechnique]}</p>
              </div>
              <div>
                <Label className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider block">
                  DBMS
                </Label>
                <p>{selectedVulnData.dbms}</p>
              </div>
              <div>
                <Label className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider block">
                  Severity
                </Label>
                <Badge
                  variant="outline"
                  className={`text-[9px] px-1.5 py-0 h-4 uppercase mt-0.5 ${SEVERITY_COLORS[selectedVulnData.severity]}`}
                >
                  {selectedVulnData.severity}
                </Badge>
              </div>
              <div>
                <Label className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider block">
                  FingerprintIcon
                </Label>
                <p className="font-mono text-[10px] bg-muted/10 p-1 rounded break-all">
                  {selectedVulnData.fingerprint}
                </p>
              </div>
              <div>
                <Label className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider block">
                  Proof of Concept
                </Label>
                <pre className="mt-1 p-2 bg-muted/20 border rounded text-[10px] font-mono whitespace-pre-wrap break-all max-h-36 overflow-auto">
                  {selectedVulnData.poc_request}
                </pre>
              </div>
            </div>
          </ScrollArea>
        </div>
      )}
    </div>
  );
}
