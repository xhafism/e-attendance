# e-attendance Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build an employee clock in/out web app with Microsoft SSO, GPS location tracking, geofencing, admin/HR dashboard with analytics, and cross-app SSO.

**Architecture:** Next.js App Router with Server Components deployed on Cloudflare Workers via OpenNext. D1 (SQLite) for persistence. Server-side Microsoft OAuth with HMAC-signed session cookies. Leaflet maps, ApexCharts analytics. Follows budget-tracker patterns exactly (raw SQL, single actions file, custom DB abstraction).

**Tech Stack:** Next.js 16+, React 19, Cloudflare D1, @opennextjs/cloudflare, Leaflet.js, ApexCharts (react-apexcharts), xlsx, lucide-react, Vanilla CSS, pnpm

## Global Constraints

- Package manager: pnpm
- No ORM — raw SQL with parameterized queries
- IDs: timestamp-based strings (e.g., `user-{timestamp}-{random}`, `att-{timestamp}`)
- DB columns: snake_case. TypeScript: camelCase with mapper functions
- Session cookie: `eattendance_session`, HMAC-SHA256 signed, 12h TTL
- Shared cookie: `iiumh_session`, base64 JSON, 24h TTL, `Domain=iiumholdings.com.my`
- Admin email: `hafiffi@iiumholdings.com.my`
- All timestamps stored as UTC ISO strings in D1
- Vanilla CSS only (no Tailwind) — square UI, light mode, Inter font
- Follow budget-tracker file patterns: `src/lib/auth.ts`, `src/lib/db.ts`, `src/lib/store.ts`, `src/app/actions.ts`
- Path alias: `@/*` → `./src/*`

---

### Task 1: Project Scaffolding & Configuration

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `next.config.ts`
- Create: `open-next.config.ts`
- Create: `wrangler.jsonc`
- Create: `postcss.config.mjs` (empty — no Tailwind)
- Create: `.gitignore`
- Create: `eslint.config.mjs`

**Interfaces:**
- Produces: Project skeleton that all subsequent tasks build upon. `pnpm dev` runs successfully with an empty page.

- [ ] **Step 1: Initialize the project directory and create `package.json`**

```json
{
  "name": "e-attendance",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "EATTENDANCE_FORCE_LOCAL_DB=1 next build",
    "start": "next start",
    "lint": "eslint .",
    "db:reset": "node scripts/reset-db.mjs",
    "cf:build": "EATTENDANCE_FORCE_LOCAL_DB=1 opennextjs-cloudflare build",
    "cf:preview": "EATTENDANCE_FORCE_LOCAL_DB=1 opennextjs-cloudflare build && wrangler dev",
    "cf:deploy": "EATTENDANCE_FORCE_LOCAL_DB=1 opennextjs-cloudflare build && opennextjs-cloudflare deploy"
  },
  "dependencies": {
    "next": "^16.1.7",
    "react": "^19.2.0",
    "react-dom": "^19.2.0",
    "lucide-react": "^0.500.0",
    "xlsx": "^0.18.5",
    "apexcharts": "^4.7.0",
    "react-apexcharts": "^1.7.0",
    "leaflet": "^1.9.4"
  },
  "devDependencies": {
    "@opennextjs/cloudflare": "^1.17.1",
    "@types/node": "^25.5.0",
    "@types/react": "^19.2.14",
    "@types/react-dom": "^19.2.3",
    "@types/leaflet": "^1.9.18",
    "eslint": "^9.39.1",
    "eslint-config-next": "^16.1.7",
    "opennextjs-cloudflare": "^1.0.0",
    "typescript": "^5.9.3",
    "wrangler": "^4.75.0"
  }
}
```

- [ ] **Step 2: Create `tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2017",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": false,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "react-jsx",
    "incremental": true,
    "plugins": [{ "name": "next" }],
    "paths": { "@/*": ["./src/*"] }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts", ".next/dev/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

- [ ] **Step 3: Create `next.config.ts`**

```typescript
import type { NextConfig } from "next";
import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";

if (process.env.NODE_ENV === "development") {
  initOpenNextCloudflareForDev();
}

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: "2mb",
    },
  },
  turbopack: {
    root: process.cwd(),
  },
};

export default nextConfig;
```

- [ ] **Step 4: Create `open-next.config.ts`**

```typescript
import { defineCloudflareConfig } from "@opennextjs/cloudflare";
export default defineCloudflareConfig({});
```

- [ ] **Step 5: Create `wrangler.jsonc`**

```jsonc
{
  "$schema": "node_modules/wrangler/config-schema.json",
  "name": "e-attendance",
  "main": ".open-next/worker.js",
  "workers_dev": true,
  "preview_urls": true,
  "compatibility_date": "2026-06-30",
  "compatibility_flags": ["nodejs_compat"],
  "assets": {
    "binding": "ASSETS",
    "directory": ".open-next/assets"
  },
  "observability": { "enabled": true },
  "routes": [
    { "pattern": "attendance.iiumholdings.com.my", "custom_domain": true }
  ],
  "d1_databases": [
    {
      "binding": "DB",
      "database_name": "e-attendance-prod",
      "database_id": "REPLACE_WITH_ACTUAL_D1_ID",
      "remote": true
    }
  ]
}
```

- [ ] **Step 6: Create `.gitignore`**

```
node_modules/
.next/
.open-next/
.wrangler/
data/
*.tsbuildinfo
next-env.d.ts
.DS_Store
```

- [ ] **Step 7: Create `eslint.config.mjs`**

```javascript
import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const compat = new FlatCompat({ baseDirectory: __dirname });

