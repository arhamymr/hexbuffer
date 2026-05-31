import { InfoIcon, SettingsIcon, ShieldCheckIcon } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type { SettingsPageState } from '../hooks/use-settings-page';
import { AboutSettingsTab } from './about-settings-tab';
import { AiSettingsTab } from './ai-settings-tab';
import { CaCertificateSettingsTab } from './ca-certificate-settings-tab';
import { GeneralSettingsTab } from './general-settings-tab';

interface SettingsLayoutProps {
  settings: SettingsPageState;
}

export function SettingsLayout({ settings }: SettingsLayoutProps) {
  return (
    <div className="h-full flex flex-col overflow-hidden">
      <div className="px-6 py-4 border-b">
        <h1 className="text-3xl font-normal">Settings</h1>
        <p className="text-muted-foreground mt-1">Configure your application settings</p>
      </div>

      <Tabs defaultValue="settings" className="flex-1 flex flex-col overflow-hidden">
        <div className="px-6 pt-4">
          <TabsList>
            <TabsTrigger value="settings">
              <SettingsIcon className="size-4" />
              Settings
            </TabsTrigger>
            <TabsTrigger value="ca-cert">
              <ShieldCheckIcon className="size-4" />
              CA Certificate
            </TabsTrigger>
            {/* <TabsTrigger value="ai">
              <BotIcon className="size-4" />
              AI
            </TabsTrigger> */}
            <TabsTrigger value="about">
              <InfoIcon className="size-4" />
              About
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="settings" className="flex-1 overflow-auto px-6 py-4 space-y-4">
          <GeneralSettingsTab settings={settings} />
        </TabsContent>

        <TabsContent value="about" className="flex-1 overflow-auto px-6 py-4 space-y-4">
          <AboutSettingsTab />
        </TabsContent>

        {/* <TabsContent value="ai" className="flex-1 overflow-auto px-6 py-4 space-y-4">
          <AiSettingsTab settings={settings} />
        </TabsContent> */}

        <TabsContent value="ca-cert" className="flex-1 overflow-auto px-6 py-4 space-y-4">
          <CaCertificateSettingsTab settings={settings} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
