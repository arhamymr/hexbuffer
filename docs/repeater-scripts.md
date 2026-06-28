# Repeater Scripting Engine

AppRecon Repeater supports custom JavaScript scripting to automate dynamic workflows. You can execute code before a request is fired (**Pre-Request Scripts**) and after a response is received (**Test / Assertion Scripts**). 

This guide outlines how the engine executes, documents the sandbox APIs, and walks through a complete end-to-end credential chaining example.

---

## Technical Architecture

The scripting cycle is orchestrated in [craft.ts](file:///Users/arham/Desktop/project/apprecon/src/triggers/repeater/craft.ts), while the JavaScript evaluation is sandboxed in [script-sandbox.ts](file:///Users/arham/Desktop/project/apprecon/src/pages/repeater/lib/script-sandbox.ts) using a restricted `Function` wrapper with a scoped execution environment.

```mermaid
graph TD
    A[Start Request] --> B[Load Context variables]
    B --> C[Execute Pre-Request Script]
    C --> D[Resolve {{variable}} placeholders in Request URL/Headers/Body]
    D --> E[Send HTTP Request via Native Engine]
    E --> F[Receive HTTP Response]
    F --> G[Execute Test / Assertion Script]
    G --> H[Update Context variables & Record Test Results]
    H --> I[End Request]
```

### Sandbox execution sequence:
1. **Pre-Request Script Execution**: Accesses current environment variables, runs sandbox code to edit variables, and updates the transient variables list.
2. **Variable Resolution**: Scans raw request configurations (URL, Headers, Body) for double curly-brace syntax (e.g. `{{host}}`) and interpolates their values.
3. **HTTP Dispatch**: Dispatches request via native HTTP transport.
4. **Test Script Execution**: Receives HTTP response headers and text, runs assertions via the built-in library, updates variables, and persists changes to the active workspace environment context.

---

## Sandbox API Reference (`script` / `pm`)

Both script types run in a sandboxed runtime environment where a global `script` helper object is injected.

> [!TIP]
> For backwards compatibility with standard Postman collections and scripts, a global `pm` alias is also injected and maps to the exact same object. You can use either `script` or `pm` interchangeably.

### `script.environment`
Retrieves, sets, checks, or deletes variables in the active environment context.

* **`script.environment.get(key: string): string`**
  Retrieves the value of a variable. Returns `""` if not defined.
  ```javascript
  const token = script.environment.get("authToken");
  ```
* **`script.environment.set(key: string, value: string): void`**
  Sets or updates the value of a variable. Any variables set in scripts can be dynamically resolved in the UI request editor using `{{key}}`.
  ```javascript
  script.environment.set("timestamp", Date.now().toString());
  ```
* **`script.environment.has(key: string): boolean`**
  Checks if a variable is defined in the active environment.
  ```javascript
  if (script.environment.has("userId")) { ... }
  ```
* **`script.environment.unset(key: string): void`**
  Removes a variable from the environment.
  ```javascript
  script.environment.unset("tempCode");
  ```

---

### `script.request`
Provides read-only details of the dispatching request:
* **`script.request.url`**: `string` (The request URL)
* **`script.request.method`**: `string` (The HTTP verb, e.g. `"GET"`, `"POST"`)
* **`script.request.headers`**: `Record<string, string>` (Object containing request headers)
* **`script.request.body`**: `string` (The raw request body payload)

---

### `script.response` (Test / Assertion Scripts Only)
Provides read-only access to the HTTP response received:
* **`script.response.code`**: `number` (The HTTP status code, e.g. `200`, `404`, `500`)
* **`script.response.status`**: `string` (The HTTP status text, e.g. `"OK"`, `"Not Found"`)
* **`script.response.headers`**: `Record<string, string>` (Object containing response headers)
* **`script.response.text(): string`**
  Returns the raw response body as a text string.
* **`script.response.json(): any`**
  Parses the response body as JSON. Throws an error if the body is not valid JSON.

---

### `script.test`
Defines a test assertion case. If the callback function throws an error (e.g. an assertion failure), the test is marked as failed in the UI results panel.
```javascript
script.test("Status is 200", () => {
  // Test code goes here
});
```

---

### `script.log` / `console.log`
Prints logs to the sandbox debugger output console. Stubs standard console methods.
```javascript
script.log("Parsed JSON response: ", data);
console.log("Token expiration is: ", expiresAt);
```

---

### JavaScript Built-ins & Utilities
Because scripts run in a standard JavaScript engine sandbox, you have full access to standard JavaScript built-in utility classes and functions, including:

* **`JSON`**: Parsing and stringifying payloads (e.g., `JSON.parse(text)`, `JSON.stringify(obj)`).
* **`Math`**: Random numbers, rounding, and math constants (e.g., `Math.random()`, `Math.floor(x)`).
* **`Date`**: Time tracking, timestamps, and formatting (e.g., `Date.now()`, `new Date()`).
* **`RegExp`**: Regular expression patterns for advanced text searches/matching.

---

## Assertion Library (`expect`)

The sandbox provides a global chainable assertion library named `expect` to simplify testing.

### Standard Assertion Chains

| Matcher Chain | Description | Example |
|---|---|---|
| `.to.equal(value)` | Strict equality check (`===`) | `expect(script.response.code).to.equal(200);` |
| `.to.not.equal(value)` | Strict inequality check (`!==`) | `expect(script.response.code).to.not.equal(500);` |
| `.to.include(substring)` | Verifies substring exists in a string | `expect(script.response.text()).to.include("Success");` |
| `.to.be.a(typeString)` | Verifies JavaScript type string (`typeof`) | `expect(token).to.be.a("string");` |
| `.to.be.ok()` | Asserts value is truthy | `expect(data.id).to.be.ok();` |

---

## Full End-to-End Walkthrough: JWT Authentication Chain

In this scenario, we will:
1. Send a `POST` request to `/api/login` containing credentials.
2. Execute a **Test Script** on the response to parse the return payload, assert that the login was successful, extract the JWT token, and save it in the environment as `activeToken`.
3. Send a subsequent `GET` request to `/api/profile` that dynamically resolves `{{activeToken}}` in its headers.

---

### Step 1: Configure the Login Request in Repeater

Create a new tab in Repeater and set the following parameters:

* **Method**: `POST`
* **URL**: `http://localhost:8080/api/login`
* **Headers**:
  * `Content-Type`: `application/json`
* **Body (json)**:
  ```json
  {
    "username": "admin",
    "password": "supersecretpassword"
  }
  ```

---

### Step 2: Add the Test Script to Login

Select the **Scripts** tab in the request panel and add the following code to the **Test / Assertion Script** editor:

```javascript
// Ensure request completes successfully
script.test("Status code is 200 OK", () => {
  expect(script.response.code).to.equal(200);
});

// Verify response body contains token
script.test("Response contains authentication token", () => {
  const data = script.response.json();
  
  // Verify token attribute exists and is a string
  expect(data.token).to.be.ok();
  expect(data.token).to.be.a("string");

  // Save the token to the active environment
  script.environment.set("activeToken", data.token);
  script.log("Saved dynamic variable: activeToken = " + data.token.substring(0, 10) + "...");
});
```

Click **Send**. Once the response is received, the test results will display in the response panel:
- `✓ Status code is 200 OK`
- `✓ Response contains authentication token`

The extracted token value is now stored inside your active workspace context.

---

### Step 3: Configure the Authenticated Profile Request

Create a second tab in Repeater to retrieve the profile details using the dynamic token:

* **Method**: `GET`
* **URL**: `http://localhost:8080/api/profile`
* **Headers**:
  * `Authorization`: `Bearer {{activeToken}}`

Click **Send**. AppRecon will automatically parse the headers, expand `{{activeToken}}` into the token retrieved during Step 2, and execute the authenticated request.

---

### Step 4: Inject a Custom Dynamic Signature (Pre-Request Script)

If the server requires a timestamp header and custom transaction ID signature for security verification on every request:

Select the second tab and add the following code to the **Pre-Request Script** editor:

```javascript
// Calculate current unix timestamp
const timestamp = Date.now().toString();

// Generate a random transaction ID
const transactionId = "TX-" + Math.floor(Math.random() * 1000000);

// Save variables to the transient environment
script.environment.set("currentTimestamp", timestamp);
script.environment.set("txId", transactionId);
```

Add these dynamic headers to the Request editor:
* `X-Timestamp`: `{{currentTimestamp}}`
* `X-Transaction-Id`: `{{txId}}`

When you click **Send**, the Pre-Request script executes first, registers the fresh variables, resolves them in the headers, and sends the values to the server.
