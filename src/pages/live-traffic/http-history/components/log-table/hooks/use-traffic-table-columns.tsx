import { useMemo } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import {
  WarningCircleIcon,
  PushPinSimpleIcon,
  LockIcon,
  LockOpenIcon,
} from "@phosphor-icons/react";
import { HighlightedText } from "@/components/highlighted-text";
import { StatusBadge, MethodBadge } from "@/components/status-badge";
import type { ApiCall } from "@/types";
import type { GroupDefinition } from "@/stores/history";
import { formatTimestamp, formatBytes } from "../utils";
import { ColoredUrl } from "../colored-url";
import { BrowserIcon } from "../browser-icon";
import { CallActionCell } from "../call-action-cell";

interface UseTrafficTableColumnsOptions {
  pinnedSet: Set<string>;
  getGroupsForRequest: (id: string) => GroupDefinition[];
  getHighlightColor: (host: string, path: string) => string | null;
  highlightedHosts: Record<string, string>;
  handleNewGroup: (call: ApiCall) => void;
}

export function useTrafficTableColumns({
  pinnedSet,
  getGroupsForRequest,
  getHighlightColor,
  highlightedHosts,
  handleNewGroup,
}: UseTrafficTableColumnsOptions) {
  return useMemo<ColumnDef<ApiCall>[]>(
    () => [
      {
        accessorKey: "timestamp",
        header: "Time",
        size: 85,
        cell: ({ row }) => (
          <span className="text-xs font-mono text-muted-foreground">
            {formatTimestamp(row.original.timestamp)}
          </span>
        ),
      },
      {
        accessorKey: "method",
        header: "Method",
        size: 110,
        cell: ({ row }) => (
          <div className="flex items-center gap-1.5 shrink-0">
            <MethodBadge method={row.original.method} />
            <StatusBadge status={row.original.response_status} />
            {row.original.content_decoded && (
              <span title="Request body was decoded from gzip/br/deflate">
                <WarningCircleIcon className="h-3 w-3 text-yellow-500 shrink-0" />
              </span>
            )}
          </div>
        ),
      },
      {
        accessorKey: "host",
        header: "URL",
        size: 400,
        cell: ({ row, table }) => {
          const requestGroups = getGroupsForRequest(row.original.id);
          const displayUrl = (() => {
            try {
              const u = new URL(row.original.url);
              if (
                (u.protocol === "https:" && u.port === "443") ||
                (u.protocol === "http:" && u.port === "80")
              ) {
                u.port = "";
              }
              return u.toString();
            } catch {
              return row.original.url;
            }
          })();
          const isSecured = row.original.url.startsWith("https://");

          return (
            <div className="flex items-center gap-1.5 min-w-0 overflow-hidden">
              {pinnedSet.has(row.original.id) && (
                <PushPinSimpleIcon className="size-3 text-amber-500 shrink-0" />
              )}
              {requestGroups.map((g: GroupDefinition) => (
                <span
                  key={g.id}
                  className="size-1.5 rounded-full shrink-0"
                  style={{ backgroundColor: g.color }}
                  title={g.name}
                />
              ))}
              {isSecured ? (
                <LockIcon
                  className="size-3 text-emerald-500 shrink-0"
                  title="HTTPS (Secured)"
                />
              ) : (
                <LockOpenIcon
                  className="size-3 text-amber-500 shrink-0"
                  title="HTTP (Not Secured)"
                />
              )}
              <BrowserIcon userAgent={row.original.user_agent} />
              <span
                className="truncate min-w-0"
                style={{
                  color:
                    getHighlightColor(row.original.host, row.original.path) ||
                    undefined,
                }}
              >
                <ColoredUrl
                  url={displayUrl}
                  searchQuery={
                    (table.options.meta as { searchQuery?: string } | undefined)
                      ?.searchQuery ?? ""
                  }
                />
              </span>
            </div>
          );
        },
      },
      {
        accessorKey: "referrer",
        header: "Referrer",
        size: 160,
        cell: ({ row, table }) => {
          const displayReferrer =
            row.original.referrer?.replace(/^https?:\/\//i, "") || "-";
          return (
            <span className="truncate block min-w-0">
              <HighlightedText
                text={displayReferrer}
                query={
                  (table.options.meta as { searchQuery?: string } | undefined)
                    ?.searchQuery ?? ""
                }
              />
            </span>
          );
        },
      },
      {
        accessorKey: "response_body_size",
        header: "Size",
        size: 75,
        cell: ({ row }) => (
          <span className="text-xs text-muted-foreground text-right block truncate">
            {formatBytes(row.original.response_body_size)}
          </span>
        ),
      },
      {
        accessorKey: "request_body_size",
        header: "Length",
        size: 75,
        cell: ({ row }) => (
          <span className="text-xs text-muted-foreground text-right block truncate">
            {formatBytes(row.original.request_body_size)}
          </span>
        ),
      },
      {
        accessorKey: "response_content_type",
        header: "MIME Type",
        size: 140,
        cell: ({ row, table }) => (
          <span className="text-xs text-muted-foreground truncate block min-w-0">
            <HighlightedText
              text={row.original.response_content_type || "-"}
              query={
                (table.options.meta as { searchQuery?: string } | undefined)
                  ?.searchQuery ?? ""
              }
            />
          </span>
        ),
      },
      {
        id: "action",
        header: "",
        size: 36,
        cell: ({ row }) => (
          <CallActionCell call={row.original} onNewGroup={handleNewGroup} />
        ),
      },
    ],
    [
      pinnedSet,
      getGroupsForRequest,
      handleNewGroup,
      highlightedHosts,
      getHighlightColor,
    ]
  );
}
