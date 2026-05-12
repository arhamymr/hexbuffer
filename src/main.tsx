import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { ThemeProvider } from "@/components/theme-provider";
import { AppLayout } from "@/components/top-nav";
import { Toaster } from "@/components/ui/sonner";
import { DummyDataLoader } from "@/components/dummy-data-loader";
import AppRoutes from "@/App";
import "@/app/globals.css";

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <DummyDataLoader>
      <BrowserRouter>
        <ThemeProvider>
          <AppLayout>
            <AppRoutes />
          </AppLayout>
          <Toaster />
        </ThemeProvider>
      </BrowserRouter>
    </DummyDataLoader>
  </React.StrictMode>
);