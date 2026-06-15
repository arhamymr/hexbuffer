'use client';

import * as React from 'react';
import { invoke } from '@tauri-apps/api/core';
import { Astroid, Info, Loader2, Sparkles, Target } from 'lucide-react';
import type { EditorView } from '@codemirror/view';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ButtonGroup } from '@/components/ui/button-group';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { TextEditor } from '@/components/ui/text-editor';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useInvokerStore } from '@/stores/invoker';
import {
  buildRawRequest,
  findRequestPayloadPositions,
  parseRawRequest,
} from '../../../types';
import { toast } from 'sonner';

interface InvokerMarkerSuggestion {
  id: string;
  start: number;
  end: number;
  value: string;
  category: string;
  location: string;
  confidence: number;
  reason: string;
}

interface InvokerMarkerSuggestionResponse {
  provider: string;
  model: string;
  suggestions: InvokerMarkerSuggestion[];
  candidateCount: number;
}

function findMarkerRanges(text: string) {
  const ranges: Array<{ start: number; end: number }> = [];
  let searchStart = 0;

  while (true) {
    const start = text.indexOf('§', searchStart);
    if (start === -1) break;
    const end = text.indexOf('§', start + 1);
    if (end === -1) break;
    ranges.push({ start, end: end + 1 });
    searchStart = end + 1;
  }

  return ranges;
}

function rangesOverlap(a: { start: number; end: number }, b: { start: number; end: number }) {
  return a.start < b.end && a.end > b.start;
}

function validateSuggestions(text: string, suggestions: InvokerMarkerSuggestion[]) {
  const markerRanges = findMarkerRanges(text);
  const usedRanges: Array<{ start: number; end: number }> = [];

  return suggestions.filter((suggestion) => {
    if (suggestion.start < 0 || suggestion.end <= suggestion.start || suggestion.end > text.length) {
      return false;
    }

    if (text.slice(suggestion.start, suggestion.end) !== suggestion.value) {
      return false;
    }

    const range = { start: suggestion.start, end: suggestion.end };
    if (markerRanges.some((markerRange) => rangesOverlap(range, markerRange))) {
      return false;
    }

    if (usedRanges.some((usedRange) => rangesOverlap(range, usedRange))) {
      return false;
    }

    usedRanges.push(range);
    return true;
  });
}

function applyMarkers(text: string, suggestions: InvokerMarkerSuggestion[]) {
  return [...suggestions]
    .sort((a, b) => b.start - a.start)
    .reduce((nextText, suggestion) => {
      const before = nextText.slice(0, suggestion.start);
      const value = nextText.slice(suggestion.start, suggestion.end);
      const after = nextText.slice(suggestion.end);
      return `${before}§${value}§${after}`;
    }, text);
}

function HighlightedRequestPreview({
  text,
  suggestions,
}: {
  text: string;
  suggestions: InvokerMarkerSuggestion[];
}) {
  const sortedSuggestions = [...suggestions].sort((a, b) => a.start - b.start);
  const parts: React.ReactNode[] = [];
  let cursor = 0;

  sortedSuggestions.forEach((suggestion) => {
    if (suggestion.start > cursor) {
      parts.push(text.slice(cursor, suggestion.start));
    }
    parts.push(
      <mark
        key={suggestion.id}
        className="rounded-sm bg-amber-300/70 px-0.5 text-foreground dark:bg-amber-500/40"
      >
        {text.slice(suggestion.start, suggestion.end)}
      </mark>
    );
    cursor = suggestion.end;
  });

  if (cursor < text.length) {
    parts.push(text.slice(cursor));
  }

  return (
    <pre className="max-h-[260px] overflow-auto whitespace-pre-wrap rounded-md border bg-muted/40 p-3 font-mono text-xs leading-relaxed">
      {parts}
    </pre>
  );
}