const eslintConfig = [
  ...compat.extends("next/core-web-vitals"),
  { ignores: [".next/", ".open-next/", ".wrangler/", "data/"] },
];

export default eslintConfig;
```

- [ ] **Step 8: Create `scripts/reset-db.mjs`**

```javascript
import { unlinkSync, existsSync } from "fs";
const dbPath = "data/attendance.sqlite";
if (existsSync(dbPath)) {
  unlinkSync(dbPath);
  console.log("Deleted", dbPath);
} else {
  console.log("No database file found at", dbPath);
}
```

- [ ] **Step 9: Run `pnpm install`**

Run: `cd /Users/hafism/Project/Koding/e-attendance && pnpm install`
Expected: Dependencies installed, `pnpm-lock.yaml` created.

- [ ] **Step 10: Commit**

```bash
git init
git add -A
git commit -m "chore: scaffold e-attendance project"
```

---

### Task 2: Database Schema & Migration + DB Abstraction

**Files:**
- Create: `migrations/0001_initial.sql`
- Create: `src/lib/db.ts`
- Create: `src/lib/types.ts`

**Interfaces:**
- Produces: `getDb(): Promise<DatabaseClient>` — async database accessor used by all store/action code. `DatabaseClient` with `one()`, `all()`, `run()`, `exec()` methods. All TypeScript types for User, AttendanceLog, Setting, Session.

- [ ] **Step 1: Create `migrations/0001_initial.sql`**

```sql
-- Users table
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'user',
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Attendance logs table
CREATE TABLE IF NOT EXISTS attendance_logs (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  event_type TEXT NOT NULL,
  attendance_type TEXT NOT NULL DEFAULT 'office',
  latitude REAL,
  longitude REAL,
  address TEXT,
  note TEXT,
  photo_url TEXT,
  is_outside_geofence INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Settings table (key-value)
CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Sessions table
CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Indices
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_attendance_user_date ON attendance_logs(user_id, created_at);
CREATE INDEX IF NOT EXISTS idx_attendance_date ON attendance_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);

-- Default settings
INSERT OR IGNORE INTO settings (key, value) VALUES
  ('geofence_enabled', 'true'),
  ('geofence_locations', '[{"name":"IIUM Holdings HQ","lat":3.2516,"lng":101.7340,"radius":500}]'),
  ('selfie_enabled', 'false'),
  ('auto_clockout_reminder_enabled', 'true'),
  ('auto_clockout_reminder_time', '20:00');
```

- [ ] **Step 2: Create `src/lib/types.ts`**

Define all TypeScript types:
- `User` — id, email, name, role, isActive, createdAt, updatedAt
- `AttendanceLog` — id, userId, eventType, attendanceType, latitude, longitude, address, note, photoUrl, isOutsideGeofence, createdAt
- `Setting` — key, value, updatedAt
- `ClockState` — 'idle' | 'working' | 'on_break'
- `EventType` — 'clock_in' | 'break_start' | 'break_end' | 'clock_out'
- `AttendanceType` — 'office' | 'wfh' | 'client_site' | 'field_work'
- `UserRole` — 'admin' | 'hr' | 'user'
- `FormActionState` — { status, message?, updatedAt? }
- `GeofenceLocation` — { name, lat, lng, radius }
- `DailyAttendanceSummary`, `AttendanceStats` for dashboard

- [ ] **Step 3: Create `src/lib/db.ts`**

Follow budget-tracker's pattern exactly:
- `DatabaseClient` interface with `one<T>()`, `all<T>()`, `run()`, `exec()` methods
- Local mode: uses `node:sqlite` `DatabaseSync` (wraps sync → async)
- D1 mode: uses Cloudflare D1 binding from `getCloudflareContext()`
- Detection: `EATTENDANCE_FORCE_LOCAL_DB=1` env var or `NEXT_PHASE=phase-production-build` → local; `CF_PAGES=1` → D1
- `getDb()` initializes schema from migration file on first call
- Uses `globalThis.__eattendanceReady__` promise to prevent duplicate init
- Default local path: `data/attendance.sqlite`

- [ ] **Step 4: Verify DB initializes**

Create a minimal `src/app/layout.tsx` and `src/app/page.tsx` that calls `getDb()` and renders "DB OK".

Run: `pnpm dev`
Expected: Page loads, database file created at `data/attendance.sqlite` with all tables.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: add database schema, migration, and DB abstraction"
```

---

### Task 3: Auth System — OAuth Routes, Sessions, Middleware

**Files:**
- Create: `src/lib/auth.ts`
- Create: `src/app/api/auth/login/route.ts`
- Create: `src/app/api/auth/callback/route.ts`
- Create: `src/app/api/auth/logout/route.ts`
- Create: `src/app/api/dev-login/route.ts`
- Create: `src/middleware.ts`

**Interfaces:**
- Consumes: `getDb()` from `src/lib/db.ts`, `User` type from `src/lib/types.ts`
- Produces:
  - `getCurrentUser(): Promise<User | null>` — reads session cookies, returns user or null
  - `requireUser(): Promise<User>` — redirects to `/login` if no user
  - `requireAnyRole(roles: UserRole[]): Promise<User>` — role enforcement, redirects if unauthorized
  - `createSession(userId: string): Promise<void>` — sets both cookies
  - `clearSession(): Promise<void>` — clears both cookies
  - `authenticateUserByEmail(email: string, name: string): Promise<User>` — find-or-create user by email

- [ ] **Step 1: Create `src/lib/auth.ts`**

Following budget-tracker's auth.ts pattern:

