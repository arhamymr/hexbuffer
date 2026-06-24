import { useCallback, memo, useMemo } from 'react';
import {
  ContextMenu,
  ContextMenuTrigger,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuSub,
  ContextMenuSubTrigger,
  ContextMenuSubContent,
} from '@/components/ui/context-menu';
import { Copy, Plus, Trash2, Send, FilePlus2, Pin, PinOff } from 'lucide-react';
import type { ApiCall } from '@/types';
import { useLogEntryActions } from '@/pages/live-traffic/hooks/use-log-entry-actions';

interface LogEntryContextMenuProps {
  call: ApiCall;
  children: React.ReactNode;
  onDelete?: (id: string) => void;
  onOpenChange?: (open: boolean) => void;
  onNewGroup?: (call: ApiCall) => void;
}

export const LogEntryContextMenu = memo(function LogEntryContextMenu({
  call,
  children,
  onDelete,
  onOpenChange,
  onNewGroup,
}: LogEntryContextMenuProps) {
  const {
    pinned,
    groups,
    requestGroupIds,
    addRequestToGroup,
    removeRequestFromGroup,
    handleQuickAddToGroup,
    handleTogglePin,
    handleCopyCurlCommand,
    handleCopyUrl,
    handleAddToScope,
    handleOpenInInvoker,
    handleOpenInRepeater,
    handleSendToIntercept,
    handleOpenInBrowserAutomation,
    handleSaveToDocuments,
    handleDelete,
  } = useLogEntryActions(call, onDelete);

  return (
    <ContextMenu onOpenChange={onOpenChange}>
      <ContextMenuTrigger asChild>
        {children}
      </ContextMenuTrigger>
      <ContextMenuContent className="p-0.5">
        <ContextMenuItem onClick={handleCopyCurlCommand} className='text-xs py-1 px-1.5'>
          <Copy className="mr-1.5 size-3" /> Copy as curl command (bash)
        </ContextMenuItem>
        <ContextMenuItem onClick={handleCopyUrl} className='text-xs py-1 px-1.5'>
          <Copy className="mr-1.5 size-3" /> Copy URL
        </ContextMenuItem>
        <ContextMenuSeparator />
        <ContextMenuItem onClick={handleTogglePin} className='text-xs py-1 px-1.5'>
          {pinned
            ? <><PinOff className="mr-1.5 size-3" /> Unpin</>
            : <><Pin className="mr-1.5 size-3" /> Pin</>
          }
        </ContextMenuItem>
        <ContextMenuSeparator />
        {groups.length === 0 ? (
          <ContextMenuItem onClick={handleQuickAddToGroup} className='text-xs py-1 px-1.5'>
            <Plus className="mr-1.5 size-3" /> Add to Group
          </ContextMenuItem>
        ) : (
          <ContextMenuSub>
            <ContextMenuSubTrigger className='text-xs py-1 px-1.5'>
              <Plus className="mr-1.5 size-3" /> Add to Group
            </ContextMenuSubTrigger>
            <ContextMenuSubContent>
              {groups.map((g) => (
                <ContextMenuItem
                  key={g.id}
                  className='text-xs py-1 px-1.5'
                  onClick={() => addRequestToGroup(g.id, call)}
                >
                  <span className="mr-1.5 size-1.5 rounded-full" style={{ backgroundColor: g.color }} />
                  {g.name}
                  {requestGroupIds.includes(g.id) && <span className="ml-auto text-muted-foreground">✓</span>}
                </ContextMenuItem>
              ))}
              <ContextMenuSeparator />
              <ContextMenuItem className='text-xs py-1 px-1.5' onClick={() => onNewGroup?.(call)}>
                <Plus className="mr-1.5 size-3" /> New Group…
              </ContextMenuItem>
            </ContextMenuSubContent>
          </ContextMenuSub>
        )}
        {requestGroupIds.length > 0 && (
          <ContextMenuSub>
            <ContextMenuSubTrigger className='text-xs py-1 px-1.5'>
              Remove from Group
            </ContextMenuSubTrigger>
            <ContextMenuSubContent>
              {requestGroupIds.map((gid) => {
                const g = groups.find((gr) => gr.id === gid);
                if (!g) return null;
                return (
                  <ContextMenuItem
                    key={g.id}
                    className='text-xs py-1 px-1.5'
                    onClick={() => removeRequestFromGroup(g.id, call.id)}
                  >
                    <span className="mr-1.5 size-1.5 rounded-full" style={{ backgroundColor: g.color }} />
                    {g.name}
                  </ContextMenuItem>
                );
              })}
            </ContextMenuSubContent>
          </ContextMenuSub>
        )}
        <ContextMenuSeparator />
        <ContextMenuItem onClick={handleAddToScope} className='text-xs py-1 px-1.5'>
          <Plus className="mr-1.5 size-3" /> Add to Target
        </ContextMenuItem>
        <ContextMenuItem onClick={handleOpenInInvoker} className='text-xs py-1 px-1.5'>
          <Send className="mr-1.5 size-3" /> Send to Invoker
        </ContextMenuItem>
        <ContextMenuItem onClick={handleOpenInRepeater} className='text-xs py-1 px-1.5'>
          <Send className="mr-1.5 size-3" /> Send to Repeater
        </ContextMenuItem>
        <ContextMenuItem onClick={handleSendToIntercept} className='text-xs py-1 px-1.5'>
          <Send className="mr-1.5 size-3" /> Send to Intercept
        </ContextMenuItem>
        <ContextMenuItem onClick={handleOpenInBrowserAutomation} className='text-xs py-1 px-1.5'>
          <Send className="mr-1.5 size-3" /> Send to Automate Browser
        </ContextMenuItem>
        {/* <ContextMenuItem onClick={handleOpenInPromptInjection} className='text-xs'>
          <Bot className="mr-2 size-4" /> Open in Prompt Injection
        </ContextMenuItem> */}
        <ContextMenuItem onClick={handleSaveToDocuments} className='text-xs py-1 px-1.5'>
          <FilePlus2 className="mr-1.5 size-3" /> Save to Documents
        </ContextMenuItem>
        <ContextMenuSeparator />
        <ContextMenuItem onClick={handleDelete} variant="destructive" className='text-xs py-1 px-1.5'>
          <Trash2 className="mr-1.5 size-3" /> Delete
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
});
