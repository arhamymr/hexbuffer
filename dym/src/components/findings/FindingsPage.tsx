'use client';

import * as React from 'react';
import { invoke } from '@tauri-apps/api/core';
import { Plus, Search, Filter, FileJson, FileText } from 'lucide-react';
import { Finding } from './types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { FindingCard } from './FindingCard';
import { FindingDialog } from './FindingDialog';
import { SeverityBadge } from './SeverityBadge';
import { StatusBadge } from './StatusBadge';

interface FindingsPageProps {
  targets: Array<{ id: string; name: string }>;
  selectedTargetId: string | null;
}

export function FindingsPage({ targets, selectedTargetId }: FindingsPageProps) {
  const [findings, setFindings] = React.useState<Finding[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [editingFinding, setEditingFinding] = React.useState<Finding | null>(null);
  const [detailsFinding, setDetailsFinding] = React.useState<Finding | null>(null);
  const [filterTarget, setFilterTarget] = React.useState<string>(selectedTargetId || 'all');
  const [filterSeverity, setFilterSeverity] = React.useState<string>('all');
  const [filterStatus, setFilterStatus] = React.useState<string>('all');
  const [searchQuery, setSearchQuery] = React.useState('');

  const loadFindings = React.useCallback(async () => {
    setLoading(true);
    try {
      const targetId = filterTarget === 'all' ? null : filterTarget;
      const data = await invoke<Finding[]>('get_findings', { targetId });
      setFindings(data);
    } catch (error) {
      console.error('Failed to load findings:', error);
    } finally {
      setLoading(false);
    }
  }, [filterTarget]);

  React.useEffect(() => {
    loadFindings();
  }, [loadFindings]);

  const handleCreateFinding = () => {
    setEditingFinding(null);
    setDialogOpen(true);
  };

  const handleEditFinding = (finding: Finding) => {
    setEditingFinding(finding);
    setDialogOpen(true);
  };

  const handleDeleteFinding = async (id: string) => {
    if (!confirm('Are you sure you want to delete this finding?')) return;

    try {
      await invoke('delete_finding', { id });
      setFindings((prev) => prev.filter((f) => f.id !== id));
    } catch (error) {
      console.error('Failed to delete finding:', error);
    }
  };

  const handleSaveFinding = (finding: Finding) => {
    if (editingFinding) {
      setFindings((prev) =>
        prev.map((f) => (f.id === finding.id ? finding : f))
      );
    } else {
      setFindings((prev) => [finding, ...prev]);
    }
  };

  const filteredFindings = findings.filter((finding) => {
    if (filterSeverity !== 'all' && finding.severity !== filterSeverity) {
      return false;
    }
    if (filterStatus !== 'all' && finding.status !== filterStatus) {
      return false;
    }
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        finding.title.toLowerCase().includes(query) ||
        finding.description.toLowerCase().includes(query) ||
        finding.steps_to_reproduce.toLowerCase().includes(query)
      );
    }
    return true;
  });

  const exportToJson = () => {
    const data = JSON.stringify(filteredFindings, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `findings-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportToMarkdown = () => {
    const lines: string[] = [
      '# Security Findings Report',
      '',
      `Generated: ${new Date().toISOString()}`,
      '',
    ];

    const bySeverity = (a: Finding, b: Finding) => {
      const order = ['critical', 'high', 'medium', 'low', 'info'];
      return order.indexOf(a.severity) - order.indexOf(b.severity);
    };

    filteredFindings.slice().sort(bySeverity).forEach((finding) => {
      lines.push(`## [${finding.severity.toUpperCase()}] ${finding.title || '(Untitled)'}`);
      lines.push('');
      lines.push(`**Status:** ${finding.status}`);
      lines.push(`**Target:** ${targets.find((t) => t.id === finding.target_id)?.name || finding.target_id}`);
      lines.push('');
      if (finding.description) {
        lines.push(`### Description`);
        lines.push(finding.description);
        lines.push('');
      }
      if (finding.steps_to_reproduce) {
        lines.push(`### Steps to Reproduce`);
        lines.push(finding.steps_to_reproduce);
        lines.push('');
      }
      if (finding.impact) {
        lines.push(`### Impact`);
        lines.push(finding.impact);
        lines.push('');
      }
      if (finding.remediation) {
        lines.push(`### Remediation`);
        lines.push(finding.remediation);
        lines.push('');
      }
      lines.push('---');
      lines.push('');
    });

    const blob = new Blob([lines.join('\n')], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `findings-${Date.now()}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const severityCounts = React.useMemo(() => {
    const counts: Record<string, number> = {
      critical: 0,
      high: 0,
      medium: 0,
      low: 0,
      info: 0,
    };
    filteredFindings.forEach((f) => {
      counts[f.severity] = (counts[f.severity] || 0) + 1;
    });
    return counts;
  }, [filteredFindings]);

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <h1 className="text-3xl font-bold">Findings</h1>
          <span className="text-sm text-muted-foreground">
            {filteredFindings.length} total
          </span>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 border rounded-md p-1">
            <Button variant="ghost" size="sm" onClick={exportToJson} title="Export JSON">
              <FileJson className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm" onClick={exportToMarkdown} title="Export Markdown">
              <FileText className="h-4 w-4" />
            </Button>
          </div>
          <Button onClick={handleCreateFinding}>
            <Plus className="h-4 w-4 mr-1" />
            New Finding
          </Button>
        </div>
      </div>

      <div className="flex items-center gap-4 mb-4">
        <div className="flex items-center gap-2 flex-1">
          <Search className="h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search findings..."
            className="h-9 max-w-xs"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <Select value={filterTarget} onValueChange={setFilterTarget}>
            <SelectTrigger className="h-9 w-40">
              <SelectValue placeholder="Target" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Targets</SelectItem>
              {targets.map((t) => (
                <SelectItem key={t.id} value={t.id}>
                  {t.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={filterSeverity} onValueChange={setFilterSeverity}>
            <SelectTrigger className="h-9 w-32">
              <SelectValue placeholder="Severity" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Severity</SelectItem>
              <SelectItem value="critical">Critical ({severityCounts.critical})</SelectItem>
              <SelectItem value="high">High ({severityCounts.high})</SelectItem>
              <SelectItem value="medium">Medium ({severityCounts.medium})</SelectItem>
              <SelectItem value="low">Low ({severityCounts.low})</SelectItem>
              <SelectItem value="info">Info ({severityCounts.info})</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="h-9 w-36">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="open">Open</SelectItem>
              <SelectItem value="in_progress">In Progress</SelectItem>
              <SelectItem value="verified">Verified</SelectItem>
              <SelectItem value="fixed">Fixed</SelectItem>
              <SelectItem value="false_positive">False Positive</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="h-8 w-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : filteredFindings.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
          <p className="text-lg mb-2">No findings yet</p>
          <p className="text-sm">
            {searchQuery || filterSeverity !== 'all' || filterStatus !== 'all'
              ? 'Try adjusting your filters'
              : 'Create your first finding to document vulnerabilities'}
          </p>
        </div>
      ) : (
        <div className="space-y-4 overflow-y-auto flex-1">
          {filteredFindings.map((finding) => (
            <FindingCard
              key={finding.id}
              finding={finding}
              onEdit={handleEditFinding}
              onDelete={handleDeleteFinding}
              onViewDetails={setDetailsFinding}
            />
          ))}
        </div>
      )}

      <FindingDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        finding={editingFinding}
        targetId={selectedTargetId || targets[0]?.id || ''}
        onSave={handleSaveFinding}
        mode={editingFinding ? 'edit' : 'create'}
      />

      <Dialog open={!!detailsFinding} onOpenChange={() => setDetailsFinding(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {detailsFinding && (
                <>
                  <SeverityBadge severity={detailsFinding.severity} />
                  <StatusBadge status={detailsFinding.status} />
                  <span className="text-lg">{detailsFinding.title || '(Untitled)'}</span>
                </>
              )}
            </DialogTitle>
          </DialogHeader>
          {detailsFinding && (
            <div className="grid gap-4 py-4">
              {detailsFinding.description && (
                <div>
                  <Label className="text-muted-foreground">Description</Label>
                  <p className="mt-1 whitespace-pre-wrap">{detailsFinding.description}</p>
                </div>
              )}
              {detailsFinding.steps_to_reproduce && (
                <div>
                  <Label className="text-muted-foreground">Steps to Reproduce</Label>
                  <p className="mt-1 whitespace-pre-wrap">{detailsFinding.steps_to_reproduce}</p>
                </div>
              )}
              {detailsFinding.impact && (
                <div>
                  <Label className="text-muted-foreground">Impact</Label>
                  <p className="mt-1 whitespace-pre-wrap">{detailsFinding.impact}</p>
                </div>
              )}
              {detailsFinding.remediation && (
                <div>
                  <Label className="text-muted-foreground">Remediation</Label>
                  <p className="mt-1 whitespace-pre-wrap">{detailsFinding.remediation}</p>
                </div>
              )}
              {detailsFinding.request_data && (
                <div>
                  <Label className="text-muted-foreground mb-2 block">Request Data</Label>
                  <pre className="bg-muted p-4 rounded-md overflow-auto text-xs font-mono max-h-64">
                    {(() => {
                      try {
                        return JSON.stringify(JSON.parse(detailsFinding.request_data!), null, 2);
                      } catch {
                        return detailsFinding.request_data || '';
                      }
                    })()}
                  </pre>
                </div>
              )}
              {detailsFinding.response_data && (
                <div>
                  <Label className="text-muted-foreground mb-2 block">Response Data</Label>
                  <pre className="bg-muted p-4 rounded-md overflow-auto text-xs font-mono max-h-64">
                    {(() => {
                      try {
                        return JSON.stringify(JSON.parse(detailsFinding.response_data!), null, 2);
                      } catch {
                        return detailsFinding.response_data || '';
                      }
                    })()}
                  </pre>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDetailsFinding(null)}>
              Close
            </Button>
            <Button onClick={() => {
              if (detailsFinding) {
                setDetailsFinding(null);
                handleEditFinding(detailsFinding);
              }
            }}>
              Edit Finding
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}