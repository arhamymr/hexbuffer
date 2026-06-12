import { Crosshair, FileDown, Trash2, X } from 'lucide-react';
import { useEffect, useRef } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import {
  type Annotation,
  type ElementGeometry,
  normalizeUrl,
  useAnnotationStore,
} from '@/stores/annotation-store';

interface AnnotationPanelProps {
  url: string;
  annotationOverlayAvailable: boolean;
  annotationOverlayError: string | null;
  onExitAnnotationMode: () => void;
  onExport: () => void;
}

const selectorConfidenceClass: Record<ElementGeometry['selectorConfidence'], string> = {
  'unique-id': 'bg-green-100 text-green-800 border-green-200',
  'unique-class': 'bg-orange-100 text-orange-800 border-orange-200',
  fallback: 'bg-secondary text-secondary-foreground border-border',
};

function truncateForDisplay(value: string, maxLength: number): string {
  if (value.length <= maxLength) return value;
  return `${value.slice(0, Math.max(0, maxLength - 1))}...`;
}

function formatBox(geometry: ElementGeometry): string {
  const box = geometry.boundingBox;
  return `${Math.round(box.width)}x${Math.round(box.height)} @ ${Math.round(box.x)}, ${Math.round(
    box.y
  )}`;
}

function KeyValueRows({
  values,
  emptyLabel,
}: {
  values: Record<string, string>;
  emptyLabel: string;
}) {
  const entries = Object.entries(values).filter(([, value]) => value);

  if (entries.length === 0) {
    return <div className="text-[11px] text-muted-foreground">{emptyLabel}</div>;
  }

  return (
    <div className="space-y-1">
      {entries.map(([key, value]) => (
        <div key={key} className="grid grid-cols-[92px_minmax(0,1fr)] gap-2 text-[11px]">
          <div className="text-muted-foreground truncate">{key}</div>
          <div className="font-mono text-foreground break-all">{value}</div>
        </div>
      ))}
    </div>
  );
}

function GrabbedElementDetails({ geometry }: { geometry: ElementGeometry }) {
  const selectorPreview = truncateForDisplay(geometry.selector, 72);
  const textPreview = truncateForDisplay(geometry.textContent.trim(), 96);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="outline" className="font-mono text-[10px] px-1.5 py-0">
          {`<${geometry.tagName}>`}
        </Badge>
        <Badge
          className={cn('text-[10px] border', selectorConfidenceClass[geometry.selectorConfidence])}
        >
          {geometry.selectorConfidence}
        </Badge>
        <span className="text-[10px] text-muted-foreground font-mono">{formatBox(geometry)}</span>
      </div>

      <div>
        <div className="mb-1 text-[10px] font-medium uppercase text-muted-foreground">Selector</div>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="text-[11px] text-foreground font-mono break-all cursor-default">
              {selectorPreview}
            </div>
          </TooltipTrigger>
          <TooltipContent side="left" className="max-w-md break-all text-xs font-mono">
            {geometry.selector}
          </TooltipContent>
        </Tooltip>
      </div>

      <div>
        <div className="mb-1 text-[10px] font-medium uppercase text-muted-foreground">Text</div>
        <div className="text-[11px] text-muted-foreground whitespace-pre-wrap break-words">
          {textPreview || '(no visible text)'}
        </div>
      </div>

      <div>
        <div className="mb-1 text-[10px] font-medium uppercase text-muted-foreground">
          Attributes
        </div>
        <KeyValueRows values={geometry.attributes} emptyLabel="No captured attributes." />
      </div>

      <div>
        <div className="mb-1 text-[10px] font-medium uppercase text-muted-foreground">
          Computed Styles
        </div>
        <KeyValueRows values={geometry.computedStyles} emptyLabel="No computed styles captured." />
      </div>
    </div>
  );
}

function GrabbedElementItem({
  annotation,
  isSelected,
  onSelect,
  onDelete,
}: {
  annotation: Annotation;
  isSelected: boolean;
  onSelect: () => void;
  onDelete: (id: string) => void;
}) {
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isSelected && cardRef.current) {
      cardRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [isSelected]);

  if (annotation.geometry.type !== 'element') return null;

  return (
    <div
      ref={cardRef}
      onClick={onSelect}
      className={cn(
        'rounded-md border border-border bg-card p-3 space-y-3 cursor-pointer',
        'transition-colors hover:border-primary/50 hover:shadow-sm',
        isSelected && 'ring-2 ring-primary border-primary shadow-md shadow-primary/10'
      )}
    >
      <div className="flex items-center gap-2">
        <Crosshair size={13} className="text-primary shrink-0" />
        <div className="min-w-0 flex-1 text-xs font-medium truncate">
          {annotation.geometry.tagName}
        </div>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete(annotation.id);
          }}
          className="p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
          title="Delete grabbed element"
        >
          <Trash2 size={12} />
        </button>
      </div>

      <GrabbedElementDetails geometry={annotation.geometry} />
    </div>
  );
}

export function AnnotationPanel({
  url,
  annotationOverlayAvailable,
  annotationOverlayError,
  onExitAnnotationMode,
  onExport,
}: AnnotationPanelProps) {
  const annotations = useAnnotationStore((state) => state.getAnnotationsForUrl(url));
  const removeAnnotation = useAnnotationStore((state) => state.removeAnnotation);
  const setSelectedAnnotationId = useAnnotationStore((state) => state.setSelectedAnnotationId);
  const selectedAnnotationId = useAnnotationStore(
    (state) => state.selectedAnnotationIdByUrl.get(normalizeUrl(url)) ?? null
  );

  const normalizedUrl = normalizeUrl(url);
  const grabbedElements = annotations.filter((annotation) => annotation.geometry.type === 'element');
  const hasGrabbedElements = grabbedElements.length > 0;

  return (
    <div className="w-80 border-l border-border bg-background flex flex-col shrink-0">
      <div className="px-3 py-2 border-b border-border bg-card space-y-2">
        <div className="flex items-center justify-between">
          <div className="min-w-0">
            <h3 className="text-sm font-medium">Element Grabber</h3>
            <div className="text-[10px] text-muted-foreground">
              {annotationOverlayAvailable
                ? 'Hover a page element, then click to grab it.'
                : annotationOverlayError || 'Unavailable on this page.'}
            </div>
          </div>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                type="button"
                onClick={onExitAnnotationMode}
                className="h-7 w-7 p-0"
                aria-label="Close element grabber"
              >
                <X size={14} />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">Close grabber</TooltipContent>
          </Tooltip>
        </div>

        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-[10px]">
            {grabbedElements.length} grabbed
          </Badge>
          <div className="flex-1" />
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                type="button"
                onClick={onExport}
                disabled={!hasGrabbedElements}
                className="h-7 w-7 p-0 hover:bg-primary/10"
                aria-label={hasGrabbedElements ? 'Export grabbed elements' : 'No elements to export'}
              >
                <FileDown size={13} />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">
              {hasGrabbedElements ? 'Export grabbed elements' : 'No elements to export'}
            </TooltipContent>
          </Tooltip>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {grabbedElements.length === 0 ? (
          <div className="text-xs text-muted-foreground text-center py-8">
            No elements grabbed on this page.
          </div>
        ) : (
          grabbedElements.map((annotation) => (
            <GrabbedElementItem
              key={annotation.id}
              annotation={annotation}
              isSelected={selectedAnnotationId === annotation.id}
              onSelect={() => setSelectedAnnotationId(normalizedUrl, annotation.id)}
              onDelete={(id) => {
                removeAnnotation(normalizedUrl, id);
              }}
            />
          ))
        )}
      </div>
    </div>
  );
}
