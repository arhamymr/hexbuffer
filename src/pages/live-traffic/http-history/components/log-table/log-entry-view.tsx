import { useState, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  FileTextIcon,
  TableIcon,
  DotsThreeVerticalIcon,
  CrosshairIcon,
  XIcon,
} from "@phosphor-icons/react";
import { toast } from "sonner";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Empty, EmptyTitle, EmptyDescription } from "@/components/ui/empty";
import { Label } from "@/components/ui/label";
import { TextEditor } from "@/components/ui/text-editor";
import {
  buildRawHttpRequest,
  buildRawHttpResponse,
  formatJsonBody,
} from "@/lib/http-message";
import { useHistoryDetail } from "../../hooks/use-history-detail";
import { useHttpHistoryQueryStore } from "@/stores/history";
import {
  InspectorSection,
  buildHeadersList,
  buildParamsList,
} from "@/pages/live-traffic/components/inspector";
import { parseCookieHeader } from "./cookie-display";
import { useInvokerStore } from "@/stores/invoker";
import {
  createDefaultAttackConfig,
  findRequestPayloadPositions,
} from "@/pages/invoker/types";
import { sendToCollection } from "@/triggers/repeater/send-to-collection";
import { CollectionPickerSubmenu } from "@/triggers/repeater/collection-picker-submenu";

type DetailViewMode = "text" | "table";

function isJsonContent(
  headers: Record<string, string>,
  body: string | null,
): boolean {
  if (!body) {
    return false;
  }

  const contentType =
    Object.entries(headers)
      .find(([name]) => name.toLowerCase() === "content-type")?.[1]
      .toLowerCase() ?? "";

  return (
    contentType.includes("json") ||
    body.trim().startsWith("{") ||
    body.trim().startsWith("[")
  );
}

