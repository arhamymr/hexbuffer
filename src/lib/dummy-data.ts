import { Target, ApiCall, RequestType } from "@/types";
import { Finding, Severity, FindingStatus, HttpRequestData, HttpResponseData } from "@/components/findings/types";
import { RepeaterTab, HttpRequest, HttpResponse, createNewTab } from "@/components/repeater/types";
import { AttackConfig, AttackResult, AttackProgress } from "@/components/brute-force/types";

function generateId(): string {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}

function randomItem<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export function generateDummyTargets(): Target[] {
  return [
    {
      id: generateId(),
      name: "Production API",
      description: "Main production API server",
      scope: ["api.example.com", "*.api.example.com"],
      createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: generateId(),
      name: "Staging Server",
      description: "Staging environment for testing",
      scope: ["staging.example.com", "*.staging.example.com"],
      createdAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: generateId(),
      name: "Dev Environment",
      description: "Local development server",
      scope: ["localhost", "127.0.0.1"],
      createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ];
}

const requestTypes: RequestType[] = ["XHR", "Document", "JS", "CSS", "Media", "Font", "Other"];
const methods = ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS", "HEAD"];

function generateHeaders(type: "request" | "response"): Record<string, string> {
  if (type === "request") {
    const common = {
      "Accept": "application/json, text/plain, */*",
      "Accept-Language": "en-US,en;q=0.9",
      "Accept-Encoding": "gzip, deflate, br",
      "Content-Type": "application/json",
    };
    if (Math.random() > 0.5) {
      return {
        ...common,
        "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
        "X-Request-ID": generateId(),
        "X-CSRF-Token": generateId(),
      };
    }
    return common;
  }
  return {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-cache, no-store, must-revalidate",
    "x-content-type-options": "nosniff",
    "x-frame-options": "DENY",
    "x-xss-protection": "1; mode=block",
  };
}

export function generateDummyApiCalls(targetIds: string[], count: number = 25): ApiCall[] {
  const calls: ApiCall[] = [];
  const paths = [
    "/api/users", "/api/users/123", "/api/users/456", "/api/posts", "/api/posts/789",
    "/api/comments", "/api/auth/login", "/api/auth/logout", "/api/auth/refresh",
    "/api/products", "/api/products/abc123", "/api/cart", "/api/cart/items",
    "/api/orders", "/api/orders/ORD-12345", "/api/search", "/api/search?q=test",
    "/api/notifications", "/api/settings", "/api/profile", "/api/uploads",
    "/api/webhooks", "/api/metrics", "/api/health", "/api/healthz",
  ];
  const hosts = ["api.example.com", "api.staging.example.com", "localhost:3000", "127.0.0.1:8080"];
  const statusCodes = [200, 200, 200, 201, 204, 400, 401, 403, 404, 422, 500, 502, 503];
  const requestBodies = [
    null,
    null,
    '{"username":"john","email":"john@example.com"}',
    '{"title":"New Post","content":"This is the content..."}',
    '{"comment":"Great article!","rating":5}',
    '{"search":"query string"}',
    '{"ids":[1,2,3,4,5]}',
  ];
  const responseBodies = [
    '{"id":123,"name":"John Doe","email":"john@example.com","created_at":"2024-01-15T10:30:00Z"}',
    '{"users":[{"id":1,"name":"John"},{"id":2,"name":"Jane"},{"id":3,"name":"Bob"}],"total":3}',
    '{"id":"abc123","title":"New Post","content":"This is the content...","author":"John","likes":42,"created_at":"2024-01-15T10:30:00Z"}',
    '{"error":"Invalid request","message":"The request body is malformed","code":"ERR_001"}',
    '{"error":"Unauthorized","message":"Invalid or expired token","code":"AUTH_001"}',
    '{"error":"Not found","message":"Resource does not exist","code":"NOT_FOUND"}',
    '{"data":{"items":[{"id":1},{"id":2},{"id":3}],"page":1,"per_page":20,"total":100}}',
    '{"success":true,"message":"Operation completed successfully"}',
    '<!DOCTYPE html><html><head><title>404 Not Found</title></head><body><h1>404</h1></body></html>',
    '{"id":789,"title":"Comment posted","author":"Jane","created_at":"2024-01-15T11:00:00Z"}',
  ];

  for (let i = 0; i < count; i++) {
    const path = randomItem(paths);
    const host = randomItem(hosts);
    const method = randomItem(methods);
    const status = randomItem(statusCodes);
    const timestamp = Date.now() - randomInt(0, 7 * 24 * 60 * 60 * 1000);
    const hasRequestBody = !["GET", "HEAD", "OPTIONS"].includes(method);
    const hasResponseBody = status >= 200 && status < 500;

    calls.push({
      id: generateId(),
      session_id: generateId(),
      target_id: randomItem(targetIds),
      timestamp,
      request_type: randomItem(requestTypes),
      method,
      url: `https://${host}${path}`,
      host,
      path,
      query_params: path.includes("?") ? { q: "test", page: "1" } : {},
      headers: generateHeaders("request"),
      cookies: Math.random() > 0.3 ? { session_id: generateId(), csrf_token: generateId() } : {},
      request_body: hasRequestBody && Math.random() > 0.5 ? randomItem(requestBodies) : null,
      request_body_size: hasRequestBody && Math.random() > 0.5 ? randomInt(50, 2000) : 0,
      response_status: status,
      response_status_text: status === 200 ? "OK" : status === 201 ? "Created" : status === 400 ? "Bad Request" : status === 401 ? "Unauthorized" : status === 403 ? "Forbidden" : status === 404 ? "Not Found" : status === 500 ? "Internal Server Error" : "Unknown",
      response_headers: generateHeaders("response"),
      response_cookies: Math.random() > 0.5 ? { session_id: generateId() } : {},
      response_body: hasResponseBody ? randomItem(responseBodies) : null,
      response_body_size: hasResponseBody ? randomInt(100, 5000) : 0,
      response_content_type: "application/json",
      security_state: status >= 400 ? "insecure" : "secure",
      server_ip: `${randomInt(1, 255)}.${randomInt(1, 255)}.${randomInt(1, 255)}.${randomInt(1, 255)}`,
      duration_ms: randomInt(20, 2000),
    });
  }

  return calls.sort((a, b) => b.timestamp - a.timestamp);
}

export function generateDummyFindings(targetIds: string[]): Finding[] {
  const severities: Severity[] = ["critical", "high", "medium", "low", "info"];
  const statuses: FindingStatus[] = ["open", "in_progress", "verified", "fixed", "false_positive"];

  const findingsData = [
    {
      title: "SQL Injection in Search Endpoint",
      description: "The search endpoint is vulnerable to SQL injection attacks via the 'q' parameter. User input is not properly sanitized before being used in database queries.",
      severity: "critical" as Severity,
      impact: "An attacker could execute arbitrary SQL queries, potentially accessing, modifying, or deleting all data in the database.",
      remediation: "Use parameterized queries or an ORM. Implement input validation and sanitization. Consider using a Web Application Firewall.",
    },
    {
      title: "Broken Authentication",
      description: "The authentication mechanism has multiple vulnerabilities including weak session token generation and improper session expiration.",
      severity: "high" as Severity,
      impact: "Attackers could hijack user sessions, gain unauthorized access to accounts, or impersonate other users.",
      remediation: "Implement secure session management with proper token generation, set secure cookie flags, and enforce session timeout.",
    },
    {
      title: "Sensitive Data Exposure",
      description: "API responses contain sensitive data (PII) that should not be exposed to unauthorized users.",
      severity: "high" as Severity,
      impact: "User personal information could be accessed by unauthorized parties, leading to privacy violations and potential regulatory penalties.",
      remediation: "Implement field-level access controls. Remove sensitive fields from API responses unless explicitly required. Add data masking for PII.",
    },
    {
      title: "Missing Rate Limiting",
      description: "The API endpoints do not implement rate limiting, allowing unlimited requests from any client.",
      severity: "medium" as Severity,
      impact: "The API is vulnerable to brute force attacks, denial of service, and resource exhaustion.",
      remediation: "Implement rate limiting on all endpoints. Use a token bucket or sliding window algorithm. Consider implementing progressive delays.",
    },
    {
      title: "Cross-Site Scripting (XSS)",
      description: "User input is reflected in responses without proper encoding, allowing injection of malicious scripts.",
      severity: "medium" as Severity,
      impact: "Attackers could inject malicious scripts that execute in users' browsers, leading to session hijacking or data theft.",
      remediation: "Implement output encoding. Use Content Security Policy headers. Validate and sanitize all user inputs.",
    },
    {
      title: "Insecure CORS Configuration",
      description: "The API allows cross-origin requests from any domain (*), potentially exposing resources to unauthorized cross-origin access.",
      severity: "medium" as Severity,
      impact: "Malicious websites could make requests to the API on behalf of users, potentially exfiltrating data.",
      remediation: "Configure CORS to allow only trusted origins. Avoid using wildcards in production. Validate Origin header.",
    },
    {
      title: "Verbose Error Messages",
      description: "API returns detailed stack traces and internal system information in error responses.",
      severity: "low" as Severity,
      impact: "Attackers could use detailed error messages to gather information about the system's internals for targeted attacks.",
      remediation: "Return generic error messages to clients. Log detailed errors server-side. Implement custom error handlers.",
    },
    {
      title: "Information Disclosure via Headers",
      description: "Server headers (X-Powered-By, Server, etc.) reveal internal technology stack information.",
      severity: "info" as Severity,
      impact: "While low risk, information disclosure could help attackers identify vulnerabilities specific to the disclosed technologies.",
      remediation: "Remove or genericize revealing headers. Configure server to not expose version information.",
    },
  ];

  return findingsData.map((data, index) => {
    const targetId = randomItem(targetIds);
    const hasRequestResponse = Math.random() > 0.3;

    return {
      id: generateId(),
      target_id: targetId,
      title: data.title,
      description: data.description,
      severity: data.severity,
      steps_to_reproduce: `1. Navigate to the affected endpoint\n2. Inject payload in the vulnerable parameter\n3. Observe unexpected behavior or data exposure`,
      impact: data.impact,
      remediation: data.remediation,
      request_data: hasRequestResponse ? {
        method: "POST",
        url: "https://api.example.com/endpoint",
        headers: { "Content-Type": "application/json", "Authorization": "Bearer token" },
        body: JSON.stringify({ param: "injected' OR 1=1--" }),
      } as HttpRequestData : null,
      response_data: hasRequestResponse ? {
        status: 500,
        status_text: "Internal Server Error",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ error: "Database error", detail: "..." }),
        time_ms: 150,
      } as HttpResponseData : null,
      status: randomItem(statuses),
      created_at: Date.now() - randomInt(1, 30) * 24 * 60 * 60 * 1000,
      updated_at: Date.now() - randomInt(0, 7) * 24 * 60 * 60 * 1000,
    };
  });
}

