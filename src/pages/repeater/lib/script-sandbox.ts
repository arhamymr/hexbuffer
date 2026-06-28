import type { TestResult } from '@/stores/collections';

interface SandboxRequest {
  url: string;
  method: string;
  headers: Record<string, string>;
  body: string;
}

interface SandboxResponse {
  status: number;
  statusText: string;
  headers: Record<string, string>;
  body: string;
}

interface SandboxResult {
  updatedVariables: Record<string, string>;
  testResults: TestResult[];
  logs: string[];
}

export function runScriptSandbox(
  code: string,
  variables: Record<string, string>,
  request: SandboxRequest,
  response: SandboxResponse | null
): SandboxResult {
  const updatedVariables = { ...variables };
  const testResults: TestResult[] = [];
  const logs: string[] = [];

  // Implement basic expect assertion library
  const expect = (actual: any) => {
    return {
      to: {
        equal: (expected: any) => {
          if (actual !== expected) {
            throw new Error(`expected ${JSON.stringify(actual)} to equal ${JSON.stringify(expected)}`);
          }
        },
        not: {
          equal: (expected: any) => {
            if (actual === expected) {
              throw new Error(`expected ${JSON.stringify(actual)} not to equal ${JSON.stringify(expected)}`);
            }
          },
        },
        include: (expected: string) => {
          if (typeof actual !== 'string' || !actual.includes(expected)) {
            throw new Error(`expected ${JSON.stringify(actual)} to include ${JSON.stringify(expected)}`);
          }
        },
        be: {
          a: (type: string) => {
            if (typeof actual !== type) {
              throw new Error(`expected ${JSON.stringify(actual)} to be a ${type}`);
            }
          },
          ok: () => {
            if (!actual) {
              throw new Error(`expected ${JSON.stringify(actual)} to be truthy`);
            }
          }
        }
      }
    };
  };

  // Implement script helper object
  const script = {
    environment: {
      get: (key: string) => updatedVariables[key] || '',
      set: (key: string, value: string) => {
        updatedVariables[key] = value;
      },
      has: (key: string) => key in updatedVariables,
      unset: (key: string) => {
        delete updatedVariables[key];
      }
    },
    request: {
      url: request.url,
      method: request.method,
      headers: request.headers,
      body: request.body,
    },
    response: response ? {
      code: response.status,
      status: response.statusText,
      headers: response.headers,
      text: () => response.body,
      json: () => {
        try {
          return JSON.parse(response.body);
        } catch (e) {
          throw new Error('Failed to parse response body as JSON');
        }
      }
    } : null,
    test: (name: string, testFn: () => void) => {
      try {
        testFn();
        testResults.push({ name, passed: true });
      } catch (err: any) {
        testResults.push({ name, passed: false, message: err.message || String(err) });
      }
    },
    log: (...args: any[]) => {
      logs.push(args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' '));
    }
  };

  try {
    // Create sandboxed runner
    const sandboxFn = new Function('pm', 'script', 'expect', 'console', `
      with (pm) {
        ${code}
      }
    `);
    
    // Stub console inside sandbox to direct to our custom logs
    const mockConsole = {
      log: script.log,
      warn: script.log,
      error: script.log,
      info: script.log
    };

    sandboxFn(script, script, expect, mockConsole);
  } catch (err: any) {
    testResults.push({
      name: 'Script execution error',
      passed: false,
      message: err.message || String(err)
    });
  }

  return {
    updatedVariables,
    testResults,
    logs
  };
}
