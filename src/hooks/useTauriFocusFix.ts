import React from "react";
import { getCurrentWindow } from "@tauri-apps/api/window";

/**
 * Workaround hook to fix macOS WKWebView layout drifting/freezing issues
 * when entering native fullscreen or returning from App Nap (focused spaces).
 */
export function useTauriFocusFix() {
  React.useEffect(() => {
    const isMac = navigator.userAgent.includes("Macintosh");
    if (!isMac) return;

    let unlisten: (() => void) | null = null;

    const setupListener = async () => {
      try {
        const appWindow = getCurrentWindow();
        unlisten = await appWindow.onFocusChanged(({ payload: focused }) => {
          if (focused) {
            // Trigger window resize event for JS-based layout components
            window.dispatchEvent(new Event("resize"));

            // Force a DOM layout reflow on the viewport container
            const docEl = document.documentElement;
            const originalHeight = docEl.style.height;
            
            docEl.style.height = "99.9vh";
            // Read layout property to force reflow
            void docEl.offsetHeight;

            requestAnimationFrame(() => {
              docEl.style.height = originalHeight;
            });
          }
        });
      } catch (err) {
        console.error("Failed to register focus change listener:", err);
      }
    };

    setupListener();

    return () => {
      if (unlisten) {
        unlisten();
      }
    };
  }, []);
}
