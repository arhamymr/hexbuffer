import { Loader2 } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { useShallow } from 'zustand/shallow';
import { useAnnotationCapture } from '../hooks/use-annotation-capture';
import { useAnnotationMarkers } from '../hooks/use-annotation-markers';
import { useBrowserWebview } from '../hooks/use-browser-webview';
import {
  browserTabHide,
  browserTabInjectAnnotation,
  browserTabRemoveAnnotationOverlay,
  browserTabShow,
  onBrowserTabLoaded,
  onBrowserTabTitleChanged,
} from '@/lib/browser-panel-api';
import { cn } from '@/lib/utils';
import {
  EMPTY_ANNOTATION_ARRAY,
  normalizeUrl,
  useAnnotationStore,
} from '@/stores/annotation-store';
import {
  type AnnotationSubMode,
  useBrowserSessionStore,
} from '@/stores/browser-session-store';
import { AnnotationExportModal } from './annotation-export-modal';
import { AnnotationPanel } from './annotation-panel';
import { BrowserControls } from './browser-controls';

interface BrowserPanelProps {
  browserTabId: string;
  isVisible: boolean;
}

const DEFAULT_URL = 'https://www.google.com';
const ANNOTATION_UNAVAILABLE_MESSAGE =
  'Element grabber is not available on this page due to security policies';
const ANNOTATION_INJECTION_RETRY_COUNT = 4;
const ANNOTATION_INJECTION_RETRY_DELAY_MS = 250;

function isTransientAnnotationInjectionError(error: string): boolean {
  const normalizedError = error.toLowerCase();
  return (
    normalizedError.includes('body not ready') ||
    normalizedError.includes('document.body') ||
    normalizedError.includes('bootstrap probe failed')
  );
}

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

