import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { ThemeProvider } from "@/components/theme-provider";
import { AppLayout } from "@/components/layout";
import { Toaster } from "@/components/ui/sonner";
import { useAppStore } from "@/stores/app";
import AppRoutes from "./app";
import "@/styles/globals.css";

useAppStore.getState().startProxy().then(() => {
  useAppStore.getState().checkProxyStatus();
});

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <BrowserRouter>
      <ThemeProvider>
        <AppLayout>
          <AppRoutes />
        </AppLayout>
        <Toaster />
      </ThemeProvider>
    </BrowserRouter>
  </React.StrictMode>
);