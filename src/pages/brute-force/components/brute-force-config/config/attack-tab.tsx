'use client';

import { useBruteForceStore } from '@/stores/bruto-force';
import { NumberInputField } from './number-input-field';

export function AttackTab() {
  const config = useBruteForceStore((s) => {
    const tab = s.tabs.find((t) => t.id === s.activeTabId);
    return tab?.config;
  });
  const updateConfig = useBruteForceStore((s) => s.updateConfig);

  if (!config) return null;

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <NumberInputField
          label="Delay (ms)"
          value={config.delay_ms}
          onChange={(value) => updateConfig({ delay_ms: parseInt(value, 10) || 0 })}
        />
      </div>
    </div>
  );
}
