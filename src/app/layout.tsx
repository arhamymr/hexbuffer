'use client';

import { ThemeProvider } from '@/components/theme-provider';
import { TrafficProvider } from '@/providers/TrafficProvider';
import { AppLayout } from '@/components/app-sidebar';
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
          <TrafficProvider>
            <AppLayout>
              {children}
            </AppLayout>
          </TrafficProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}