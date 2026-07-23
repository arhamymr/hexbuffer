import { memo } from "react";
import {
  DotsThreeVerticalIcon,
  CopyIcon,
  PlusIcon,
  TrashIcon,
  FilePlusIcon,
  PushPinSimpleIcon,
  PushPinSimpleSlashIcon,
  ProhibitIcon,
  PaletteIcon,
  PaperPlaneTiltIcon,
} from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
} from "@/components/ui/dropdown-menu";
import type { ApiCall } from "@/types";
import { useLogEntryActions } from "./hooks/use-log-entry-actions";
import {
  useHighlightStore,
  HIGHLIGHT_COLORS,
  HIGHLIGHT_COLOR_LABELS,
} from "@/stores/history";
import { CollectionPickerSubmenu } from "@/triggers/repeater/collection-picker-submenu";

export interface CallActionCellProps {
  call: ApiCall;
  onNewGroup?: (call: ApiCall) => void;
}

export const CallActionCell = memo(function CallActionCell({
  call,
  onNewGroup,
}: CallActionCellProps) {
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
    handleSendToCollection,
    handleSendToIntercept,
    handleOpenInBrowserAutomation,
    handleSaveToDocuments,
    handleDelete,
    handleBlacklistHost,
    handleBlacklistHostAndPath,
    handleHighlightHost,
  } = useLogEntryActions(call);

  const highlightColor = useHighlightStore((s) => s.getHighlightColor(call.host, call.path));
  const removeHighlight = useHighlightStore((s) => s.removeHighlight);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 p-0"
          onClick={(e) => e.stopPropagation()}
        >
          <DotsThreeVerticalIcon className="size-3.5 text-muted-foreground" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={handleCopyCurlCommand} className="text-xs">
          <CopyIcon className="mr-2 size-3" /> Copy as curl command (bash)
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleCopyUrl} className="text-xs">
          <CopyIcon className="mr-2 size-3" /> Copy URL
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleTogglePin} className="text-xs">
          {pinned ? (
            <>
              <PushPinSimpleSlashIcon className="mr-2 size-3" /> Unpin
            </>
          ) : (
            <>
              <PushPinSimpleIcon className="mr-2 size-3" /> Pin
            </>
          )}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        {groups.length === 0 ? (
          <DropdownMenuItem onClick={handleQuickAddToGroup} className="text-xs">
            <PlusIcon className="mr-2 size-3" /> Add to Group
          </DropdownMenuItem>
        ) : (
          <DropdownMenuSub>
            <DropdownMenuSubTrigger className="text-xs">
              <PlusIcon className="mr-2 size-3" /> Add to Group
            </DropdownMenuSubTrigger>
            <DropdownMenuSubContent>
              {groups.map((g) => (
                <DropdownMenuItem
                  key={g.id}
                  className="text-xs"
                  onClick={() => addRequestToGroup(g.id, call)}
                >
                  <span className="mr-2 size-1.5 rounded-full" style={{ backgroundColor: g.color }} />
                  {g.name}
                  {requestGroupIds.includes(g.id) && <span className="ml-auto text-muted-foreground">✓</span>}
                </DropdownMenuItem>
              ))}
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-xs" onClick={() => onNewGroup?.(call)}>
                <PlusIcon className="mr-2 size-3" /> New Group…
              </DropdownMenuItem>
            </DropdownMenuSubContent>
          </DropdownMenuSub>
        )}
        {requestGroupIds.length > 0 && (
          <DropdownMenuSub>
            <DropdownMenuSubTrigger className="text-xs">
              Remove from Group
            </DropdownMenuSubTrigger>
            <DropdownMenuSubContent>
              {requestGroupIds.map((gid) => {
                const g = groups.find((gr) => gr.id === gid);
                if (!g) return null;
                return (
                  <DropdownMenuItem
                    key={g.id}
                    className="text-xs"
                    onClick={() => removeRequestFromGroup(g.id, call.id)}
                  >
                    <span className="mr-2 size-1.5 rounded-full" style={{ backgroundColor: g.color }} />
                    {g.name}
                  </DropdownMenuItem>
                );
              })}
            </DropdownMenuSubContent>
          </DropdownMenuSub>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleAddToScope} className="text-xs">
          <PlusIcon className="mr-2 size-3" /> Add to Target
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleOpenInInvoker} className="text-xs">
          <PaperPlaneTiltIcon className="mr-2 size-3" /> Send to Invoker
        </DropdownMenuItem>
        <CollectionPickerSubmenu
          variant="dropdown"
          onSelect={(stashId) => {
            void handleSendToCollection(stashId);
          }}
        />
        <DropdownMenuItem onClick={handleSendToIntercept} className="text-xs">
          <PaperPlaneTiltIcon className="mr-2 size-3" /> Send to Intercept
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleOpenInBrowserAutomation} className="text-xs">
          <PaperPlaneTiltIcon className="mr-2 size-3" /> Send to Automate Browser
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleSaveToDocuments} className="text-xs">
          <FilePlusIcon className="mr-2 size-4" /> Save to Documents
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuSub>
          <DropdownMenuSubTrigger className="text-xs">
            <PaletteIcon className="mr-2 size-3" /> Highlight
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent>
            {HIGHLIGHT_COLORS.map((color) => (
              <DropdownMenuItem
                key={color}
                className="text-xs"
                onClick={() => handleHighlightHost(color)}
              >
                <span className="mr-2 size-2 rounded-full" style={{ backgroundColor: color }} />
                {HIGHLIGHT_COLOR_LABELS[color] || color}
                {highlightColor === color && <span className="ml-auto text-muted-foreground">✓</span>}
              </DropdownMenuItem>
            ))}
            {highlightColor && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="text-xs"
                  onClick={() => removeHighlight(call.host, call.path)}
                >
                  Remove Highlight
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuSubContent>
        </DropdownMenuSub>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleBlacklistHost} className="text-xs">
          <ProhibitIcon className="mr-2 size-3" /> Blacklist Host
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleBlacklistHostAndPath} className="text-xs">
          <ProhibitIcon className="mr-2 size-3" /> Blacklist Host + Path
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleDelete} variant="destructive" className="text-xs">
          <TrashIcon className="mr-2 size-3" /> Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
});