```typescript
// Constants
const SESSION_COOKIE = "eattendance_session";
const SHARED_COOKIE = "iiumh_session";
const SESSION_TTL_MS = 12 * 60 * 60 * 1000; // 12 hours
const SHARED_TTL_S = 86400; // 24 hours
const ADMIN_EMAILS = ["hafiffi@iiumholdings.com.my"];

// getAuthSecret() — reads AUTH_SECRET env, fallback for dev
// signToken(payload) — HMAC-SHA256 sign: base64url(payload) + "." + base64url(signature)
// verifyToken(token) — verify signature, check expiry
// createSession(userId) — insert into sessions table, set both cookies via cookies()
// clearSession() — delete both cookies, remove session from DB
// getCurrentUser() — check iiumh_session first (cross-app SSO), then eattendance_session
// authenticateUserByEmail(email, name) — find or create user, admin emails get role 'admin'
// requireUser() — getCurrentUser() or redirect to /login
// requireAnyRole(roles) — requireUser() then check role, redirect if unauthorized
```

Key: `authenticateUserByEmail` auto-assigns `role: 'admin'` for emails in `ADMIN_EMAILS`, otherwise `role: 'user'`. All users are `is_active: 1` on creation.

- [ ] **Step 2: Create `src/app/api/auth/login/route.ts`**

```typescript
import { NextResponse } from "next/server";

export async function GET() {
  const clientId = process.env.MICROSOFT_CLIENT_ID || "556e4561-38a4-4607-a86f-10c54da66f99";
  const tenantId = process.env.MICROSOFT_TENANT_ID || "873d6357-a4ee-4e66-a928-0a973dcd8c67";
  const redirectUri = process.env.MICROSOFT_REDIRECT_URI || "http://localhost:3000/api/auth/callback";

  const params = new URLSearchParams({
    client_id: clientId,
    response_type: "code",
    redirect_uri: redirectUri,
    scope: "openid profile email User.Read",
    response_mode: "query",
  });

  const authUrl = `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/authorize?${params}`;
  return NextResponse.redirect(authUrl);
}
```

- [ ] **Step 3: Create `src/app/api/auth/callback/route.ts`**

Following budget-tracker's `microsoft-callback/route.ts`:
1. Read `code` from query params
2. Exchange code for access token using `client_secret` (POST to token endpoint)
3. Fetch user profile from `https://graph.microsoft.com/v1.0/me`
4. Call `authenticateUserByEmail(email, displayName)`
5. Call `createSession(user.id)`
6. Redirect to `/`

- [ ] **Step 4: Create `src/app/api/auth/logout/route.ts`**

```typescript
import { NextResponse } from "next/server";
import { clearSession } from "@/lib/auth";

export async function GET(request: Request) {
  await clearSession();
  return NextResponse.redirect(new URL("/login", request.url));
}
```

- [ ] **Step 5: Create `src/app/api/dev-login/route.ts`**

Localhost-only dev bypass: auto-creates admin user, creates session, redirects to `/`.

- [ ] **Step 6: Create `src/middleware.ts`**

```typescript
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const PUBLIC_ROUTES = ["/login", "/api/auth", "/api/dev-login"];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (PUBLIC_ROUTES.some((r) => pathname.startsWith(r))) return NextResponse.next();
  if (pathname.startsWith("/_next") || pathname.includes("favicon.ico")) return NextResponse.next();

  const sessionToken = request.cookies.get("eattendance_session")?.value;
  const sharedSession = request.cookies.get("iiumh_session")?.value;
  if (!sessionToken && !sharedSession) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  const response = NextResponse.next();
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  return response;
}

export const config = {
  matcher: ["/((?!api/|_next/static|_next/image|favicon.ico).*)"],
};
```

- [ ] **Step 7: Verify auth flow**

Run: `pnpm dev`, navigate to `http://localhost:3000/api/dev-login`
Expected: Auto-login as admin, redirect to `/`, session cookie set.

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "feat: add Microsoft OAuth auth system with SSO"
```

---

### Task 4: Global CSS Design System

**Files:**
- Create: `src/styles/globals.css`

**Interfaces:**
- Produces: Complete CSS design system with all tokens, component classes, and responsive utilities. Used by all components.

- [ ] **Step 1: Create `src/styles/globals.css`**

Complete vanilla CSS design system:

```css
/* Google Fonts — Inter */
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');

/* ===== DESIGN TOKENS ===== */
:root {
  /* Colors */
  --color-bg: #FFFFFF;
  --color-bg-secondary: #F5F5F5;
  --color-bg-tertiary: #FAFAFA;
  --color-text: #1A1A1A;
  --color-text-secondary: #6B7280;
  --color-text-tertiary: #9CA3AF;
  --color-border: #E5E7EB;
  --color-border-hover: #D1D5DB;

  --color-primary: #2563EB;
  --color-primary-hover: #1D4ED8;
  --color-primary-light: #EFF6FF;

  --color-success: #16A34A;
  --color-success-light: #F0FDF4;
  --color-danger: #DC2626;
  --color-danger-light: #FEF2F2;
  --color-warning: #D97706;
  --color-warning-light: #FFFBEB;
  --color-info: #2563EB;
  --color-info-light: #EFF6FF;

  /* Typography */
  --font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
  --font-size-xs: 0.75rem;
  --font-size-sm: 0.875rem;
  --font-size-base: 1rem;
  --font-size-lg: 1.125rem;
  --font-size-xl: 1.25rem;
  --font-size-2xl: 1.5rem;
  --font-size-3xl: 1.875rem;

  /* Spacing (8px grid) */
  --space-1: 0.25rem;
  --space-2: 0.5rem;
  --space-3: 0.75rem;
  --space-4: 1rem;
  --space-5: 1.25rem;
  --space-6: 1.5rem;
  --space-8: 2rem;
  --space-10: 2.5rem;
  --space-12: 3rem;

  /* Square UI */
  --radius: 2px;
  --shadow-sm: 0 1px 2px rgba(0,0,0,0.05);
  --shadow: 0 1px 3px rgba(0,0,0,0.08);
  --shadow-md: 0 4px 6px rgba(0,0,0,0.07);
  --shadow-lg: 0 10px 15px rgba(0,0,0,0.1);

  /* Transitions */
  --transition-fast: 150ms ease;
  --transition-base: 200ms ease;
  --transition-slow: 300ms ease;
}

