'use client';

import { ThemeProvider } from '@/components/theme-provider';
import { AppProvider } from '@/app/context/AppContext';
import { TabsProvider } from '@/app/context/TabsContext';
import './globals.css';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <ThemeProvider>
          <AppProvider>
            <TabsProvider>
              {children}
            </TabsProvider>
          </AppProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}