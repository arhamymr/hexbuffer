import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { ThemeProvider } from "@/components/theme-provider";
import { AppLayout } from "@/components/layout";
import { Toaster } from "@/components/ui/sonner";
import { Settings } from "@/pages/settings";
import { ResponseDetailWindow } from "@/pages/live-traffic/components/log-table/response-detail-window";
import AppRoutes from "./app";
import "@/styles/globals.css";

function isSettingsWindow(): boolean {
  try {
    return getCurrentWindow().label === "settings";
  } catch {
    return false;
  }
}

function isResponseDetailWindow(): string | null {
  try {
    const label = getCurrentWindow().label;
    if (label.startsWith("response-detail-")) {
      return label.slice("response-detail-".length);
    }
    return null;
  } catch {
    return null;
  }
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

  const responseDetailCallId = isResponseDetailWindow();
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
