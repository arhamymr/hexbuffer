import { useCallback, useEffect, useRef } from 'react';
import {
  browserTabCreate,
  browserTabDestroy,
  browserTabHide,
  browserTabNavigate,
  browserTabResize,
  browserTabShow,
  onBrowserTabLoaded,
  onBrowserTabNavigated,
} from '@/lib/browser-panel-api';
import { useBrowserSessionStore } from '@/stores/browser-session-store';

interface BrowserBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

const BOUNDS_EPSILON = 0.5;

function getElementBounds(el: HTMLElement): BrowserBounds {
  const rect = el.getBoundingClientRect();
  return {
    x: rect.x,
    y: rect.y,
    width: rect.width,
    height: rect.height,
  };
}

function boundsEqual(a: BrowserBounds | null, b: BrowserBounds): boolean {
  if (!a) return false;
  return (
    Math.abs(a.x - b.x) < BOUNDS_EPSILON &&
    Math.abs(a.y - b.y) < BOUNDS_EPSILON &&
    Math.abs(a.width - b.width) < BOUNDS_EPSILON &&
    Math.abs(a.height - b.height) < BOUNDS_EPSILON
  );
}

export function useBrowserWebview(browserTabId: string, isVisible: boolean, url: string) {
  const containerRef = useRef<HTMLDivElement>(null);
  const createdRef = useRef(false);
  const mountedRef = useRef(true);
  const mountTokenRef = useRef(0);
  const urlRef = useRef(url);
  const visibilityRef = useRef(isVisible);
  const loadingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastBoundsRef = useRef<BrowserBounds | null>(null);
  const resizeFrameRef = useRef(0);
  const resizeInFlightRef = useRef(false);
  const resizePendingRef = useRef(false);

  const clearLoadingTimeout = useCallback(() => {
    if (loadingTimeoutRef.current) {
      clearTimeout(loadingTimeoutRef.current);
      loadingTimeoutRef.current = null;
    }
  }, []);

  const armLoadingTimeout = useCallback(() => {
    clearLoadingTimeout();
    loadingTimeoutRef.current = setTimeout(() => {
      useBrowserSessionStore.getState().setLoading(browserTabId, false);
      loadingTimeoutRef.current = null;
    }, 6000);
  }, [browserTabId, clearLoadingTimeout]);

  const updateBoundsNow = useCallback(() => {
    const el = containerRef.current;
    if (!el || !createdRef.current || !visibilityRef.current) return;

    const bounds = getElementBounds(el);
    if (boundsEqual(lastBoundsRef.current, bounds)) return;

    lastBoundsRef.current = bounds;
    resizeInFlightRef.current = true;
    browserTabResize(browserTabId, bounds)
      .then((result) => {
        if (!result.success) {
          console.error('[BrowserWebview] resize failed:', result.error);
        }
      })
      .catch((err) => {
        console.error('[BrowserWebview] resize error:', err);
      })
      .finally(() => {
        resizeInFlightRef.current = false;
        if (resizePendingRef.current) {
          resizePendingRef.current = false;
          if (resizeFrameRef.current) {
            cancelAnimationFrame(resizeFrameRef.current);
          }
          resizeFrameRef.current = requestAnimationFrame(() => {
            resizeFrameRef.current = 0;
            updateBoundsNow();
          });
        }
      });
  }, [browserTabId]);

  const scheduleBoundsUpdate = useCallback(() => {
    if (!createdRef.current || !visibilityRef.current) return;

    if (resizeInFlightRef.current) {
      resizePendingRef.current = true;
      return;
    }

    if (resizeFrameRef.current) return;
    resizeFrameRef.current = requestAnimationFrame(() => {
      resizeFrameRef.current = 0;
      updateBoundsNow();
    });
  }, [updateBoundsNow]);

  // Create / destroy webview lifecycle
  useEffect(() => {
    mountedRef.current = true;
    mountTokenRef.current += 1;
    const mountToken = mountTokenRef.current;
    const el = containerRef.current;
    if (!el) return;

    // Register tab in store before any store operations
    useBrowserSessionStore.getState().ensureTab(browserTabId, urlRef.current);
    useBrowserSessionStore.getState().setLoading(browserTabId, true);
    armLoadingTimeout();

    // Track whether THIS invocation created the webview to avoid
    // StrictMode double-invocation destroying the surviving webview.
    let thisInvocationCreated = false;

    const bounds = getElementBounds(el);
    browserTabCreate(browserTabId, urlRef.current, bounds)
      .then((result) => {
        if (result.success) {
          thisInvocationCreated = true;

          if (!mountedRef.current || mountToken !== mountTokenRef.current) {
            browserTabDestroy(browserTabId).catch(console.error);
            return;
          }

          createdRef.current = true;
          lastBoundsRef.current = bounds;
          if (visibilityRef.current) {
            scheduleBoundsUpdate();
            browserTabShow(browserTabId).catch(console.error);
          } else {
            browserTabHide(browserTabId).catch(console.error);
          }
        } else {
          if (!mountedRef.current || mountToken !== mountTokenRef.current) return;
          console.error('[BrowserWebview] create failed:', result.error);
          clearLoadingTimeout();
          useBrowserSessionStore.getState().setLoading(browserTabId, false);
        }
      })
      .catch((err) => {
        console.error('[BrowserWebview] create error:', err);
        clearLoadingTimeout();
        useBrowserSessionStore.getState().setLoading(browserTabId, false);
      });

    return () => {
      mountedRef.current = false;
      mountTokenRef.current += 1;
      clearLoadingTimeout();
      if (thisInvocationCreated) {
        browserTabDestroy(browserTabId).catch(console.error);
      }
      if (resizeFrameRef.current) {
        cancelAnimationFrame(resizeFrameRef.current);
        resizeFrameRef.current = 0;
      }
      resizePendingRef.current = false;
      lastBoundsRef.current = null;
      createdRef.current = false;
    };
  }, [browserTabId, clearLoadingTimeout, armLoadingTimeout, scheduleBoundsUpdate]);

  // Show / hide on visibility change
  useEffect(() => {
    visibilityRef.current = isVisible;
    if (!createdRef.current) return;
    if (isVisible) {
      lastBoundsRef.current = null;
      scheduleBoundsUpdate();
      browserTabShow(browserTabId)
        .then(() => scheduleBoundsUpdate())
        .catch(console.error);
    } else {
      if (resizeFrameRef.current) {
        cancelAnimationFrame(resizeFrameRef.current);
        resizeFrameRef.current = 0;
      }
      resizePendingRef.current = false;
      browserTabHide(browserTabId).catch(console.error);
    }
  }, [isVisible, browserTabId, scheduleBoundsUpdate]);

  // Navigate when url prop changes externally
  useEffect(() => {
    if (url === urlRef.current) return;
    urlRef.current = url;
    if (!createdRef.current) return;
    useBrowserSessionStore.getState().setLoading(browserTabId, true);
    armLoadingTimeout();
    browserTabNavigate(browserTabId, url)
      .then((result) => {
        if (!result.success) {
          console.error('[BrowserWebview] navigate failed:', result.error);
          clearLoadingTimeout();
          useBrowserSessionStore.getState().setLoading(browserTabId, false);
        }
      })
      .catch((err) => {
        console.error('[BrowserWebview] navigate error:', err);
        clearLoadingTimeout();
        useBrowserSessionStore.getState().setLoading(browserTabId, false);
      });
  }, [url, browserTabId, clearLoadingTimeout, armLoadingTimeout]);

  // Bounds sync. ResizeObserver does not fire for position-only movement, so also
  // listen for window resize and capture-phase scroll events from app containers.
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const ro = new ResizeObserver(() => {
      scheduleBoundsUpdate();
    });
    ro.observe(el);
    window.addEventListener('resize', scheduleBoundsUpdate);
    window.addEventListener('scroll', scheduleBoundsUpdate, true);

    return () => {
      ro.disconnect();
      window.removeEventListener('resize', scheduleBoundsUpdate);
      window.removeEventListener('scroll', scheduleBoundsUpdate, true);
      if (resizeFrameRef.current) {
        cancelAnimationFrame(resizeFrameRef.current);
        resizeFrameRef.current = 0;
      }
    };
  }, [scheduleBoundsUpdate]);

  // Listen for URL sync and loaded events from webview poller
  useEffect(() => {
    const navSubscription = onBrowserTabNavigated((payload) => {
      if (payload.browserTabId === browserTabId) {
        urlRef.current = payload.url;
        useBrowserSessionStore.getState().updateUrl(browserTabId, payload.url);
      }
    });
    const loadedSubscription = onBrowserTabLoaded((payload) => {
      if (payload.browserTabId === browserTabId) {
        clearLoadingTimeout();
        useBrowserSessionStore.getState().setLoading(browserTabId, false);
      }
    });

    return () => {
      navSubscription.unlisten();
      loadedSubscription.unlisten();
      clearLoadingTimeout();
    };
  }, [browserTabId, clearLoadingTimeout]);

  return { containerRef };
}
