"use client";

import { generateDummyTargets, generateDummyApiCalls, generateDummyFindings } from "@/lib/dummy-data";

const isDevMode = true;

const mockData = {
  targets: generateDummyTargets(),
  apiCalls: [] as ReturnType<typeof generateDummyApiCalls>,
  findings: [] as ReturnType<typeof generateDummyFindings>,
};

let apiCallsInitialized = false;

function getMockApiCalls() {
  if (!apiCallsInitialized) {
    mockData.apiCalls = generateDummyApiCalls(mockData.targets.map((t) => t.id), 30);
    apiCallsInitialized = true;
  }
  return mockData.apiCalls;
}

export async function mockInvoke<T>(cmd: string, args?: Record<string, unknown>): Promise<T> {
  if (!isDevMode) {
    throw new Error("mockInvoke should only be used in dev mode");
  }

  await new Promise((resolve) => setTimeout(resolve, 100));

  switch (cmd) {
    case "get_targets":
      return mockData.targets as T;

    case "get_findings": {
      const targetId = args?.targetId as string | null;
      let findings = generateDummyFindings(mockData.targets.map((t) => t.id));
      if (targetId) {
        findings = findings.filter((f) => f.target_id === targetId);
      }
      return findings as T;
    }

    case "get_api_calls": {
      const targetId = args?.targetId as string | null;
      let calls = getMockApiCalls();
      if (targetId) {
        calls = calls.filter((c) => c.target_id === targetId);
      }
      return calls as T;
    }

    case "add_target":
      return { success: true } as T;

    case "delete_target":
      return { success: true } as T;

    case "update_target":
      return { success: true } as T;

    case "send_http_request": {
      const request = args?.request as { method: string; url: string; headers: Record<string, string>; body: string };
      const mockResponse = {
        status: 200,
        status_text: "OK",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ success: true, message: "Mock response", data: { method: request?.method, url: request?.url } }),
        time_ms: Math.floor(Math.random() * 500) + 50,
        final_url: request?.url || "",
      };
      return mockResponse as T;
    }

    case "start_brute_force": {
      return { success: true, job_id: "mock-job-123" } as T;
    }

    case "stop_brute_force": {
      return { success: true } as T;
    }

    case "get_brute_force_results": {
      return [] as T;
    }

    case "add_finding":
      return { success: true, id: "mock-finding-" + Date.now() } as T;

    case "delete_finding":
      return { success: true } as T;

    case "update_finding":
      return { success: true } as T;

    case "add_target_scope":
      return { success: true } as T;

    default:
      console.warn(`mockInvoke: Unknown command: ${cmd}`);
      return {} as T;
  }
}

export function isMockMode(): boolean {
  return isDevMode;
}
