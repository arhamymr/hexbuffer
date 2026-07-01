import * as React from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { ColorizedUrlInput } from '@/components/ui/select-env-input';
import { METHOD_COLORS } from '@/lib/method-colors';
import { useCollectionsStore } from '@/stores/collections';
import { GearSixIcon, PaperPlaneTiltIcon, FloppyDiskIcon } from '@phosphor-icons/react';
import { sendCraftRequest, saveActiveEndpoint } from '@/triggers/repeater/craft';
import { ContextsDialog } from '../ContextsDialog';

interface ForgeRequestBarProps {
  method: string;
  url: string;
  activeEndpoint: { id: string; name: string } | null;
  onMethodChange: (method: string) => void;
  onUrlChange: (url: string) => void;
}

const METHODS = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS', 'HEAD'];

export function ForgeRequestBar({
  method,
  url,
  activeEndpoint,
  onMethodChange,
  onUrlChange,
}: ForgeRequestBarProps) {
  const activeContextId = useCollectionsStore((s) => s.activeContextId);
  const contexts = useCollectionsStore((s) => s.contexts);
  const [contextsDialogOpen, setContextsDialogOpen] = React.useState(false);

  return (
    <>
      <div className="flex space-x-2 shrink-0 w-full min-w-0 items-start">
        <Select value={method} onValueChange={onMethodChange}>
          <SelectTrigger className="w-28 font-semibold h-8">
            {method ? (
              <span className={METHOD_COLORS[method]}>{method}</span>
            ) : (
              <SelectValue />
            )}
          </SelectTrigger>
          <SelectContent>
            {METHODS.map((m) => (
              <SelectItem key={m} value={m} className={cn('font-semibold', METHOD_COLORS[m])}>
                {m}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <ColorizedUrlInput
          placeholder="Enter request URL (e.g. https://api.example.com/v1/users)"
          className="flex-1 w-0 text-sm"
          value={url}
          onChange={onUrlChange}
        />


        <div className="flex items-center space-x-1.5 shrink-0">
          <Button
            size="sm"
            className="h-7 text-xs font-semibold gap-2"
            onClick={() => { void sendCraftRequest(); }}
          >
            <PaperPlaneTiltIcon className="size-3.5" /> Send
          </Button>
          {activeEndpoint && (
            <Button
              size="sm"
              variant="outline"
              className="h-7 text-xs font-semibold gap-2"
              onClick={() => { void saveActiveEndpoint(); }}
            >
              <FloppyDiskIcon className="size-3.5" />
            </Button>
          )}
        </div>

        <div className="flex items-center space-x-1.5 shrink-0">
          <Select
            value={activeContextId || 'no-context'}
            onValueChange={(val) =>
              useCollectionsStore.getState().setActiveContextId(val === 'no-context' ? null : val)
            }
          >
            <SelectTrigger className="h-8 w-40 font-medium text-xs">
              <SelectValue placeholder="No Environment" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="no-context">No Environment</SelectItem>
              {contexts.map((ctx) => (
                <SelectItem key={ctx.id} value={ctx.id}>
                  {ctx.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-muted-foreground hover:text-foreground shrink-0 transition-transform active:scale-95"
            onClick={() => setContextsDialogOpen(true)}
            title="Manage Environments"
          >
            <GearSixIcon className="h-4 w-4" />
          </Button>
        </div>

      </div>

      <ContextsDialog open={contextsDialogOpen} onOpenChange={setContextsDialogOpen} />
    </>
  );
}