/* ===== RESET & BASE ===== */
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
html { font-size: 16px; -webkit-font-smoothing: antialiased; }
body {
  font-family: var(--font-family);
  color: var(--color-text);
  background: var(--color-bg);
  line-height: 1.5;
}

/* ... (cards, buttons, inputs, tables, badges, layout utilities,
   sidebar, header, stat-card, timeline, map-container, chart-container,
   clock-panel, geofence-warning, responsive breakpoints, animations) ... */
```

This file will be 400-500 lines covering:
- Cards (`.card`, `.card-header`, `.card-body`)
- Buttons (`.btn`, `.btn-primary`, `.btn-success`, `.btn-danger`, `.btn-warning`, `.btn-outline`, `.btn-lg`, `.btn-icon`)
- Inputs (`.input`, `.select`, `.textarea`, `.label`, `.form-group`)
- Tables (`.table`, `.table-header`, `.table-row`, `.table-cell`)
- Badges (`.badge`, `.badge-success`, `.badge-danger`, `.badge-warning`)
- Layout (`.container`, `.grid`, `.flex`, `.sidebar-layout`)
- Stats card (`.stat-card`, `.stat-value`, `.stat-label`)
- Timeline (`.timeline`, `.timeline-item`, `.timeline-dot`)
- Clock panel (`.clock-panel`, `.clock-btn`, `.clock-btn-large`)
- Map (`.map-container`)
- Charts (`.chart-container`)
- Geofence warning (`.geofence-warning`)
- Responsive (mobile-first breakpoints)
- Animations (`@keyframes fadeIn`, `slideUp`, `pulse`)

- [ ] **Step 2: Commit**

```bash
git add -A
git commit -m "feat: add global CSS design system — square UI, light mode, Inter font"
```

---

### Task 5: Login Page & Root Layout

**Files:**
- Modify: `src/app/layout.tsx`
- Create: `src/app/login/page.tsx`

**Interfaces:**
- Consumes: `globals.css` design system, `getCurrentUser()` from auth
- Produces: Root layout wrapping all pages (Inter font, metadata). Login page with Microsoft sign-in button.

- [ ] **Step 1: Update `src/app/layout.tsx`**

```tsx
import type { Metadata } from "next";
import "@/styles/globals.css";

