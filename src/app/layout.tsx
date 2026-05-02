'use client';

import { ThemeProvider } from '@/components/theme-provider';
import { useTrafficSync } from '@/hooks/useTrafficSync';
import { AppLayout } from '@/components/app-sidebar';
import './globals.css';

function TrafficSyncProvider({ children }: { children: React.ReactNode }) {
  useTrafficSync();
  return <>{children}</>;
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <ThemeProvider>
          <TrafficSyncProvider>
            <AppLayout>
              {children}
            </AppLayout>
          </TrafficSyncProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}