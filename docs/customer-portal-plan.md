# In-App License Modal — Plan

## Overview

A lightweight in-app modal that shows the user's current license status and lets them activate a license key or purchase one. No separate web portal needed — everything lives inside the desktop app.

## Behavior

| State | Modal Shows |
|-------|-------------|
| **No license (Free)** | "Free" badge, "Buy License" button → opens checkout URL in browser, license key input + "Activate" button |
| **License active** | "Lifetime" badge with green indicator, masked key display, "Deactivate" button |

## Modal UI

### Free State

```
┌─────────────────────────────────────────────┐
│              License                        │
│                                             │
│  ┌─ Free ──────────────────────────────┐   │
│  │ You are using the free evaluation.  │   │
│  │                                     │   │
│  │ [Buy License]                       │   │
│  └─────────────────────────────────────┘   │
│                                             │
│  ── or enter your license key ──            │
│                                             │
│  ┌─────────────────────────────────────┐   │
│  │ 0XB-XXXXX-XXXXX-XXXXX-XXXXX        │   │
│  └─────────────────────────────────────┘   │
│  [Activate]                                 │
│                                             │
└─────────────────────────────────────────────┘
```

### Licensed State

```
┌─────────────────────────────────────────────┐
│              License                        │
│                                             │
│  ┌─ Lifetime ──────────────────────────┐   │
│  │ ✓ License active — never expires    │   │
│  │                                     │   │
│  │ Key: 0XB-K3H9••••••••••N6B5A       │   │
│  └─────────────────────────────────────┘   │
│                                             │
│  [Deactivate]                               │
│                                             │
└─────────────────────────────────────────────┘
```

## Trigger Point

Footer: a small badge/button next to the version text showing "Free" or "Lifetime". Clicking it opens the license modal dialog.

## Tech Stack

- **Frontend**: React dialog (`src/components/ui/dialog.tsx`), Zustand store (persisted)
- **Backend**: Tauri commands for license verify/activate/deactivate against the collaborator server
- **Checkout**: `openUrl()` from `@tauri-apps/plugin-opener` → opens `https://0xbuffer.com/payment`
- **Storage**: License key + status persisted via Zustand `persist` middleware (same pattern as `useAppStore`)

## Architecture

```
Footer badge ("Free" / "Lifetime")
        │
        │ click
        ▼
LicenseModal dialog
        │
        ├── "Buy License" → openUrl("https://0xbuffer.com/payment")
        │
        ├── "Activate" → invoke("activate_license", { key })
        │                    │
        │                    ▼
        │               POST /api/v1/license/activate (collaborator server)
        │                    │
        │                    ▼
        │               Zustand license store updated → badge refreshes
        │
        └── "Deactivate" → invoke("deactivate_license")
                                │
                                ▼
                           POST /api/v1/license/deactivate (collaborator server)
                                │
                                ▼
                           Zustand store reset to "free"
```

## Files to Create

| File | Purpose |
|------|---------|
| `src/stores/license.ts` | Zustand store: `licenseKey`, `status` (`free` / `lifetime`), `activate()`, `deactivate()`, `verifyOnStartup()` |
| `src/components/license-modal.tsx` | Dialog component with both states (free / licensed) |
| `src-tauri/src/commands/license.rs` | Tauri commands: `activate_license`, `verify_license`, `deactivate_license` |

## Files to Modify

| File | Change |
|------|--------|
| `src/components/footer.tsx` | Add license badge button + open modal on click |
| `src-tauri/src/main.rs` | Register license commands in `invoke_handler` |
| `src-tauri/src/commands/mod.rs` | Add `pub mod license;` |

## Implementation Details

### 1. License Store (`src/stores/license.ts`)

```ts
interface LicenseState {
  licenseKey: string | null;
  status: 'free' | 'lifetime';
  activating: boolean;
  verifying: boolean;
  activate: (key: string) => Promise<void>;
  deactivate: () => Promise<void>;
  verifyOnStartup: () => Promise<void>;
}
```

- Persisted with `zustand/middleware/persist` under key `0xbuffer-license`
- `activate()` calls `invoke('activate_license', { key })` → updates state on success
- `deactivate()` calls `invoke('deactivate_license')` → resets to `free`
- `verifyOnStartup()` calls `invoke('verify_license')` → re-checks saved key against server on app load

### 2. Tauri Commands (`src-tauri/src/commands/license.rs`)

| Command | Parameters | Returns | Description |
|---------|-----------|---------|-------------|
| `activate_license` | `key: String` | `Result<LicenseInfo, String>` | POST to `/api/v1/license/activate` with key + machine fingerprint |
| `verify_license` | none | `Result<LicenseInfo, String>` | POST to `/api/v1/license/verify` with stored key + fingerprint |
| `deactivate_license` | none | `Result<(), String>` | POST to `/api/v1/license/deactivate` with stored key + fingerprint |

`LicenseInfo` struct: `{ key: String, plan: String, activated_at: String }`

Machine fingerprint: SHA-256 of hostname + OS (same approach as collaborator server).

### 3. License Modal Component (`src/components/license-modal.tsx`)

Props:

```ts
interface LicenseModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}
```

- Uses existing `Dialog`, `DialogContent`, `DialogHeader`, `DialogTitle`, `DialogDescription`
- **Free state**: `Badge` variant `secondary` with "Free" text, `Button` for "Buy License" (calls `openUrl`), `Input` for key entry, `Button` for "Activate"
- **Licensed state**: `Badge` variant `default` with "Lifetime" text, masked key display, `Button` variant `outline` for "Deactivate"

### 4. Footer Badge (`src/components/footer.tsx`)

Add next to the version text:

```tsx
<Button variant="ghost" size="xs" className="h-8 px-2 text-xs" onClick={() => setLicenseModalOpen(true)}>
  {licenseStatus === 'lifetime' ? (
    <><CheckCircle2 className="size-3 text-green-500" /> Lifetime</>
  ) : (
    <>Free</>
  )}
</Button>
```

### 5. Checkout URL

Use `openUrl('https://0xbuffer.com/payment')` to open the existing payment page in the user's default browser.

## Server API Endpoints (Already Built)

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/v1/license/activate` | Activate a license on a device |
| `POST` | `/api/v1/license/verify` | Verify license + device is valid |
| `POST` | `/api/v1/license/deactivate` | Deactivate a license from a device |

## Implementation Tasks

| # | Task | Priority |
|---|------|----------|
| 1 | Create `src/stores/license.ts` with Zustand store | P0 |
| 2 | Create `src-tauri/src/commands/license.rs` with activate/verify/deactivate commands | P0 |
| 3 | Register license commands in `main.rs` and `commands/mod.rs` | P0 |
| 4 | Create `src/components/license-modal.tsx` dialog component | P0 |
| 5 | Add license badge to footer + wire up modal open/close | P0 |
| 6 | Call `verifyOnStartup()` on app load to re-validate saved key | P1 |
| 7 | Handle offline/error states gracefully (show last known status) | P1 |