export function BrowserPanel({ browserTabId, isVisible }: BrowserPanelProps) {
  const url = useBrowserSessionStore((state) => state.tabs.get(browserTabId)?.url || DEFAULT_URL);
  const loading = useBrowserSessionStore((state) => state.tabs.get(browserTabId)?.loading ?? false);
  const annotationMode = useBrowserSessionStore(
    (state) => state.tabs.get(browserTabId)?.annotationMode ?? false
  );
  const annotationSubMode = useBrowserSessionStore(
    (state) => state.tabs.get(browserTabId)?.annotationSubMode ?? 'draw'
  );

  const [exportOpen, setExportOpen] = useState(false);
  const webviewWasVisibleRef = useRef(false);

  const annotations = useAnnotationStore(
    useShallow((state) => {
      if (!url) return EMPTY_ANNOTATION_ARRAY;
      return state.getAnnotationsForUrl(url);
    })
  );
  const grabbedElements = annotations.filter((annotation) => annotation.geometry.type === 'element');

  const handleOpenExport = useCallback(() => {
    if (exportOpen) return;
    browserTabHide(browserTabId)
      .then((result) => {
        if (result.success) {
          webviewWasVisibleRef.current = true;
        }
      })
      .catch(console.error);
    setExportOpen(true);
  }, [browserTabId, exportOpen]);

  const handleCloseExport = useCallback(
    (open: boolean) => {
      setExportOpen(open);
      if (!open && webviewWasVisibleRef.current) {
        if (isVisible) {
          browserTabShow(browserTabId).catch(console.error);
        }
        webviewWasVisibleRef.current = false;
      }
    },
    [browserTabId, isVisible]
  );

  const handleExitAnnotationMode = useCallback(() => {
    useBrowserSessionStore.getState().setAnnotationMode(browserTabId, false);
  }, [browserTabId]);

  const { containerRef } = useBrowserWebview(browserTabId, isVisible, url);
  const injectedModeRef = useRef<AnnotationSubMode | null>(null);
  const desiredModeRef = useRef<AnnotationSubMode | null>(null);
  const reconcileChainRef = useRef<Promise<void>>(Promise.resolve());
  const [annotationOverlayAvailable, setAnnotationOverlayAvailable] = useState(true);
  const [annotationOverlayError, setAnnotationOverlayError] = useState<string | null>(null);

  useAnnotationCapture(browserTabId);
  useAnnotationMarkers(browserTabId, isVisible, normalizeUrl(url));

  // Listen for title changes and update store
  useEffect(() => {
    const subscription = onBrowserTabTitleChanged((payload) => {
      if (payload.browserTabId === browserTabId) {
        useBrowserSessionStore.getState().updateTitle(browserTabId, payload.title);
      }
    });
    return () => subscription.unlisten();
  }, [browserTabId]);

  // Serialized overlay reconciler
  const reconcileOverlay = useCallback(() => {
    const run = async () => {
      let tornDownForSwitch: AnnotationSubMode | null = null;

      for (;;) {
        const desired = desiredModeRef.current;
        const current = injectedModeRef.current;

        if (desired === current) return;

        if (desired === null) {
          await browserTabRemoveAnnotationOverlay(browserTabId).catch(console.error);
          injectedModeRef.current = null;
          continue;
        }

        if (current !== null) {
          tornDownForSwitch = current;
          await browserTabRemoveAnnotationOverlay(browserTabId).catch(console.error);
          injectedModeRef.current = null;
          continue;
        }

        let result = await browserTabInjectAnnotation(browserTabId, desired);
        for (
          let attempt = 0;
          !result.success &&
          isTransientAnnotationInjectionError(result.error) &&
          attempt < ANNOTATION_INJECTION_RETRY_COUNT;
          attempt += 1
        ) {
          await wait(ANNOTATION_INJECTION_RETRY_DELAY_MS);
          if (desiredModeRef.current !== desired) return;
          result = await browserTabInjectAnnotation(browserTabId, desired);
        }

        if (result.success) {
          injectedModeRef.current = desired;
          setAnnotationOverlayAvailable(true);
          setAnnotationOverlayError(null);
        } else {
          console.error('[BrowserPanel] annotation injection failed:', result.error);
          injectedModeRef.current = null;
          setAnnotationOverlayAvailable(false);
          setAnnotationOverlayError(result.error);
          toast.error(`${ANNOTATION_UNAVAILABLE_MESSAGE}: ${result.error}`);
          desiredModeRef.current = null;
          if (tornDownForSwitch && tornDownForSwitch !== desired) {
            useBrowserSessionStore.getState().setAnnotationSubMode(
              browserTabId,
              tornDownForSwitch
            );
          }
          return;
        }
      }
    };

    const next = reconcileChainRef.current.then(run, run);
    reconcileChainRef.current = next;
    return next;
  }, [browserTabId]);

  useEffect(() => {
    if (!annotationMode || !isVisible || loading) {
      if (!annotationMode || !isVisible) {
        desiredModeRef.current = null;
      }
      void reconcileOverlay();
      return;
    }

    desiredModeRef.current = annotationSubMode;
    void reconcileOverlay();
  }, [annotationMode, annotationSubMode, loading, isVisible, reconcileOverlay]);

  // Re-inject overlay when page loads while annotation mode is enabled
  useEffect(() => {
    const subscription = onBrowserTabLoaded((payload) => {
      if (payload.browserTabId !== browserTabId) return;
      injectedModeRef.current = null;
      desiredModeRef.current = annotationMode && isVisible ? annotationSubMode : null;
      void reconcileOverlay();
    });
    return () => subscription.unlisten();
  }, [annotationMode, annotationSubMode, browserTabId, isVisible, reconcileOverlay]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      desiredModeRef.current = null;
      void reconcileOverlay();
    };
  }, [reconcileOverlay]);

  return (
    <div
      className={cn(
        'w-full h-full flex flex-col',
        isVisible ? 'visible' : 'invisible absolute inset-0'
      )}
    >
      {isVisible && <BrowserControls browserTabId={browserTabId} />}
      <div className="flex flex-1 overflow-hidden">
        <div ref={containerRef} className="flex-1 bg-background relative">
          {loading && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-background/80 z-10">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <span className="mt-2 text-sm text-muted-foreground">Loading...</span>
            </div>
          )}
        </div>
        {annotationMode && (
          <AnnotationPanel
            url={url}
            annotationOverlayAvailable={annotationOverlayAvailable}
            annotationOverlayError={annotationOverlayError}
            onExitAnnotationMode={handleExitAnnotationMode}
            onExport={handleOpenExport}
          />
        )}
      </div>
      <AnnotationExportModal
        open={exportOpen}
        onOpenChange={handleCloseExport}
        annotations={grabbedElements}
      />
    </div>
  );
}
