'use client';

import * as React from 'react';
import { Pencil, Trash2, ExternalLink } from 'lucide-react';
import { Finding, formatDate } from './types';
import { SeverityBadge } from './SeverityBadge';
import { StatusBadge } from './StatusBadge';
import { Button } from '@/components/ui/button';

interface FindingCardProps {
  finding: Finding;
  onEdit: (finding: Finding) => void;
  onDelete: (id: string) => void;
  onViewDetails: (finding: Finding) => void;
}

export function FindingCard({ finding, onEdit, onDelete, onViewDetails }: FindingCardProps) {
  const requestInfo = React.useMemo(() => {
    if (!finding.request_data) return null;
    try {
      const req = JSON.parse(finding.request_data);
      return `${req.method} ${req.url}`;
    } catch {
      return null;
    }
  }, [finding.request_data]);

  const responseInfo = React.useMemo(() => {
    if (!finding.response_data) return null;
    try {
      const res = JSON.parse(finding.response_data);
      return { status: res.status, time_ms: res.time_ms };
    } catch {
      return null;
    }
  }, [finding.response_data]);

  return (
    <div className="border rounded-lg p-4 hover:bg-muted/50 transition-colors">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <SeverityBadge severity={finding.severity} />
            <StatusBadge status={finding.status} />
          </div>
          <h3
            className="font-medium text-base cursor-pointer hover:underline"
            onClick={() => onViewDetails(finding)}
          >
            {finding.title || '(Untitled Finding)'}
          </h3>
          {requestInfo && (
            <p className="text-sm text-muted-foreground font-mono truncate mt-1">
              {requestInfo}
            </p>
          )}
          <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
            {responseInfo && (
              <span>
                Status: {responseInfo.status} · {responseInfo.time_ms}ms
              </span>
            )}
            <span>Submitted {formatDate(finding.created_at)}</span>
          </div>
          {finding.description && (
            <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
              {finding.description}
            </p>
          )}
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => onViewDetails(finding)}
          >
            <ExternalLink className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => onEdit(finding)}
          >
            <Pencil className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-destructive hover:text-destructive"
            onClick={() => onDelete(finding.id)}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}