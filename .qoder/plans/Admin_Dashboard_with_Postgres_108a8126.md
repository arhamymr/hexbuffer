# Admin Dashboard with Direct Postgres

## Context

The admin dashboard currently plans to call external API endpoints on the collaborator server. Since the collaborator server has no license code yet, we'll connect directly to the Neon Postgres database using Drizzle ORM. This gives us full control over the schema and eliminates the API hop.

## Task 1: Install Dependencies and Configure Drizzle

Install packages:
```
pnpm add drizzle-orm @neondatabase/serverless
pnpm add -D drizzle-kit
```

Create `drizzle.config.ts` at project root:
- dialect: postgresql
- schema path: `db/schema.ts`
- connection string from `DATABASE_URL` env var

Add scripts to `package.json`:
- `db:generate` — generate migration SQL
- `db:migrate` — push schema to database
- `db:studio` — open Drizzle Studio

## Task 2: Define Database Schema

Create `db/schema.ts` with two tables:

**licenses** table:
| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK, default gen_random_uuid() |
| key | varchar(32) | unique, not null, indexed |
| email | varchar(255) | nullable |
| plan | varchar(50) | default 'lifetime' |
| maxDevices | integer | default 3 |
| status | varchar(20) | default 'active', indexed |
| createdAt | timestamp | default now() |

**activations** table:
| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK, default gen_random_uuid() |
| licenseId | uuid | FK -> licenses.id, indexed |
| machineFingerprint | varchar(255) | not null |
| machineInfo | jsonb | nullable |
| createdAt | timestamp | default now() |
| lastSeenAt | timestamp | nullable |

Create `db/index.ts` — singleton Drizzle client using `@neondatabase/serverless` HTTP driver with `DATABASE_URL`.

## Task 3: Create DB Query Layer

Create `app/admin/lib/db.ts` with typed query functions:
- `getAllLicenses()` — SELECT all licenses with activation counts (JOIN with activations)
- `getLicenseByKey(key)` — SELECT single license by key
- `getLicenseById(id)` — SELECT single license by id
- `createLicense({ email?, plan?, maxDevices? })` — INSERT + generate key (format: `0XB-XXXXX-XXXXX-XXXXX-XXXXX`)
- `revokeLicenseByKey(key)` — UPDATE status to 'revoked'
- `getStats()` — aggregate counts for dashboard cards
- `getRecentLicenses(limit)` — SELECT last N created

Key generation: random 20 alphanumeric chars split into 4 groups of 5, prefixed with `0XB-`.

## Task 4: Auth and Middleware

Create `app/admin/lib/auth.ts`:
- Cookie-based session using `admin_session` cookie
- `getAdminApiKey()` — read cookie
- `setAdminApiKey(key)` — set httpOnly cookie (7-day expiry)
- `clearAdminApiKey()` — delete cookie
- `verifyAdmin(key)` — check key matches `ADMIN_API_KEY` env var

Create `middleware.ts` at project root:
- Match `/admin/:path*` routes
- Redirect to `/admin/login` if `admin_session` cookie is missing
- Allow `/admin/login` without auth

Create `app/admin/lib/actions.ts` — Server Actions:
- `login(prev, formData)` — verify key against `ADMIN_API_KEY` env, set cookie, redirect
- `generateLicense(prev, formData)` — call `createLicense()`, return result
- `revokeLicenseAction(prev, key)` — call `revokeLicenseByKey()`, return result
- `logout()` — clear cookie, redirect to login

## Task 5: UI Primitives

Create `components/ui/input.tsx` — standard shadcn Input (h-8, border-input, focus ring).

Create `components/ui/label.tsx` — standard shadcn Label.

## Task 6: Admin Layout and Sidebar

Create `app/admin/layout.tsx`:
- Flex layout: sidebar (desktop) + main content area
- No SiteHeader/SiteFooter (admin is self-contained)

Create `app/admin/components/admin-sidebar.tsx` (client component):
- Brand header with 0xbuffer logo + "admin" badge
- Nav links: Dashboard, All Licenses, Generate
- Active state highlighting (green primary)
- Mobile hamburger menu
- Sign out button

## Task 7: Dashboard Components

Create `app/admin/components/stat-cards.tsx`:
- 4 metric cards: Total, Active, Revoked, Total Activations
- Uses Card component + lucide icons

Create `app/admin/components/license-table.tsx` (client component):
- Search input (by key or email)
- Filter buttons (All / Active / Revoked)
- Table with columns: Key (copy), Email, Plan, Status, Devices, Created, Actions
- Inline revoke button per row
- Click row to navigate to detail page
- `compact` prop for dashboard (limits to 10 rows, hides search/filter)

Create `app/admin/components/generate-form.tsx` (client component):
- Form: email (optional), plan (select, default lifetime), maxDevices (number, default 3)
- Uses `useActionState` + `useFormStatus` for React 19 form handling
- Success state: displays generated key with copy button + "Share via Email" + "Generate Another"

Create `app/admin/components/license-detail.tsx` (client component):
- License info card with copy key button
- Activation progress bar (activationCount / maxDevices)
- Revoke button with confirmation

## Task 8: Pages

Create `app/admin/login/page.tsx` (client component):
- API key input form, verifies against `ADMIN_API_KEY` env var
- Redirects to `/admin` on success

Create `app/admin/page.tsx` (server component, `force-dynamic`):
- Fetches stats + recent licenses from DB
- Renders StatCards + compact LicenseTable

Create `app/admin/licenses/page.tsx` (server component, `force-dynamic`):
- Fetches all licenses from DB
- Renders full LicenseTable with search/filter

Create `app/admin/licenses/new/page.tsx`:
- Renders GenerateForm component

Create `app/admin/licenses/[key]/page.tsx` (server component, `force-dynamic`):
- Fetches license by key from DB
- Renders LicenseDetail component
- 404-style message if not found

## Task 9: Environment and Push Schema

Update `.env` with all Neon connection variables + `ADMIN_API_KEY` (a secret you choose).

Run `pnpm db:generate` then `pnpm db:migrate` to create tables in Neon.

## File Summary

| File | Purpose |
|------|---------|
| `drizzle.config.ts` | Drizzle configuration |
| `db/schema.ts` | Table definitions |
| `db/index.ts` | DB client singleton |
| `middleware.ts` | Route protection |
| `components/ui/input.tsx` | Input primitive |
| `components/ui/label.tsx` | Label primitive |
| `app/admin/lib/auth.ts` | Cookie session helpers |
| `app/admin/lib/db.ts` | Typed query functions |
| `app/admin/lib/actions.ts` | Server Actions |
| `app/admin/layout.tsx` | Admin layout |
| `app/admin/components/admin-sidebar.tsx` | Sidebar navigation |
| `app/admin/components/stat-cards.tsx` | Dashboard metric cards |
| `app/admin/components/license-table.tsx` | License data table |
| `app/admin/components/generate-form.tsx` | License generation form |
| `app/admin/components/license-detail.tsx` | License detail panel |
| `app/admin/login/page.tsx` | Login gate |
| `app/admin/page.tsx` | Dashboard overview |
| `app/admin/licenses/page.tsx` | All licenses |
| `app/admin/licenses/new/page.tsx` | Generate license |
| `app/admin/licenses/[key]/page.tsx` | License detail |
