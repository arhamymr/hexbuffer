import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { invoke } from "@tauri-apps/api/core";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { ThemeProvider } from "@/components/theme-provider";
import { AppLayout } from "@/layout";
import { Toaster } from "@/components/ui/sonner";
import { ResponseDetailWindow } from "@/pages/http-history/components/log-table/response-detail-window";
import { suppressResizeObserverLoopErrors } from "@/lib/resize-observer-errors";
import { useTauriFocusFix } from "@/hooks/useTauriFocusFix";
import AppRoutes from "./App";
import "@fontsource-variable/geist";
import "@fontsource-variable/geist-mono";
import "@/styles/globals.css";

suppressResizeObserverLoopErrors();


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
  useTauriFocusFix();


  const responseDetailCallId = getResponseDetailCallId();
  if (responseDetailCallId) {
    return (
      <BrowserRouter>
        <ThemeProvider>
          <ResponseDetailWindow callId={responseDetailCallId} />
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
