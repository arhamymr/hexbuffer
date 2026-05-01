'use client';

import * as React from 'react';
import { invoke } from '@tauri-apps/api/core';
import { Finding, Severity, FindingStatus, HttpRequestData, HttpResponseData, createNewFinding } from './types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface FindingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  finding: Finding | null;
  targetId: string;
  onSave: (finding: Finding) => void;
  mode: 'create' | 'edit';
}

export function FindingDialog({
  open,
  onOpenChange,
  finding,
  targetId,
  onSave,
  mode,
}: FindingDialogProps) {
  const [formData, setFormData] = React.useState<Finding | null>(null);
  const [showRequestPreview, setShowRequestPreview] = React.useState(false);
  const [showResponsePreview, setShowResponsePreview] = React.useState(false);

  React.useEffect(() => {
    if (finding) {
      setFormData(finding);
    } else {
      setFormData(createNewFinding(targetId));
    }
  }, [finding, targetId]);

  const handleSave = async () => {
    if (!formData) return;

    const updatedFinding = {
      ...formData,
      updated_at: Date.now(),
    };

    try {
      if (mode === 'create') {
        await invoke('create_finding', { finding: updatedFinding });
      } else {
        await invoke('update_finding', { finding: updatedFinding });
      }
      onSave(updatedFinding);
      onOpenChange(false);
    } catch (error) {
      console.error('Failed to save finding:', error);
    }
  };

  if (!formData) return null;

  const parsedRequest = React.useMemo(() => {
    if (!formData.request_data) return null;
    try {
      return JSON.parse(formData.request_data) as HttpRequestData;
    } catch {
      return null;
    }
  }, [formData.request_data]);

  const parsedResponse = React.useMemo(() => {
    if (!formData.response_data) return null;
    try {
      return JSON.parse(formData.response_data) as HttpResponseData;
    } catch {
      return null;
    }
  }, [formData.response_data]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {mode === 'create' ? 'Create Finding' : 'Edit Finding'}
          </DialogTitle>
          <DialogDescription>
            {mode === 'create'
              ? 'Document a new security finding'
              : 'Update the finding details'}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="title">Title *</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) =>
                  setFormData({ ...formData, title: e.target.value })
                }
                placeholder="e.g., SQL Injection in Login Form"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="severity">Severity *</Label>
              <Select
                value={formData.severity}
                onValueChange={(value) =>
                  setFormData({
                    ...formData,
                    severity: value as Severity,
                  })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="critical">Critical</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="info">Info</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
              placeholder="Describe the vulnerability..."
              className="min-h-[80px]"
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="steps">Steps to Reproduce</Label>
            <Textarea
              id="steps"
              value={formData.steps_to_reproduce}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  steps_to_reproduce: e.target.value,
                })
              }
              placeholder="1. Navigate to login page&#10;2. Enter payload in username field&#10;3. Click submit..."
              className="min-h-[100px]"
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="impact">Impact</Label>
            <Textarea
              id="impact"
              value={formData.impact}
              onChange={(e) =>
                setFormData({ ...formData, impact: e.target.value })
              }
              placeholder="What is the potential impact of this vulnerability?"
              className="min-h-[80px]"
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="remediation">Remediation</Label>
            <Textarea
              id="remediation"
              value={formData.remediation}
              onChange={(e) =>
                setFormData({ ...formData, remediation: e.target.value })
              }
              placeholder="How should this vulnerability be fixed?"
              className="min-h-[80px]"
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="status">Status *</Label>
            <Select
              value={formData.status}
              onValueChange={(value) =>
                setFormData({
                  ...formData,
                  status: value as FindingStatus,
                })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="open">Open</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="verified">Verified</SelectItem>
                <SelectItem value="fixed">Fixed</SelectItem>
                <SelectItem value="false_positive">False Positive</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {parsedRequest && (
            <div className="grid gap-2">
              <div className="flex items-center justify-between">
                <Label>Attached Request</Label>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowRequestPreview(!showRequestPreview)}
                >
                  {showRequestPreview ? 'Hide' : 'Show'} Preview
                </Button>
              </div>
              {showRequestPreview && (
                <pre className="bg-muted p-4 rounded-md overflow-auto text-xs font-mono h-48">
                  {JSON.stringify(parsedRequest, null, 2)}
                </pre>
              )}
            </div>
          )}

          {parsedResponse && (
            <div className="grid gap-2">
              <div className="flex items-center justify-between">
                <Label>Attached Response</Label>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowResponsePreview(!showResponsePreview)}
                >
                  {showResponsePreview ? 'Hide' : 'Show'} Preview
                </Button>
              </div>
              {showResponsePreview && (
                <pre className="bg-muted p-4 rounded-md overflow-auto text-xs font-mono h-48">
                  {JSON.stringify(parsedResponse, null, 2)}
                </pre>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={!formData.title.trim()}>
            {mode === 'create' ? 'Create Finding' : 'Save Changes'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}