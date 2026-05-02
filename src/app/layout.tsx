'use client';

import { ThemeProvider } from '@/components/theme-provider';
import { AppProvider } from '@/app/context/AppContext';
import { TabsProvider } from '@/app/context/TabsContext';
import { useTrafficSync } from '@/hooks/useTrafficSync';
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
            <AppProvider>
              <TabsProvider>
                {children}
              </TabsProvider>
            </AppProvider>
          </TrafficSyncProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}