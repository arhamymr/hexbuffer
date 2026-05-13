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
      const url = request?.url || '';
      const method = request?.method || 'GET';
      const delay = Math.floor(Math.random() * 300) + 100;

      await new Promise((resolve) => setTimeout(resolve, delay / 2));

      const isLocalhost = url.includes('localhost') || url.includes('127.0.0.1');

      let status = 200;
      let statusText = 'OK';
      let responseBody: Record<string, unknown> = {};

      if (method === 'GET') {
        if (url.includes('/users') || url.includes('/api/users')) {
          responseBody = {
            success: true,
            data: [
              { id: 1, name: 'John Doe', email: 'john@example.com' },
              { id: 2, name: 'Jane Smith', email: 'jane@example.com' },
            ],
            total: 2,
          };
        } else if (url.includes('/posts') || url.includes('/api/posts')) {
          responseBody = {
            success: true,
            data: [
              { id: 1, title: 'Hello World', author: 'John' },
              { id: 2, title: 'API Design Tips', author: 'Jane' },
            ],
            total: 2,
          };
        } else if (url.includes('/error') || url.includes('/fail')) {
          status = 500;
          statusText = 'Internal Server Error';
          responseBody = { success: false, error: 'Something went wrong' };
        } else if (url.includes('/not-found') || url.includes('/404')) {
          status = 404;
          statusText = 'Not Found';
          responseBody = { success: false, error: 'Resource not found' };
        } else {
          responseBody = {
            success: true,
            message: 'Mock GET response',
            method,
            url,
            timestamp: new Date().toISOString(),
          };
        }
      } else if (method === 'POST') {
        if (isLocalhost) {
          status = 201;
          statusText = 'Created';
          responseBody = {
            success: true,
            message: 'Resource created',
            id: Math.floor(Math.random() * 1000),
            created: true,
          };
        } else {
          status = 201;
          statusText = 'Created';
          responseBody = {
            success: true,
            message: 'POST request received',
            data: request.body ? JSON.parse(request.body) : null,
            timestamp: new Date().toISOString(),
          };
        }
      } else if (method === 'PUT') {
        status = 200;
        statusText = 'OK';
        responseBody = {
          success: true,
          message: 'Resource updated',
          data: request.body ? JSON.parse(request.body) : null,
          timestamp: new Date().toISOString(),
        };
      } else if (method === 'DELETE') {
        status = 200;
        statusText = 'OK';
        responseBody = {
          success: true,
          message: 'Resource deleted',
          timestamp: new Date().toISOString(),
        };
      } else if (method === 'PATCH') {
        status = 200;
        statusText = 'OK';
        responseBody = {
          success: true,
          message: 'Resource patched',
          data: request.body ? JSON.parse(request.body) : null,
          timestamp: new Date().toISOString(),
        };
      } else {
        responseBody = {
          success: true,
          message: `Mock ${method} response`,
          method,
          url,
          timestamp: new Date().toISOString(),
        };
      }

      const mockResponse = {
        status,
        status_text: statusText,
        headers: {
          "content-type": "application/json",
          "x-request-method": method,
          ...(status === 201 ? { location: `${url}/${Math.floor(Math.random() * 1000)}` } : {}),
        },
        body: JSON.stringify(responseBody, null, 2),
        time_ms: delay,
        final_url: url,
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