export function LogEntryBurpView() {
  const { selectedCallId, call, isLoading, loadError } = useHistoryDetail();
  const setSelectedCallId = useHttpHistoryQueryStore(
    (state) => state.setSelectedCallId,
  );
  const [viewMode, setViewMode] = useState<DetailViewMode>("text");
  const navigate = useNavigate();


  const handleSendToCollection = useCallback(
    (stashId: string) => {
      if (!call) return;
      void sendToCollection({
        stashId,
        stashName: "",
        endpointData: {
          name: `${call.method} ${call.path || call.url}`,
          method: call.method,
          url: call.url,
          headers: call.headers,
          body: call.request_body || null,
        },
      });
    },
    [call],
  );

  const handleSendToInvoker = useCallback(() => {
    if (!call) return;
    const baseRequest = {
      method: call.method,
      url: call.url,
      headers: call.headers,
      body: call.request_body ?? "",
      follow_redirects: true,
      max_hops: 10,
    };
    const config = {
      ...createDefaultAttackConfig(),
      name: `${call.method} ${call.path || call.url}`,
      base_request: baseRequest,
      positions: findRequestPayloadPositions(baseRequest),
    };
    useInvokerStore.getState().addAttackTab(config);
    navigate("/invoker");
    toast.success("Sent to Invoker");
  }, [call, navigate]);

  const rawRequest = useMemo(
    () =>
      call
        ? buildRawHttpRequest({
            method: call.method,
            url: call.url,
            headers: call.headers,
            body: isJsonContent(call.headers, call.request_body)
              ? formatJsonBody(call.request_body ?? "")
              : (call.request_body ?? ""),
          })
        : "",
    [call],
  );
  const rawResponse = useMemo(
    () =>
      call?.response_status
        ? buildRawHttpResponse(
            {
              status: call.response_status,
              status_text: call.response_status_text ?? "",
              headers: call.response_headers,
              body: call.response_body ?? "",
            },
            { prettyJsonBody: true },
          )
        : "",
    [call],
  );

  const requestHeaders = useMemo(
    () => buildHeadersList(call?.headers ?? {}),
    [call?.headers],
  );
  const requestCookies = useMemo(
    () => parseCookieHeader(call?.headers["cookie"]),
    [call?.headers],
  );
  const requestParams = useMemo(
    () => buildParamsList(call?.query_params ?? {}),
    [call?.query_params],
  );
  const responseHeaders = useMemo(
    () => buildHeadersList(call?.response_headers ?? {}),
    [call?.response_headers],
  );
  const responseCookies = useMemo(
    () => parseCookieHeader(call?.response_headers["set-cookie"]),
    [call?.response_headers],
  );

  if (!selectedCallId) {
    return (
      <Empty>
        <EmptyTitle>No request selected</EmptyTitle>
        <EmptyDescription>
          Select a request from the table to view its details.
        </EmptyDescription>
      </Empty>
    );
  }

  if (isLoading) {
    return (
      <Empty>
        <EmptyTitle>Loading...</EmptyTitle>
      </Empty>
    );
  }

  if (loadError) {
    return (
      <div className="p-4">
        <Alert variant="destructive">
          <AlertTitle>Failed to load request details</AlertTitle>
          <AlertDescription>{loadError}</AlertDescription>
        </Alert>
      </div>
    );
  }

  if (!call) {
    return (
      <Empty>
        <EmptyTitle>Request not found</EmptyTitle>
        <EmptyDescription>
          The selected request could not be found.
        </EmptyDescription>
      </Empty>
    );
  }

  return (
    <div className="flex h-full min-h-0 bg-muted">
      <div className="flex-1 flex flex-col h-full bg-background border-r">
        {viewMode === "text" ? (
          <div className="flex h-full min-h-0 flex-col p-2 mt-3">
            <Label className="mb-1 block text-xs text-muted-foreground">
              Raw Request
            </Label>
            <div className="min-h-0 flex-1 overflow-hidden rounded-md border">
              <TextEditor value={rawRequest} />
            </div>
          </div>
        ) : (
          <div className="min-h-0 flex-1 overflow-auto p-2">
            <InspectorSection
              title="Headers"
              items={requestHeaders}
              defaultView="table"
            />
            <InspectorSection
              title="Cookies"
              items={requestCookies.map((cookie) => ({
                name: cookie.name,
                value: cookie.value,
              }))}
              defaultView="table"
            />
            {requestParams.length > 0 && (
              <InspectorSection
                title="Params"
                items={requestParams}
                defaultView="table"
              />
            )}
          </div>
        )}
      </div>
      <div className="flex-1 flex flex-col h-full bg-background">
        <div className="flex w-full justify-end pr-2 pt-2">
          <div className="flex gap-2 items-center">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon">
                  <DotsThreeVerticalIcon className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  onClick={() =>
                    setViewMode(viewMode === "table" ? "text" : "table")
                  }
                  className="text-xs"
                >
                  {viewMode === "table" ? (
                    <>
                      <FileTextIcon className="mr-2 h-4 w-4" /> Toggle Text
                    </>
                  ) : (
                    <>
                      <TableIcon className="mr-2 h-4 w-4" /> Toggle Table
                    </>
                  )}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <CollectionPickerSubmenu
                  variant="dropdown"
                  onSelect={handleSendToCollection}
                />
                <DropdownMenuItem
                  onClick={handleSendToInvoker}
                  className="text-xs"
                >
                  <CrosshairIcon className="mr-2 h-4 w-4" /> Send to Invoker
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSelectedCallId(null)}
            >
              <XIcon className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>

        {viewMode === "text" ? (
          <div className="flex h-full min-h-0 flex-col p-2 -mt-1">
            <div className="min-h-0 flex-1 overflow-hidden rounded-md border">
              <TextEditor value={rawResponse} />
            </div>
          </div>
        ) : (
          <div className="min-h-0 flex-1 overflow-auto p-2">
            <InspectorSection
              title="Headers"
              items={responseHeaders}
              defaultOpen={false}
              defaultView="table"
            />
            {responseCookies.length > 0 && (
              <InspectorSection
                title="Cookies"
                items={responseCookies.map((cookie) => ({
                  name: cookie.name,
                  value: cookie.value,
                }))}
                defaultOpen={false}
                defaultView="table"
              />
            )}
            <InspectorSection
              title="Body"
              items={[
                {
                  name: "Response Body",
                  value: isJsonContent(
                    call.response_headers,
                    call.response_body,
                  )
                    ? formatJsonBody(call.response_body ?? "")
                    : (call.response_body ?? ""),
                },
              ]}
              defaultView="text"
            />
          </div>
        )}
      </div>
    </div>
  );
}
