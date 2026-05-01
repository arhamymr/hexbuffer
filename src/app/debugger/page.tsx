'use client';

import { AppLayout } from '@/components/app-sidebar';
import { DebuggerPage } from '@/components/DebuggerPage';

export default function DebuggerPageRoute() {
  return (
    <AppLayout>
      <DebuggerPage />
    </AppLayout>
  );
}