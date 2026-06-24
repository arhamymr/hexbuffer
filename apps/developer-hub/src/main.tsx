import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { invoke } from "@tauri-apps/api/core";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { ThemeProvider } from "@/components/theme-provider";
import { AppLayout } from "@/layout";
import { Toaster } from "@/components/ui/sonner";
import { Settings } from "@/pages/settings";
import { suppressResizeObserverLoopErrors } from "@/lib/resize-observer-errors";
import AppRoutes from "./App";
import "@fontsource-variable/geist";
import "@fontsource-variable/geist-mono";
import "@/styles/globals.css";

suppressResizeObserverLoopErrors();

function isSettingsWindow(): boolean {
  try {
    return getCurrentWindow().label === "settings";
  } catch {
    return false;
  }
}

function getResponseDetailCallId(): string | null {
  const params = new URLSearchParams(window.location.search);
  if (params.get("window") === "response-detail") {
    return params.get("callId");
  }
  return null;
}

function MainWindowReadySignal() {
  React.useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      // Mark as dismissed so the HTML fallback timer won't fire
      if (typeof (window as any).__dismissSplash === 'function') {
        (window as any).__dismissSplash();
      }
      invoke("show_main_window").catch((error) => {
        console.error("Failed to show main window:", error);
      });
    }, 250);

    return () => window.clearTimeout(timeoutId);
  }, []);

  return null;
}

function Root() {
  if (isSettingsWindow()) {
    return (
      <BrowserRouter>
        <ThemeProvider>
          <div className="h-screen overflow-hidden bg-background">
            <Settings />
          </div>
          <Toaster />
        </ThemeProvider>
      </BrowserRouter>
    );
  }

  return (
    <BrowserRouter>
      <ThemeProvider>
        <AppLayout>
          <AppRoutes />
        </AppLayout>
        <MainWindowReadySignal />
        <Toaster />
      </ThemeProvider>
    </BrowserRouter>
  );
}

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <Root />
  </React.StrictMode>
);
