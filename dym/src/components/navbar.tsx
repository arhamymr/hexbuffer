'use client';

import * as React from 'react';
import { invoke } from '@tauri-apps/api/core';
import { cn } from '@/lib/utils';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';
import { Play, Loader2 } from 'lucide-react';
import { TargetDialog } from './target-dialog';
import { ScopeManager } from './scope-manager';
import type { Target } from '@/types';

interface NavbarProps {
  className?: string;
  targets: Target[];
  selectedTarget: Target | null;
  onTargetSelect: (target: Target | null) => void;
  onTargetUpdated: () => void;
}

export function Navbar({
  className,
  targets,
  selectedTarget,
  onTargetSelect,
  onTargetUpdated,
}: NavbarProps) {
  const [proxyRunning, setProxyRunning] = React.useState(false);
  const [proxyLoading, setProxyLoading] = React.useState(false);

  React.useEffect(() => {
    const checkStatus = async () => {
      try {
        const status = await invoke<{ running: boolean }>('get_proxy_status');
        setProxyRunning(status.running);
      } catch (e) {
        console.error('Failed to get proxy status:', e);
      }
    };
    checkStatus();
    const interval = setInterval(checkStatus, 2000);
    return () => clearInterval(interval);
  }, []);

  const startProxy = async () => {
    setProxyLoading(true);
    try {
      await invoke('start_proxy', { port: 8888, targetId: selectedTarget?.id || null });
      setProxyRunning(true);
    } catch (e) {
      console.error('Failed to start proxy:', e);
    } finally {
      setProxyLoading(false);
    }
  };

  const stopProxy = async () => {
    setProxyLoading(true);
    try {
      await invoke('stop_proxy');
      setProxyRunning(false);
    } catch (e) {
      console.error('Failed to stop proxy:', e);
    } finally {
      setProxyLoading(false);
    }
  };

  return (
    <nav className={cn('flex items-center justify-between h-14 px-4 border-b bg-card', className)}>
      <div className="flex items-center gap-4">
        {selectedTarget && (
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground">Target:</span>
            <Badge variant="outline" className="font-medium px-3 py-1">
              {selectedTarget.name}
            </Badge>
            {selectedTarget.scope.length > 0 ? (
              <div className="flex items-center gap-1">
                {selectedTarget.scope.slice(0, 3).map((s, i) => (
                  <Badge key={i} variant="secondary" className="text-xs">
                    {s}
                  </Badge>
                ))}
                {selectedTarget.scope.length > 3 && (
                  <Badge variant="secondary" className="text-xs">
                    +{selectedTarget.scope.length - 3}
                  </Badge>
                )}
              </div>
            ) : (
              <Badge variant="destructive" className="text-xs">
                No Scope
              </Badge>
            )}
          </div>
        )}
      </div>

      <div className="flex items-center gap-2">
        <Select
          value={selectedTarget?.id || ''}
          onValueChange={(value) => {
            const target = targets.find((t) => t.id === value);
            onTargetSelect(target || null);
          }}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Select Target" />
          </SelectTrigger>
          <SelectContent>
            {targets.length === 0 ? (
              <SelectItem value="empty" disabled>
                No Targets
              </SelectItem>
            ) : (
              targets.map((t) => (
                <SelectItem key={t.id} value={t.id}>
                  {t.name}
                </SelectItem>
              ))
            )}
          </SelectContent>
        </Select>

        <TargetDialog onTargetCreated={onTargetUpdated} />

        {selectedTarget && <ScopeManager target={selectedTarget} targets={targets} onScopeUpdated={onTargetUpdated} />}

        <div className="relative">
          <div className={`h-2 w-2 ${proxyRunning ? 'bg-green-500 rounded-full animate-pulse' : 'bg-gray-400 rounded-full'}`} />
        </div>

        {!proxyRunning ? (
          <Button onClick={startProxy} disabled={proxyLoading} size="sm">
            {proxyLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Play className="mr-2 h-4 w-4" />}
            Start Proxy
          </Button>
        ) : (
          <Button onClick={stopProxy} disabled={proxyLoading} variant="destructive" size="sm">
            <Loader2 className="mr-2 h-4 w-4 animate-spin" /> 
            Stop
          </Button>
        )}
      </div>
    </nav>
  );
}