export function generateDummyRepeaterTabs(): RepeaterTab[] {
  const tabs: RepeaterTab[] = [];

  const tab1 = createNewTab();
  tab1.name = "GET Users";
  tab1.request = {
    method: "GET",
    url: "https://api.example.com/users?page=1&limit=20",
    headers: {
      "Accept": "application/json",
      "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    },
    body: "",
    follow_redirects: true,
    max_hops: 10,
  };
  tab1.response = {
    status: 200,
    status_text: "OK",
    headers: {
      "content-type": "application/json",
      "x-total-count": "156",
      "x-page": "1",
    },
    body: JSON.stringify({
      data: [
        { id: 1, name: "John Doe", email: "john@example.com", role: "admin" },
        { id: 2, name: "Jane Smith", email: "jane@example.com", role: "user" },
        { id: 3, name: "Bob Wilson", email: "bob@example.com", role: "user" },
      ],
      meta: { page: 1, limit: 20, total: 156 },
    }, null, 2),
    time_ms: 245,
    final_url: "https://api.example.com/users?page=1&limit=20",
  };
  tab1.history = [tab1.request];
  tab1.historyIndex = 0;
  tabs.push(tab1);

  const tab2 = createNewTab();
  tab2.name = "POST Login";
  tab2.request = {
    method: "POST",
    url: "https://api.example.com/auth/login",
    headers: {
      "Content-Type": "application/json",
      "Accept": "application/json",
    },
    body: JSON.stringify({ email: "john@example.com", password: "••••••••" }),
    follow_redirects: false,
    max_hops: 5,
  };
  tab2.response = {
    status: 200,
    status_text: "OK",
    headers: {
      "content-type": "application/json",
      "set-cookie": "session_id=abc123; HttpOnly; Secure",
    },
    body: JSON.stringify({
      success: true,
      token: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
      user: { id: 1, name: "John Doe", email: "john@example.com" },
    }, null, 2),
    time_ms: 312,
    final_url: "https://api.example.com/auth/login",
  };
  tab2.history = [tab2.request];
  tab2.historyIndex = 0;
  tabs.push(tab2);

  const tab3 = createNewTab();
  tab3.name = "PUT Profile";
  tab3.request = {
    method: "PUT",
    url: "https://api.example.com/users/1/profile",
    headers: {
      "Content-Type": "application/json",
      "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    },
    body: JSON.stringify({ name: "John Doe Updated", bio: "Software developer passionate about security" }),
    follow_redirects: true,
    max_hops: 10,
  };
  tabs.push(tab3);

  return tabs;
}

export function generateDummyAttackResults(count: number = 15): AttackResult[] {
  const results: AttackResult[] = [];
  const payloads = ["admin", "test", "user", "guest", "administrator", "root", "superuser", "developer", "support", "info", "demo", "default", "master", "backup", "password"];
  const grepKeywords = ["error", "success", "admin", "token", "success", "welcome"];
  const statuses = [200, 200, 200, 201, 301, 400, 401, 403, 404, 500];

  for (let i = 0; i < count; i++) {
    const payload = payloads[i % payloads.length];
    const status = randomItem(statuses);
    const hasGrepMatch = Math.random() > 0.6;
    const hasError = status >= 400 && Math.random() > 0.5;
    const isSuccess = status >= 200 && status < 300;

    results.push({
      id: generateId(),
      payload_values: { username: payload },
      status: hasError ? undefined : status,
      response_length: isSuccess ? randomInt(100, 5000) : randomInt(50, 500),
      response_time_ms: randomInt(50, 1500),
      error: hasError ? randomItem(["Connection timeout", "Invalid response", "Rate limited", "Service unavailable"]) : undefined,
      response: hasError ? undefined : {
        status,
        status_text: status === 200 ? "OK" : status === 201 ? "Created" : status === 400 ? "Bad Request" : status === 401 ? "Unauthorized" : status === 403 ? "Forbidden" : status === 404 ? "Not Found" : "Error",
        headers: { "content-type": "application/json" },
        body: isSuccess
          ? JSON.stringify({ message: "success", data: { username: payload, id: randomInt(1, 1000) } })
          : JSON.stringify({ error: "Not found", message: `User ${payload} does not exist` }),
        time_ms: randomInt(50, 500),
        final_url: `https://api.example.com/users/${payload}`,
      },
      grep_match: hasGrepMatch,
      grep_extracted: hasGrepMatch ? `token_${payload}_${randomInt(1000, 9999)}` : undefined,
    });
  }

  return results;
}

export function generateDummyAttackConfig(): AttackConfig {
  return {
    name: "Username enumeration",
    mode: "Sniper",
    base_request: {
      method: "POST",
      url: "https://api.example.com/auth/login",
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json",
      },
      body: JSON.stringify({ username: "§payload§", password: "test123" }),
      follow_redirects: false,
      max_hops: 5,
    },
    positions: [{ name: "payload", start: 13, end: 20 }],
    payload_config: {
      payload_type: "SimpleList",
      values: ["admin", "test", "user", "guest", "administrator", "root", "superuser"],
      processing: ["Base64Encode"],
    },
    concurrency: 5,
    delay_ms: 100,
    retries: 2,
    grep_match: {
      enabled: true,
      keyword: "success",
      case_sensitive: false,
    },
    grep_extract: {
      enabled: false,
      regex: "",
      replacement: undefined,
    },
    session_handling: {
      enabled: false,
      extract_token_name: undefined,
      extract_from_response: undefined,
      update_header_name: undefined,
    },
  };
}

export function generateDummyAttackProgress(): AttackProgress {
  const total = 100;
  const current = randomInt(10, total);
  return {
    type: current === total ? "Complete" : "Update",
    current,
    total,
  };
}
