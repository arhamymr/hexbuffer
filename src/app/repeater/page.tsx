'use client';

import { useEffect, useRef, useState } from 'react';
import { useAppStore } from '@/stores/appStore';
import { RepeaterPage } from '@/components/repeater';
import type { HttpRequestTemplate } from '@/components/repeater/types';

const REPEATER_REQUEST_KEY = 'apprecon_pending_repeater_request';

export default function RepeaterPageRoute() {
  const pendingRepeaterRequest = useAppStore((s) => s.pendingRepeaterRequest);
  const setPendingRepeaterRequest = useAppStore((s) => s.setPendingRepeaterRequest);
  const hasInitialized = useRef(false);

  useEffect(() => {
    if (pendingRepeaterRequest && !hasInitialized.current) {
      hasInitialized.current = true;
      sessionStorage.setItem(REPEATER_REQUEST_KEY, JSON.stringify(pendingRepeaterRequest));
      setPendingRepeaterRequest(null);
      window.location.reload();
    }
  }, [pendingRepeaterRequest, setPendingRepeaterRequest]);

  const [initialRequest, setInitialRequest] = useState<HttpRequestTemplate | null>(null);

  useEffect(() => {
    const stored = sessionStorage.getItem(REPEATER_REQUEST_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored) as HttpRequestTemplate;
        setInitialRequest(parsed);
        sessionStorage.removeItem(REPEATER_REQUEST_KEY);
      } catch (e) {
        sessionStorage.removeItem(REPEATER_REQUEST_KEY);
      }
    }
  }, []);

  return <RepeaterPage initialRequest={initialRequest} />;
}