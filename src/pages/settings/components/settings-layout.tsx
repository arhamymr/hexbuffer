import * as React from 'react';
import { cn } from '@/lib/utils';
import type { SettingsPageState } from '../hooks/use-settings-page';
import { SettingsSidebar, type SettingsCategory } from './settings-sidebar';
import { GeneralSettingsTab } from './general-settings-tab';
import { CaCertificateSettingsTab } from './ca-certificate-settings-tab';
import { AiSettingsTab } from './ai-settings-tab';
import { AutomationSettingsTab } from './automation-settings-tab';
import { AboutSettingsTab } from './about-settings-tab';

interface SettingsLayoutProps {
  settings: SettingsPageState;
}

interface CategoryContentProps {
  settings: SettingsPageState;
  active: SettingsCategory;
}

const CATEGORY_LABELS: Record<SettingsCategory, string> = {
  general: 'General',
  'ca-cert': 'CA Certificate',
  ai: 'AI',
  automation: 'Automation',
  about: 'About',
};

function CategoryContent({ settings, active }: CategoryContentProps) {
  const title = CATEGORY_LABELS[active];

  return (
    <div className="flex-1 overflow-auto">
      <div className="mx-auto w-full max-w-2xl px-8 py-8">
        <div className="mb-6">
          <h1 className="text-xl font-semibold tracking-tight">{title}</h1>
        </div>

        <div className="space-y-6">
          {active === 'general' && <GeneralSettingsTab settings={settings} />}
          {active === 'ca-cert' && <CaCertificateSettingsTab settings={settings} />}
          {active === 'ai' && <AiSettingsTab settings={settings} />}
          {active === 'automation' && <AutomationSettingsTab />}
          {active === 'about' && <AboutSettingsTab />}
        </div>
      </div>
    </div>
  );
}

export function SettingsLayout({ settings }: SettingsLayoutProps) {
  const [active, setActive] = React.useState<SettingsCategory>('general');
  const [contentKey, setContentKey] = React.useState(0);

  const handleSelect = React.useCallback((category: SettingsCategory) => {
    setActive(category);
    setContentKey((k) => k + 1);
  }, []);

  return (
    <div className="flex h-full overflow-hidden">
      <SettingsSidebar active={active} onSelect={handleSelect} />

      <div
        key={contentKey}
        className={cn(
          'flex flex-1 flex-col overflow-hidden animate-in fade-in slide-in-from-right-4 duration-200',
        )}
      >
        <CategoryContent settings={settings} active={active} />
      </div>
    </div>
  );
}