export function RequestTab() {
  const config = useInvokerStore((s) => {
    const tab = s.tabs.find((t) => t.id === s.activeTabId);
    return tab?.config;
  });
  const isRunning = useInvokerStore((s) => {
    const tab = s.tabs.find((t) => t.id === s.activeTabId);
    return tab?.isRunning ?? false;
  });
  const updateConfig = useInvokerStore((s) => s.updateConfig);

  const [rawRequestDraft, setRawRequestDraft] = React.useState(() =>
    config ? buildRawRequest(config.base_request) : ''
  );
  const [autoMarkLoading, setAutoMarkLoading] = React.useState(false);
  const [suggestionsDialogOpen, setSuggestionsDialogOpen] = React.useState(false);
  const [suggestions, setSuggestions] = React.useState<InvokerMarkerSuggestion[]>([]);
  const [selectedSuggestionIds, setSelectedSuggestionIds] = React.useState<Set<string>>(
    () => new Set()
  );
  const rawRequestEditorRef = React.useRef<EditorView | null>(null);
  const editRef = React.useRef(false);

  React.useEffect(() => {
    if (!config) return;
    if (editRef.current) {
      editRef.current = false;
      return;
    }
    setRawRequestDraft(buildRawRequest(config.base_request));
  }, [config?.base_request]);

  if (!config) return null;

  const updateRawRequest = (value: string) => {
    setRawRequestDraft(value);
    const parsed = parseRawRequest(value);
    if (parsed) {
      updateConfig({
        base_request: {
          ...config.base_request,
          ...parsed,
        },
        positions: findRequestPayloadPositions(parsed),
      });
    }
  };

  const markRawRequestTarget = () => {
    const view = rawRequestEditorRef.current;
    if (!view) return;

    const { from, to } = view.state.selection.main;
    if (from === to) return; // no selection

    const selectedText = view.state.sliceDoc(from, to);
    view.dispatch({
      changes: { from, to, insert: `§${selectedText}§` },
    });
    view.focus();
    updateRawRequest(view.state.doc.toString());
  };

  const handleAutoMark = async () => {
    if (!rawRequestDraft.trim()) {
      toast.error('Add a raw request before using Auto mark');
      return;
    }

    const parsed = parseRawRequest(rawRequestDraft);
    if (!parsed) {
      toast.error('Fix the raw request before using Auto mark');
      return;
    }

    setAutoMarkLoading(true);
    try {
      const response = await invoke<InvokerMarkerSuggestionResponse>('suggest_invoker_markers', {
        request: { rawRequest: rawRequestDraft },
      });
      const validSuggestions = validateSuggestions(rawRequestDraft, response.suggestions);

      if (validSuggestions.length === 0) {
        toast.info(
          response.candidateCount > 0
            ? 'AI did not find any marker suggestions to apply'
            : 'No fuzzable request inputs were found'
        );
        return;
      }

      setSuggestions(validSuggestions);
      setSelectedSuggestionIds(new Set(validSuggestions.map((suggestion) => suggestion.id)));
      setSuggestionsDialogOpen(true);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : String(error));
    } finally {
      setAutoMarkLoading(false);
    }
  };

  const selectedSuggestions = React.useMemo(
    () => suggestions.filter((suggestion) => selectedSuggestionIds.has(suggestion.id)),
    [selectedSuggestionIds, suggestions]
  );

  const handleApplyAutoMarkers = () => {
    const nextSuggestions = validateSuggestions(rawRequestDraft, selectedSuggestions);
    if (nextSuggestions.length === 0) {
      toast.error('Select at least one valid marker suggestion');
      return;
    }

    const nextRequest = applyMarkers(rawRequestDraft, nextSuggestions);
    editRef.current = true;
    updateRawRequest(nextRequest);
    setSuggestionsDialogOpen(false);
    toast.success(`Applied ${nextSuggestions.length} marker${nextSuggestions.length === 1 ? '' : 's'}`);
  };

  const toggleSuggestion = (id: string, checked: boolean) => {
    setSelectedSuggestionIds((current) => {
      const next = new Set(current);
      if (checked) {
        next.add(id);
      } else {
        next.delete(id);
      }
      return next;
    });
  };

  return (
    <div className="space-y-4">
      <div className="grid gap-2">
        <div className="flex items-center justify-between">
          <Label>Raw Request</Label>
          <div className="flex items-center gap-2">
            <Badge variant={config.positions.length > 0 ? 'default' : 'secondary'}>
              {config.positions.length} marked
            </Badge>
            <ButtonGroup>
              <Button
                type="button"
                variant="outline"
                size="xs"
                onClick={handleAutoMark}
                disabled={isRunning || autoMarkLoading}
              >
                {autoMarkLoading ? (
                  <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                ) : (
                  <Astroid className="mr-1 h-4 w-4" />
                )}
                Auto
              </Button>
              <Button
                type="button"
                variant="outline"
                size="xs"
                onClick={markRawRequestTarget}
                disabled={isRunning}
              >
                <Target className="mr-1 h-4 w-4" />
                Mark
              </Button>
            </ButtonGroup>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button type="button" variant="ghost" size="icon-sm" className="shrink-0">
                  <Info className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent className="max-w-[320px]">
                Select a URL, header, or body value and mark it as the payload insertion point.
              </TooltipContent>
            </Tooltip>
          </div>
        </div>
        <div className="h-[460px] overflow-hidden rounded-md border">
          <TextEditor
            language="javascript"
            value={rawRequestDraft}
            onChange={(value) => {
              editRef.current = true;
              updateRawRequest(value ?? '');
            }}
            onMount={(editor) => {
              rawRequestEditorRef.current = editor;
            }}
          />
        </div>
      </div>
      <Dialog open={suggestionsDialogOpen} onOpenChange={setSuggestionsDialogOpen}>
        <DialogContent className="flex max-h-[min(780px,calc(100vh-2rem))] flex-col gap-4 overflow-hidden sm:max-w-[960px]">
          <DialogHeader>
            <DialogTitle>Confirm AI marker suggestions</DialogTitle>
          </DialogHeader>

          <div className="grid min-h-0 flex-1 gap-4 overflow-hidden md:grid-cols-[minmax(0,1fr)_320px]">
            <div className="min-h-0 overflow-hidden">
              <HighlightedRequestPreview text={rawRequestDraft} suggestions={selectedSuggestions} />
            </div>

            <div className="min-h-0 max-h-full overflow-auto rounded-md border">
              <div className="flex items-center justify-between border-b px-3 py-2">
                <span className="text-sm font-medium">
                  {selectedSuggestions.length} / {suggestions.length} selected
                </span>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="ghost"
                    size="xs"
                    onClick={() => setSelectedSuggestionIds(new Set(suggestions.map((item) => item.id)))}
                  >
                    All
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="xs"
                    onClick={() => setSelectedSuggestionIds(new Set())}
                  >
                    None
                  </Button>
                </div>
              </div>
              <div className="divide-y">
                {suggestions.map((suggestion) => (
                  <label
                    key={suggestion.id}
                    className="flex cursor-pointer items-start gap-3 px-3 py-3 hover:bg-muted/60"
                  >
                    <Checkbox
                      checked={selectedSuggestionIds.has(suggestion.id)}
                      onCheckedChange={(checked) => toggleSuggestion(suggestion.id, checked === true)}
                    />
                    <span className="min-w-0 space-y-1">
                      <span className="flex flex-wrap items-center gap-2">
                        <Badge variant="secondary">{suggestion.category}</Badge>
                        <span className="truncate text-sm font-medium">{suggestion.location}</span>
                      </span>
                      <code className="block truncate rounded bg-muted px-1.5 py-0.5 text-xs">
                        {suggestion.value}
                      </code>
                      <span className="block text-xs leading-relaxed text-muted-foreground">
                        {suggestion.reason}
                      </span>
                      <span className="block text-xs text-muted-foreground">
                        Confidence {(suggestion.confidence * 100).toFixed(0)}%
                      </span>
                    </span>
                  </label>
                ))}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" size="xs" onClick={() => setSuggestionsDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              type="button"
              size="xs"
              onClick={handleApplyAutoMarkers}
              disabled={selectedSuggestions.length === 0}
            >
              Apply selected
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