export const metadata: Metadata = {
  title: "e-Attendance — Clock In/Out",
  description: "Employee attendance tracking system for IIUM Holdings",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
```

- [ ] **Step 2: Create `src/app/login/page.tsx`**

Server Component. Checks if already logged in → redirect to `/`. Otherwise renders:
- Centered card with app logo/name "e-Attendance"
- "Sign in with Microsoft" button linking to `/api/auth/login`
- Microsoft logo icon
- Clean, minimal design using `.card` and `.btn-primary` classes

- [ ] **Step 3: Verify login page renders**

Run: `pnpm dev`, navigate to `http://localhost:3000/login`
Expected: Login page with Microsoft button renders correctly.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat: add root layout and login page"
```

---

### Task 6: Store Layer — Data Access Functions

**Files:**
- Create: `src/lib/store.ts`
- Create: `src/lib/geofence.ts`
- Create: `src/lib/utils.ts`

**Interfaces:**
- Consumes: `getDb()` from `db.ts`, all types from `types.ts`
- Produces:
  - `getUserById(id)`, `getUserByEmail(email)`, `listUsers()`, `updateUserRole()`, `toggleUserActive()`
  - `createAttendanceLog(data)`, `getUserLogsForDate(userId, date)`, `getUserLogs(userId, filters)`, `getAllLogs(filters)`, `getCurrentClockState(userId)`
  - `getSetting(key)`, `setSetting(key, value)`, `getAllSettings()`
  - `getDailyStats(date)`, `getAttendanceStats(dateRange)`, `getActiveEmployees()`
  - Mapper functions: `mapUser()`, `mapAttendanceLog()`, `mapSetting()`

- [ ] **Step 1: Create `src/lib/utils.ts`**

```typescript
export function generateId(prefix: string): string {
  const rand = Math.random().toString(36).substring(2, 8);
  return `${prefix}-${Date.now()}-${rand}`;
}

export function formatDateISO(date: Date): string {
  return date.toISOString().split("T")[0];
}

export function todayUTC(): string {
  return formatDateISO(new Date());
}
```

- [ ] **Step 2: Create `src/lib/geofence.ts`**

```typescript
import type { GeofenceLocation } from "./types";

// Haversine formula — distance between two lat/lng points in meters
export function haversineDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000; // Earth radius in meters
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function toRad(deg: number): number { return deg * (Math.PI / 180); }

// Check if a point is inside ANY of the configured geofence locations
export function checkGeofence(lat: number, lng: number, locations: GeofenceLocation[]): { isOutside: boolean; nearestName: string; distance: number } {
  // ... find nearest location, return whether outside + distance
}
```

- [ ] **Step 3: Create `src/lib/store.ts`**

Following budget-tracker's store.ts pattern. All data access in one file with mapper functions. ~300 lines covering:

- User CRUD: `getUserById`, `getUserByEmail`, `createUser`, `updateUserRole`, `toggleUserActive`, `listUsers`
- Attendance: `createAttendanceLog`, `getCurrentClockState` (derive from latest event today), `getUserLogsForDate`, `getUserLogs` (with date range filter), `getAllLogs` (admin, with user filter + date range), `getLogById`
- Settings: `getSetting`, `setSetting`, `getAllSettings`
- Stats: `getDailyStats` (count by event type for a date), `getAttendanceStats` (aggregated over date range), `getActiveEmployees` (users with clock_in today and no clock_out)
- Mappers: `mapUser(row)`, `mapAttendanceLog(row)`, `mapSetting(row)`

All queries use parameterized SQL (`?` placeholders).

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat: add store layer, geofence utils, and data access functions"
```

---

### Task 7: Server Actions — Clock In/Out, Users, Settings

**Files:**
- Create: `src/app/actions.ts`

**Interfaces:**
- Consumes: `requireUser()`, `requireAnyRole()` from auth, all store functions, `checkGeofence()`, types
- Produces:
  - `clockAction(state, formData)` — handles clock_in, break_start, break_end, clock_out
  - `updateUserRoleAction(state, formData)` — admin assigns HR role
  - `toggleUserActiveAction(state, formData)` — admin deactivates user
  - `updateSettingAction(state, formData)` — admin updates settings
  All return `FormActionState`.

- [ ] **Step 1: Create `src/app/actions.ts`**

Single `"use server"` file following budget-tracker's pattern:

```typescript
"use server";

import { revalidatePath } from "next/cache";
import { requireUser, requireAnyRole } from "@/lib/auth";
import { createAttendanceLog, getCurrentClockState, getSetting, setSetting, updateUserRole, toggleUserActive } from "@/lib/store";
import { checkGeofence } from "@/lib/geofence";
import type { FormActionState, GeofenceLocation } from "@/lib/types";

function toActionError(error: unknown, fallback: string): FormActionState {
  if (error instanceof Error) return { status: "error", message: error.message };
  return { status: "error", message: fallback };
}

export async function clockAction(_prev: FormActionState, formData: FormData): Promise<FormActionState> {
  try {
    const user = await requireUser();
    const eventType = formData.get("eventType") as string;
    const attendanceType = (formData.get("attendanceType") as string) || "office";
    const latitude = parseFloat(formData.get("latitude") as string) || null;
    const longitude = parseFloat(formData.get("longitude") as string) || null;
    const note = (formData.get("note") as string) || null;
    const photoUrl = (formData.get("photoUrl") as string) || null;

    // Validate state machine
    const currentState = await getCurrentClockState(user.id);
    // ... validate eventType is valid for currentState

    // Check geofence
    let isOutsideGeofence = false;
    if (latitude && longitude) {
      const geofenceEnabled = await getSetting("geofence_enabled");
      if (geofenceEnabled === "true") {
        const locationsJson = await getSetting("geofence_locations");
        const locations: GeofenceLocation[] = JSON.parse(locationsJson || "[]");
        const result = checkGeofence(latitude, longitude, locations);
        isOutsideGeofence = result.isOutside;
      }
    }

    await createAttendanceLog({
      userId: user.id, eventType, attendanceType,
      latitude, longitude, note, photoUrl, isOutsideGeofence,
    });

    revalidatePath("/");
    return {
      status: "success",
      message: isOutsideGeofence
        ? `${eventType.replace("_", " ")} recorded. ⚠️ You are outside the office perimeter.`
        : `${eventType.replace("_", " ")} recorded successfully.`,
      updatedAt: Date.now(),
    };
  } catch (error) {
    return toActionError(error, "Unable to record attendance.");
  }
}

// updateUserRoleAction, toggleUserActiveAction, updateSettingAction follow same pattern
```

- [ ] **Step 2: Commit**

```bash
git add -A
git commit -m "feat: add server actions for clock, user management, and settings"
```

---

### Task 8: User Dashboard — Clock In/Out Panel + Timeline

**Files:**
- Create: `src/app/page.tsx`
- Create: `src/components/header.tsx`
- Create: `src/components/clock-panel.tsx`
- Create: `src/components/attendance-timeline.tsx`
- Create: `src/components/geofence-warning.tsx`

**Interfaces:**
- Consumes: `requireUser()`, `getCurrentClockState()`, `getUserLogsForDate()`, `getAllSettings()` from store
- Produces: Main user dashboard page at `/` with clock buttons, timeline, and geofence warning.

- [ ] **Step 1: Create `src/components/header.tsx`**

App header bar with:
- Left: App name "e-Attendance" with clock icon
- Right: User name, role badge, navigation links (My Logs, Admin if admin/hr), logout button
- Uses `.header` CSS class — white bg, bottom border, sticky top

- [ ] **Step 2: Create `src/components/geofence-warning.tsx`**

Client component (`"use client"`):
- Yellow warning banner with triangle icon
- Text: "You are clocking in outside the office perimeter"
- Shows when `isOutsideGeofence` prop is true
- Animated slide-down entrance

- [ ] **Step 3: Create `src/components/clock-panel.tsx`**

Client component (`"use client"`):
- Shows current clock state with large status text and color indicator
- Large square clock buttons based on current state:
  - IDLE → "Clock In" (green button)
  - WORKING → "Start Break" (amber) + "Clock Out" (red)
  - ON_BREAK → "End Break" (blue)
- Attendance type selector (dropdown, default: Office) — shown on clock-in
- Notes text input (optional)
- Selfie capture button (shown only if selfie enabled)
- GPS coordinates captured automatically via `navigator.geolocation.getCurrentPosition()`
- Uses `useActionState` with `clockAction`
- Shows loading state while submitting
- Shows geofence warning on response if flagged

- [ ] **Step 4: Create `src/components/attendance-timeline.tsx`**

Server component:
- Vertical timeline of today's clock events
- Each item: event icon (colored dot), event name, timestamp (formatted in MYT), note if present
- Empty state: "No activity today"

- [ ] **Step 5: Create `src/app/page.tsx`**

Server Component — main user dashboard:

```tsx
import { requireUser } from "@/lib/auth";
import { getCurrentClockState, getUserLogsForDate, getAllSettings } from "@/lib/store";
import { Header } from "@/components/header";
import { ClockPanel } from "@/components/clock-panel";
import { AttendanceTimeline } from "@/components/attendance-timeline";

export default async function DashboardPage() {
  const user = await requireUser();
  const clockState = await getCurrentClockState(user.id);
  const todayLogs = await getUserLogsForDate(user.id, todayUTC());
  const settings = await getAllSettings();

  return (
    <>
      <Header user={user} />
      <main className="container">
        <div className="grid grid-2-col">
          <ClockPanel
            currentState={clockState}
            selfieEnabled={settings.selfie_enabled === "true"}
            geofenceEnabled={settings.geofence_enabled === "true"}
          />
          <AttendanceTimeline logs={todayLogs} />
        </div>
      </main>
    </>
  );
}
```

- [ ] **Step 6: Verify dashboard renders**

Run: `pnpm dev`, login via dev-login, check clock panel renders.
Expected: Clock in button visible, timeline shows "No activity today".

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat: add user dashboard with clock panel and timeline"
```

---

### Task 9: Map Component (Leaflet)

**Files:**
- Create: `src/components/map-view.tsx`

**Interfaces:**
- Consumes: Leaflet library, GPS coordinates
- Produces: `MapView` client component with props: `markers: { lat, lng, label, color }[]`, `center`, `geofenceCircles`

- [ ] **Step 1: Create `src/components/map-view.tsx`**

Client component (`"use client"`):
- Dynamic import of Leaflet (SSR-safe: `import dynamic from 'next/dynamic'` or `useEffect`)
- OpenStreetMap tile layer
- Markers for each provided location
- Geofence circle overlays (dashed border, semi-transparent fill)
- Click marker for popup with details
- Responsive container
- Must import leaflet CSS from CDN in component

- [ ] **Step 2: Add map to user dashboard**

Update `src/app/page.tsx` to include a mini map below the clock panel showing the user's last clock-in location.

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "feat: add Leaflet map component with geofence overlay"
```

---

### Task 10: My Logs Page — Personal Attendance History

**Files:**
- Create: `src/app/my-logs/page.tsx`
- Create: `src/components/attendance-table.tsx`

**Interfaces:**
- Consumes: `requireUser()`, `getUserLogs()` with date range filter from store
- Produces: `/my-logs` page with filterable attendance log table for the current user

- [ ] **Step 1: Create `src/components/attendance-table.tsx`**

Client component:
- Sortable, filterable data table
- Columns: Date, Clock In, Clock Out, Type, Break Duration, Total Hours, Location, Note, Status (geofence flag)
- Date range filter (from/to date inputs)
- Attendance type filter dropdown
- Pagination (20 per page)
- Geofence warning rows highlighted with amber background

- [ ] **Step 2: Create `src/app/my-logs/page.tsx`**

Server Component:
```tsx
export default async function MyLogsPage() {
  const user = await requireUser();
  // Read search params for date filters
  const logs = await getUserLogs(user.id, { startDate, endDate });
  return (
    <>
      <Header user={user} />
      <main className="container">
        <h1>My Attendance Logs</h1>
        <AttendanceTable logs={logs} showUserColumn={false} />
      </main>
    </>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "feat: add my-logs page with filterable attendance table"
```

---

### Task 11: Admin Layout & Sidebar

**Files:**
- Create: `src/app/admin/layout.tsx`
- Create: `src/components/sidebar.tsx`

**Interfaces:**
- Consumes: `requireAnyRole(["admin", "hr"])` from auth
- Produces: Admin layout with sidebar navigation wrapping all `/admin/*` pages

- [ ] **Step 1: Create `src/components/sidebar.tsx`**

Client component:
- Vertical sidebar with navigation links:
  - Dashboard (LayoutDashboard icon)
  - Attendance Logs (ClipboardList icon)
  - Live Map (Map icon)
  - Users (Users icon) — only shown for admin role
  - Settings (Settings icon) — only shown for admin role
- Active state highlighting
- Collapsible on mobile (hamburger menu)
- User info at bottom with role badge

- [ ] **Step 2: Create `src/app/admin/layout.tsx`**

```tsx
import { requireAnyRole } from "@/lib/auth";
import { Sidebar } from "@/components/sidebar";
import { Header } from "@/components/header";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await requireAnyRole(["admin", "hr"]);
  return (
    <>
      <Header user={user} />
      <div className="sidebar-layout">
        <Sidebar userRole={user.role} />
        <main className="sidebar-content">{children}</main>
      </div>
    </>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "feat: add admin layout with sidebar navigation"
```

---

### Task 12: Admin Dashboard — Stats & Charts

**Files:**
- Create: `src/app/admin/page.tsx`
- Create: `src/components/stats-card.tsx`
- Create: `src/components/charts/daily-attendance-chart.tsx`
- Create: `src/components/charts/attendance-type-chart.tsx`
- Create: `src/components/charts/clockin-distribution-chart.tsx`
- Create: `src/components/charts/weekly-trend-chart.tsx`
- Create: `src/components/charts/chart-wrapper.tsx`

**Interfaces:**
- Consumes: `requireAnyRole(["admin", "hr"])`, `getDailyStats()`, `getAttendanceStats()` from store
- Produces: Admin dashboard page with summary stat cards and ApexCharts analytics

- [ ] **Step 1: Create `src/components/charts/chart-wrapper.tsx`**

Client component wrapping ApexCharts with dynamic import (SSR-safe):
```tsx
"use client";
import dynamic from "next/dynamic";
const Chart = dynamic(() => import("react-apexcharts"), { ssr: false });
```

Provides shared ApexCharts config: square corners (borderRadius: 2), Inter font, light theme colors, responsive.

- [ ] **Step 2: Create `src/components/stats-card.tsx`**

```tsx
export function StatsCard({ label, value, icon, color, subtext }: StatsCardProps) {
  return (
    <div className="stat-card">
      <div className="stat-icon" style={{ color }}>
        <Icon />
      </div>
      <div className="stat-value">{value}</div>
      <div className="stat-label">{label}</div>
      {subtext && <div className="stat-subtext">{subtext}</div>}
    </div>
  );
}
```

- [ ] **Step 3: Create chart components**

Each chart is a client component using `ChartWrapper`:

- `daily-attendance-chart.tsx` — Bar chart, 30 days of daily attendance count
- `attendance-type-chart.tsx` — Donut chart, breakdown by attendance type
- `clockin-distribution-chart.tsx` — Column chart, histogram of clock-in times by hour
- `weekly-trend-chart.tsx` — Line/area chart, weekly attendance percentage trend

All use square corners (borderRadius: 2), design system colors, and clean tooltips.

- [ ] **Step 4: Create `src/app/admin/page.tsx`**

Server Component:
```tsx
export default async function AdminDashboardPage() {
  const user = await requireAnyRole(["admin", "hr"]);
  const todayStats = await getDailyStats(todayUTC());
  const monthStats = await getAttendanceStats(last30Days());
  const activeEmployees = await getActiveEmployees();

  return (
    <div>
      <h1>Dashboard</h1>
      <div className="stats-grid">
        <StatsCard label="Clocked In Today" value={todayStats.clockedIn} icon={UserCheck} color="var(--color-success)" />
        <StatsCard label="On Break" value={todayStats.onBreak} icon={Coffee} color="var(--color-warning)" />
        <StatsCard label="WFH Today" value={todayStats.wfh} icon={Home} color="var(--color-info)" />
        <StatsCard label="Geofence Warnings" value={todayStats.geofenceWarnings} icon={AlertTriangle} color="var(--color-danger)" />
      </div>
      <div className="charts-grid">
        <DailyAttendanceChart data={monthStats.daily} />
        <AttendanceTypeChart data={monthStats.byType} />
        <ClockinDistributionChart data={monthStats.clockinTimes} />
        <WeeklyTrendChart data={monthStats.weeklyTrend} />
      </div>
    </div>
  );
}
```

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: add admin dashboard with stats and ApexCharts analytics"
```

---

### Task 13: Admin Logs Page + CSV/Excel Export

**Files:**
- Create: `src/app/admin/logs/page.tsx`
- Create: `src/app/api/export/attendance/route.ts`

**Interfaces:**
- Consumes: `requireAnyRole(["admin", "hr"])`, `getAllLogs()` from store, `AttendanceTable` component
- Produces: `/admin/logs` page showing all employee logs with export button

- [ ] **Step 1: Create `src/app/admin/logs/page.tsx`**

Server Component:
- Reuses `AttendanceTable` component with `showUserColumn={true}`
- Filter bar: date range, user search, attendance type, geofence warnings only
- "Export to Excel" button
- Shows all users' attendance logs

- [ ] **Step 2: Create `src/app/api/export/attendance/route.ts`**

GET endpoint:
- Auth check (admin or hr)
- Read filter params from query string
- Fetch logs from store
- Generate .xlsx file using `xlsx` library
- Return as file download response with proper Content-Disposition header

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "feat: add admin logs page with Excel export"
```

---

### Task 14: Admin Live Map Page

**Files:**
- Create: `src/app/admin/map/page.tsx`

**Interfaces:**
- Consumes: `requireAnyRole(["admin", "hr"])`, `getActiveEmployees()` from store, `MapView` component, `getAllSettings()` for geofence circles

- [ ] **Step 1: Create `src/app/admin/map/page.tsx`**

Server Component:
- Full-width map showing all currently clocked-in employees
- Each employee is a marker:
  - Green pin: currently working
  - Amber pin: on break
- Click marker → popup with name, clock-in time, attendance type
- Geofence circles rendered around configured office locations
- Stats bar above map: "X employees active, Y on break"
- Auto-refresh hint: "Refresh to update positions"

- [ ] **Step 2: Commit**

```bash
git add -A
git commit -m "feat: add admin live map page"
```

---

### Task 15: Admin Users Page

**Files:**
- Create: `src/app/admin/users/page.tsx`
- Create: `src/components/user-management.tsx`

**Interfaces:**
- Consumes: `requireAnyRole(["admin"])`, `listUsers()` from store, `updateUserRoleAction`, `toggleUserActiveAction` from actions

- [ ] **Step 1: Create `src/components/user-management.tsx`**

Client component:
- Table of all users: Name, Email, Role (badge), Status (active/inactive), Last Login, Actions
- Actions column:
  - "Make HR" / "Remove HR" button (for admin only)
  - "Deactivate" / "Activate" toggle
- Uses `useActionState` for role and status updates
- Search/filter by name or email
- Admin user (`hafiffi@iiumholdings.com.my`) cannot be demoted or deactivated

- [ ] **Step 2: Create `src/app/admin/users/page.tsx`**

```tsx
export default async function UsersPage() {
  const user = await requireAnyRole(["admin"]);
  const users = await listUsers();
  return (
    <div>
      <h1>User Management</h1>
      <UserManagement users={users} currentUserId={user.id} />
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "feat: add admin user management page"
```

---

### Task 16: Admin Settings Page

**Files:**
- Create: `src/app/admin/settings/page.tsx`
- Create: `src/components/settings-form.tsx`

**Interfaces:**
- Consumes: `requireAnyRole(["admin"])`, `getAllSettings()` from store, `updateSettingAction` from actions

- [ ] **Step 1: Create `src/components/settings-form.tsx`**

Client component:
- **Geofence Settings** section:
  - Enable/disable toggle
  - Office locations list (add/remove): name, lat, lng, radius
  - Mini map preview showing configured locations with circles
- **Selfie Settings** section:
  - Enable/disable toggle for selfie on clock-in
- **Auto Clock-Out Reminder** section:
  - Enable/disable toggle
  - Time input for reminder time (default 20:00)
- Save button per section
- Uses `useActionState` with `updateSettingAction`

- [ ] **Step 2: Create `src/app/admin/settings/page.tsx`**

```tsx
export default async function SettingsPage() {
  await requireAnyRole(["admin"]);
  const settings = await getAllSettings();
  return (
    <div>
      <h1>System Settings</h1>
      <SettingsForm settings={settings} />
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "feat: add admin settings page with geofence and feature toggles"
```

---

### Task 17: Selfie Capture Component

**Files:**
- Create: `src/components/selfie-capture.tsx`

**Interfaces:**
- Consumes: Browser `MediaDevices` API
- Produces: `SelfieCapture` client component that captures a photo from webcam, compresses to JPEG <200KB, and passes base64 data URI to parent via callback

- [ ] **Step 1: Create `src/components/selfie-capture.tsx`**

Client component (`"use client"`):
- "Take Selfie" button opens camera modal
- Uses `navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" } })`
- Live preview in `<video>` element
- "Capture" button draws current frame to `<canvas>`, converts to JPEG
- Compresses to max 200KB by reducing quality
- Shows captured photo preview with "Retake" option
- Returns base64 data URI via `onCapture(dataUri)` callback
- Handles permission denied gracefully

- [ ] **Step 2: Integrate into clock panel**

Update `src/components/clock-panel.tsx`:
- When `selfieEnabled` is true and event is `clock_in`, show SelfieCapture component
- Pass captured photo as `photoUrl` in form data

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "feat: add selfie capture component with webcam integration"
```

---

### Task 18: Auto Clock-Out Reminder

**Files:**
- Create: `src/components/clockout-reminder.tsx`

**Interfaces:**
- Consumes: Clock state, reminder settings
- Produces: Client component that shows browser notification if user hasn't clocked out by configured time

- [ ] **Step 1: Create `src/components/clockout-reminder.tsx`**

Client component (`"use client"`):
- Receives `clockState`, `reminderEnabled`, `reminderTime` as props
- If `clockState !== "idle"` and current time >= reminderTime:
  - Request Notification permission if not granted
  - Show browser notification: "Don't forget to clock out!"
  - Also show an in-page banner as fallback
- Uses `useEffect` + `setTimeout` to schedule check
- Re-checks every minute when active

- [ ] **Step 2: Add to user dashboard**

Update `src/app/page.tsx` to include `<ClockoutReminder>` component with settings props.

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "feat: add auto clock-out reminder with browser notifications"
```

---

### Task 19: Polish & Final Integration

**Files:**
- Modify: Various files for polish

**Interfaces:**
- Consumes: All previous tasks
- Produces: Polished, production-ready application

- [ ] **Step 1: Add favicon and meta tags**

Create a simple favicon. Update `layout.tsx` with Open Graph tags, viewport meta.

- [ ] **Step 2: Add loading and error states**

Create `src/app/loading.tsx` and `src/app/error.tsx` for Next.js built-in loading/error UI.

- [ ] **Step 3: Add empty states**

Ensure all tables and lists have proper empty states with icons and helpful messages.

- [ ] **Step 4: Mobile responsiveness pass**

Review all pages on mobile viewport (375px). Ensure:
- Clock panel buttons are full-width on mobile
- Sidebar collapses to hamburger menu
- Tables scroll horizontally
- Map takes full width

- [ ] **Step 5: Final CSS polish**

Review all components for:
- Consistent spacing (8px grid)
- Hover/focus states on all interactive elements
- Transitions/animations on state changes
- Square corners everywhere (border-radius: 2px)

- [ ] **Step 6: Verify full flow**

Run: `pnpm dev`
1. Login via dev-login
2. Clock in → verify GPS capture, timeline updates, map shows location
3. Start break → verify state change
4. End break → verify state change
5. Clock out → verify state change
6. Check `/my-logs` → verify history shows
7. Check `/admin` → verify charts render with data
8. Check `/admin/logs` → verify all logs show, export works
9. Check `/admin/map` → verify markers show
10. Check `/admin/users` → verify user list, role assignment
11. Check `/admin/settings` → verify geofence and feature toggles

- [ ] **Step 7: Final commit**

```bash
git add -A
git commit -m "feat: polish UI, add loading states, mobile responsiveness"
```
