'use client';

import { useEffect, useRef } from 'react';
import { useAppStore } from '@/stores/appStore';
import { RepeaterPage } from '@/components/repeater';

export default function RepeaterPageRoute() {
  const pendingRepeaterRequest = useAppStore((s) => s.pendingRepeaterRequest);
  const setPendingRepeaterRequest = useAppStore((s) => s.setPendingRepeaterRequest);
  const hasInitialized = useRef(false);

  useEffect(() => {
    if (pendingRepeaterRequest && !hasInitialized.current) {
      hasInitialized.current = true;
      setPendingRepeaterRequest(null);
      window.location.reload();
    }
  }, [pendingRepeaterRequest, setPendingRepeaterRequest]);

  return <RepeaterPage initialRequest={pendingRepeaterRequest} />;
}