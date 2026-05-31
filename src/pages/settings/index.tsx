'use client';

import { SettingsLayout } from './components/settings-layout';
import { useSettingsPage } from './hooks/use-settings-page';

export function Settings() {
  const settings = useSettingsPage();

  return <SettingsLayout settings={settings} />;
}
