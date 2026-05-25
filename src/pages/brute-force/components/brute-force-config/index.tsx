'use client';

import * as React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useBruteForceStore } from '@/stores/bruto-force';
import { type AttackConfig } from '../../types';
import {
  AttackTab,
  RequestTab,
  PayloadsTab,
  ProcessingTab,
  OptionsTab,
} from './tabs';
import { buildRawRequest, findRequestPayloadPositions, parseRawRequest } from '../../types';

export function BruteForceConfigDialog() {
  const config = useBruteForceStore((s) => {
    const tab = s.tabs.find((t) => t.id === s.activeTabId);
    return tab?.config ?? ({} as AttackConfig);
  });
  const updateConfig = useBruteForceStore((s) => s.updateConfig);
  const updateAttackMode = useBruteForceStore((s) => s.updateAttackMode);
  const updatePayloadType = useBruteForceStore((s) => s.updatePayloadType);
  const updatePayloadValues = useBruteForceStore((s) => s.updatePayloadValues);
  const updateNumberRange = useBruteForceStore((s) => s.updateNumberRange);
  const addProcessingStep = useBruteForceStore((s) => s.addProcessingStep);
  const removeProcessingStep = useBruteForceStore((s) => s.removeProcessingStep);
  const updateGrepMatch = useBruteForceStore((s) => s.updateGrepMatch);
  const updateGrepExtract = useBruteForceStore((s) => s.updateGrepExtract);
  const updateSessionHandling = useBruteForceStore((s) => s.updateSessionHandling);
  const setPayloadDialogOpen = useBruteForceStore((s) => s.setPayloadDialogOpen);

  const [rawRequestDraft, setRawRequestDraft] = React.useState(() =>
    buildRawRequest(config.base_request)
  );
  const rawRequestEditorRef = React.useRef<any>(null);

  const updateBaseRequest = React.useCallback(
    (updates: Partial<AttackConfig['base_request']>) => {
      const baseRequest = { ...config.base_request, ...updates };
      updateConfig({
        base_request: baseRequest,
        positions: findRequestPayloadPositions(baseRequest),
      });
    },
    [config.base_request, updateConfig]
  );

  const updateRawRequest = React.useCallback(
    (value: string) => {
      setRawRequestDraft(value);
      const parsed = parseRawRequest(value);
      if (parsed) {
        updateConfig({
          base_request: {
            ...config.base_request,
            ...parsed,
          },
          positions: findRequestPayloadPositions(parsed),
        });
      }
    },
    [config.base_request, updateConfig]
  );

  return (
    <div className="flex h-full min-h-0 flex-col rounded-lg border bg-background">
      <div className="min-h-0 overflow-auto p-3">
        <Tabs defaultValue="attack" className="w-full">
          <TabsList className="grid grid-cols-2 mb-2">
            <TabsTrigger value="attack">Config</TabsTrigger>
            <TabsTrigger value="request">Request</TabsTrigger>
          </TabsList>

          <TabsContent value="request">
            <RequestTab
              config={config}
              updateBaseRequest={updateBaseRequest}
              updateRawRequest={updateRawRequest}
              rawRequestDraft={rawRequestDraft}
              setRawRequestDraft={setRawRequestDraft}
              rawRequestEditorRef={rawRequestEditorRef}
            />
          </TabsContent>

          <TabsContent value="attack">
            <div className="space-y-6">
              <AttackTab
                config={config}
                updateConfig={updateConfig}
                updateAttackMode={updateAttackMode}
              />
              <PayloadsTab
                config={config}
                updatePayloadType={updatePayloadType}
                updatePayloadValues={updatePayloadValues}
                updateNumberRange={updateNumberRange}
                setPayloadDialogOpen={setPayloadDialogOpen}
              />
              <ProcessingTab
                config={config}
                addProcessingStep={addProcessingStep}
                removeProcessingStep={removeProcessingStep}
              />
              <OptionsTab
                config={config}
                updateGrepMatch={updateGrepMatch}
                updateGrepExtract={updateGrepExtract}
                updateSessionHandling={updateSessionHandling}
              />
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
