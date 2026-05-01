'use client';

import * as React from 'react';
import { invoke } from '@tauri-apps/api/core';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Plus, Trash2, Loader2 } from 'lucide-react';
import type { Target } from '@/types';

interface ScopeTableProps {
  targets: Target[];
  onTargetsUpdated: () => void;
}

interface ScopeEntry {
  targetId: string;
  targetName: string;
  domain: string;
  isWildcard: boolean;
}

export function ScopeTable({ targets, onTargetsUpdated }: ScopeTableProps) {
  const [newDomain, setNewDomain] = React.useState('');
  const [includeSubdomain, setIncludeSubdomain] = React.useState(true);
  const [selectedTargetId, setSelectedTargetId] = React.useState<string>('');
  const [loading, setLoading] = React.useState(false);

  React.useEffect(() => {
    if (targets.length > 0 && !selectedTargetId) {
      setSelectedTargetId(targets[0].id);
    }
  }, [targets, selectedTargetId]);

  const entries: ScopeEntry[] = React.useMemo(() => {
    const result: ScopeEntry[] = [];
    for (const target of targets) {
      for (const scope of target.scope) {
        const isWildcard = scope.startsWith('*.');
        const domain = isWildcard ? scope.slice(2) : scope;
        result.push({
          targetId: target.id,
          targetName: target.name,
          domain,
          isWildcard,
        });
      }
    }
    return result;
  }, [targets]);

  const handleAddDomain = async () => {
    if (!newDomain.trim() || !selectedTargetId) return;
    setLoading(true);
    try {
      const scopeValue = includeSubdomain ? `*.${newDomain.trim()}` : newDomain.trim();
      await invoke('add_target_scope', {
        id: selectedTargetId,
        scope: [scopeValue],
      });
      setNewDomain('');
      onTargetsUpdated();
    } catch (e) {
      console.error('Failed to add scope:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveDomain = async (targetId: string, domain: string, isWildcard: boolean) => {
    setLoading(true);
    try {
      const scopeValue = isWildcard ? `*.${domain}` : domain;
      await invoke('remove_target_scope', {
        id: targetId,
        scope: [scopeValue],
      });
      onTargetsUpdated();
    } catch (e) {
      console.error('Failed to remove scope:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleSubdomain = async (entry: ScopeEntry) => {
    setLoading(true);
    try {
      const oldScope = entry.isWildcard ? `*.${entry.domain}` : entry.domain;
      const newScope = entry.isWildcard ? entry.domain : `*.${entry.domain}`;
      await invoke('remove_target_scope', { id: entry.targetId, scope: [oldScope] });
      await invoke('add_target_scope', { id: entry.targetId, scope: [newScope] });
      onTargetsUpdated();
    } catch (e) {
      console.error('Failed to toggle subdomain:', e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Input
          value={newDomain}
          onChange={(e) => setNewDomain(e.target.value)}
          placeholder="domain.com"
          className="w-48"
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleAddDomain();
          }}
        />
        <label className="flex items-center gap-1.5 text-sm cursor-pointer">
          <Checkbox
            checked={includeSubdomain}
            onCheckedChange={(checked) => setIncludeSubdomain(checked === true)}
          />
          <span>Subdomain</span>
        </label>
        <Button size="sm" onClick={handleAddDomain} disabled={!newDomain.trim() || !selectedTargetId || loading}>
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
        </Button>
        <Select value={selectedTargetId} onValueChange={setSelectedTargetId}>
          <SelectTrigger className="w-[140px] h-8">
            <SelectValue placeholder="Select target" />
          </SelectTrigger>
          <SelectContent>
            {targets.map((t) => (
              <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {entries.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground text-sm border rounded-md">
          No scope domains configured. Add a domain above to get started.
        </div>
      ) : (
        <div className="border rounded-md">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[150px]">Target</TableHead>
                <TableHead>Domain</TableHead>
                <TableHead className="w-[80px] text-center">Subdomain</TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {entries.map((entry, index) => (
                <TableRow key={index}>
                  <TableCell className="font-medium text-xs">{entry.targetName}</TableCell>
                  <TableCell className="text-sm">{entry.domain}</TableCell>
                  <TableCell className="text-center">
                    <Checkbox
                      checked={entry.isWildcard}
                      onCheckedChange={() => handleToggleSubdomain(entry)}
                      disabled={loading}
                    />
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveDomain(entry.targetId, entry.domain, entry.isWildcard)}
                      disabled={loading}
                    >
                      <Trash2 className="h-3 w-3 text-destructive" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}