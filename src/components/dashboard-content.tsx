'use client';

import { useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { DataTable } from '@/components/ui/data-table';
import { connectionsColumns } from '@/components/connections-columns';
import { callsColumns } from '@/components/calls-columns';
import { Globe, Activity } from 'lucide-react';
import { matchesScope } from '@/lib/utils';
import type { Target, ProxyConnection, ApiCall } from '@/types';

interface DashboardContentProps {
  selectedTarget: Target | null;
  connections: ProxyConnection[];
  calls: ApiCall[];
  onScopeUpdated: () => void;
}

export function DashboardContent({
  selectedTarget,
  connections,
  calls,
  onScopeUpdated,
}: DashboardContentProps) {
  const [loading, setLoading] = useState(false);
  const [newDomain, setNewDomain] = useState('');
  const [includeSubdomain, setIncludeSubdomain] = useState(true);

  const handleAddToNewTarget = async (host: string) => {
    if (!host) return;
    setLoading(true);
    try {
      const domain = host.split(':')[0];
      const scopeValue = includeSubdomain ? `*.${domain}` : domain;
      await invoke<Target>('create_target', {
        name: domain,
        scope: [scopeValue],
      });
      onScopeUpdated();
    } catch (e) {
      console.error('Failed to create target:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleAddToScope = async (host: string) => {
    if (!host || !selectedTarget) return;
    setLoading(true);
    try {
      const domain = host.split(':')[0];
      const scopeValue = includeSubdomain ? `*.${domain}` : domain;
      await invoke('add_target_scope', {
        id: selectedTarget.id,
        scope: [scopeValue],
      });
      onScopeUpdated();
    } catch (e) {
      console.error('Failed to add scope:', e);
    } finally {
      setLoading(false);
    }
  };

  const filteredConnections = connections
    .filter(c => matchesScope(c.host, selectedTarget?.scope || []))
    .filter((conn, index, self) =>
      index === self.findIndex(c => c.host === conn.host && c.port === conn.port)
    );

  const filteredCalls = calls
    .filter(c => matchesScope(c.host, selectedTarget?.scope || []))
    .filter((call, index, self) =>
      index === self.findIndex(c => c.host === call.host && c.path === call.path)
    );

  const leftPane = (
    <Card className="flex-1 flex flex-col h-full">
      <CardHeader className="pb-3 shrink-0">
        <CardTitle className="text-base flex items-center gap-2">
          <Activity className="h-4 w-4" />
          Active Connections ({filteredConnections.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1 pt-0 min-h-0">
        {filteredConnections.length === 0 ? (
          <div className="py-4 text-center text-muted-foreground text-xs">
            No connections match scope. Configure browser proxy and browse HTTPS sites.
          </div>
        ) : (
          <DataTable
            columns={connectionsColumns({ onAddToNewTarget: handleAddToNewTarget, onAddToScope: handleAddToScope, loading })}
            data={filteredConnections}
            searchKey="host"
            searchPlaceholder="Filter hosts..."
          />
        )}
      </CardContent>
    </Card>
  );

  const rightPane = (
    <Card className="flex-1 flex flex-col h-full">
      <CardHeader className="pb-3 shrink-0">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">Captured API Calls ({filteredCalls.length})</CardTitle>
          <div className="flex items-center gap-2">
            <label className="flex items-center gap-1 text-xs text-muted-foreground">
              <Checkbox
                checked={includeSubdomain}
                onCheckedChange={(checked) => setIncludeSubdomain(checked === true)}
              />
              Subdomain
            </label>
            <Input
              placeholder="domain.com"
              value={newDomain}
              onChange={(e) => setNewDomain(e.target.value)}
              className="h-7 w-32 text-xs"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && newDomain.trim() && selectedTarget) {
                  handleAddToScope(newDomain);
                  setNewDomain('');
                }
              }}
            />
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex-1 pt-0 min-h-0">
        {filteredCalls.length === 0 ? (
          <div className="py-4 text-center text-muted-foreground text-xs">
            Waiting for API calls that match scope...
          </div>
        ) : (
          <DataTable
            columns={callsColumns}
            data={filteredCalls}
            searchKey="host"
            searchPlaceholder="Filter calls..."
          />
        )}
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-4 h-full flex flex-col">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div>
            <h1 className="text-3xl font-bold">Live Monitor</h1>
            <p className="text-sm text-muted-foreground">
              Target: {selectedTarget?.name || 'None'}
            </p>
          </div>
        </div>
      </div>

      {selectedTarget ? (
        <div className="grid grid-cols-2 gap-4 flex-1 min-h-0">
          {leftPane}
          {rightPane}
        </div>
      ) : (
        <Card>
          <CardContent className="py-12">
            <div className="text-center text-muted-foreground">
              <p className="mb-2">No target selected</p>
              <p className="text-sm">Create a target and add scope patterns to start capturing API calls</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
