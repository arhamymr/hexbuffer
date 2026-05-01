'use client';

import { AppLayout } from '@/components/app-sidebar';
import { IntruderPage } from '@/components/intruder';

export default function IntruderPageRoute() {
  return (
    <AppLayout>
      <IntruderPage />
    </AppLayout>
  );
}