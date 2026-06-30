# e-attendance — Employee Clock In/Out System Design Spec

**Date**: 2026-06-30
**Author**: Brainstorming session
**Status**: Draft

---

## 1. Overview

A web application for employee attendance tracking with Microsoft SSO authentication. Employees clock in/out with GPS location logging, and Admin/HR users monitor attendance through a dashboard with analytics.

**Domain**: `attendance.iiumholdings.com.my` (planned)

---

## 2. Tech Stack

| Layer | Technology | Notes |
|-------|-----------|-------|
| Framework | Next.js (App Router, Server Components, Server Actions) | Same pattern as budget-tracker |
| Runtime | Cloudflare Workers via `@opennextjs/cloudflare` | |
| Database | Cloudflare D1 (SQLite) | New D1 database |
| Auth | Server-side Microsoft OAuth Authorization Code flow | Reuse Azure AD app `556e4561-38a4-4607-a86f-10c54da66f99` |
| Session | HMAC-SHA256 signed cookie `eattendance_session` + shared `iiumh_session` | Same pattern as budget-tracker |
| Maps | Leaflet.js + OpenStreetMap tiles | Free, no API key |
| Charts | ApexCharts | Modern, interactive |
| Styling | Vanilla CSS | Square UI, light mode, Inter font |
| Icons | Lucide React | |
| Export | xlsx library | CSV/Excel export |

---

## 3. Authentication & Authorization

### 3.1 Auth Flow

Reuse the server-side OAuth Authorization Code flow from budget-tracker:

1. User clicks "Sign in with Microsoft" on `/login`
2. Server redirects to Microsoft authorize endpoint (`response_type=code`)
3. Microsoft redirects back to `/api/auth/callback` with authorization code
4. Server exchanges code for access token using `client_secret`
5. Server fetches user profile from Microsoft Graph `/v1.0/me`
6. Server creates/updates user in D1 database
7. Server sets two cookies:
   - `eattendance_session`: HMAC-SHA256 signed, httpOnly, 12-hour TTL
   - `iiumh_session`: Base64-encoded JSON, shared across `*.iiumholdings.com.my`, 24-hour TTL

### 3.2 SSO Integration

The app checks for the existing `iiumh_session` cookie on load. If valid and not expired, auto-authenticate the user without requiring a new Microsoft login. This enables seamless navigation between portal, budget-tracker, and e-attendance.

### 3.3 Roles

| Role | Description | Auto-assigned |
|------|------------|---------------|
| `admin` | Full system access | `hafiffi@iiumholdings.com.my` only |
| `hr` | View all employee logs, export data, view dashboard | Assigned by admin |
| `user` | Clock in/out, view own logs | All other users |

### 3.4 User Approval

New users are created with `is_approved = 1` (auto-approved on first Microsoft login). Admin can deactivate users.

---

## 4. Database Schema (D1)

### 4.1 `users` table

```sql
CREATE TABLE users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'user',
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
```

### 4.2 `attendance_logs` table

```sql
CREATE TABLE attendance_logs (
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

CREATE INDEX idx_attendance_user_date ON attendance_logs(user_id, created_at);
CREATE INDEX idx_attendance_date ON attendance_logs(created_at);
```

### 4.3 `settings` table

```sql
CREATE TABLE settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
```

### 4.4 `sessions` table

```sql
CREATE TABLE sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
```

---

## 5. Clock State Machine

### 5.1 States

```
IDLE → clock_in → WORKING → break_start → ON_BREAK → break_end → WORKING → clock_out → IDLE
```

Rules:
- A user can only be in ONE state at a time
- State is derived from the most recent log entry for the current day
- `clock_in` is only valid from `IDLE`
- `break_start` is only valid from `WORKING`
- `break_end` is only valid from `ON_BREAK`
- `clock_out` is only valid from `WORKING`
- Each new day resets to `IDLE`

### 5.2 Attendance Types

- **Office** (default)
- **WFH**
- **Client Site**
- **Field Work**

Type is selected at clock-in time. Can be changed on clock-out.

### 5.3 Data Captured Per Event

| Field | Source | Required |
|-------|--------|----------|
| Timestamp | Server time (UTC) | Yes |
| GPS coordinates | Browser Geolocation API | Yes (with fallback) |
| Attendance type | User selection | Yes (default: Office) |
| Note | Text input | No |
| Photo | Webcam capture | Only if selfie enabled |
| Geofence status | Computed from GPS vs fence | Auto |

---

## 6. Geofencing

- Admin configures office locations with lat/lng + radius (meters)
- On each clock event, system computes distance from nearest configured office
- If distance > radius, log is flagged `is_outside_geofence = 1`
- **User sees**: Yellow warning banner "You are clocking in outside the office perimeter"
- **Admin/HR sees**: Flagged entries highlighted in logs with warning icon
- Geofencing is advisory only — does NOT block clock actions

---

## 7. Pages & Routes

### 7.1 Public Routes

| Route | Description |
|-------|-------------|
| `/login` | Microsoft sign-in page |
| `/api/auth/login` | Redirects to Microsoft authorize |
| `/api/auth/callback` | Handles OAuth callback |
| `/api/auth/logout` | Clears session cookies |

### 7.2 User Routes

| Route | Description |
|-------|-------------|
| `/` | Dashboard — clock in/out panel, today's timeline, mini map |
| `/my-logs` | Personal attendance history — calendar view, filters |

### 7.3 Admin/HR Routes

| Route | Access | Description |
|-------|--------|-------------|
| `/admin` | Admin, HR | Overview dashboard — stats, charts |
| `/admin/logs` | Admin, HR | All employee logs — search, filter, export |
| `/admin/map` | Admin, HR | Live map of clocked-in employees |
| `/admin/users` | Admin | User management — assign HR, activate/deactivate |
| `/admin/settings` | Admin | Geofence config, feature toggles |

---

## 8. UI Design System

### 8.1 Visual Language

- **Square UI**: `border-radius: 2px` globally
- **Light mode**: White (#FFFFFF) bg, light gray (#F5F5F5) cards, dark text (#1A1A1A)
- **Primary**: Blue (#2563EB)
- **Accents**: Green (#16A34A) clock-in, Red (#DC2626) clock-out, Amber (#D97706) warnings/break
- **Font**: Inter (Google Fonts), 400/500/600/700
- **Spacing**: 8px grid
- **Shadows**: `box-shadow: 0 1px 3px rgba(0,0,0,0.08)`
- **Borders**: 1px solid #E5E7EB

### 8.2 Responsive

- Mobile-first (clock in from phones)
- Breakpoints: 640px, 768px, 1024px, 1280px

---

## 9. Charts (Admin Dashboard)

ApexCharts with square corners and design system palette.

1. **Daily Attendance Bar Chart** — present/absent/late per day (30 days)
2. **Attendance Type Donut** — Office / WFH / Client Site / Field Work
3. **Clock-in Time Distribution** — histogram of clock-in times
4. **Weekly Trend Line** — attendance percentage over weeks
5. **Geofence Violations** — outside-perimeter count per day

### Summary Stats

- Total clocked in today
- Average clock-in time
- Currently on break
- Geofence warnings today
- WFH count today

---

## 10. Features Detail

### 10.1 Selfie Capture (Admin-togglable)

- Browser `getUserMedia` for webcam
- JPEG, compressed to max 200KB
- Stored as base64 in D1 (can migrate to R2 later)
- Only on `clock_in`
- Toggled in admin settings

### 10.2 Notes Field

- Optional, max 200 chars, on every clock event

### 10.3 Auto Clock-Out Reminder

- Client-side Notification API + setTimeout
- Triggers if still working/on-break after configured time (default 8PM)
- Admin configures reminder time

### 10.4 CSV/Excel Export

- On `/admin/logs`, uses `xlsx` library
- Respects applied filters
- Columns: Name, Email, Date, Clock In/Out times, Locations, Type, Break Duration, Total Hours, Notes, Geofence Warning

### 10.5 Map Features

- **User map**: Own clock-in location pin
- **Admin map**: All clocked-in employees as colored pins (Green=Working, Amber=Break)
- Click pin for details
- Geofence circle overlay

---

## 11. Environment Variables

```
MICROSOFT_CLIENT_ID=556e4561-38a4-4607-a86f-10c54da66f99
MICROSOFT_TENANT_ID=873d6357-a4ee-4e66-a928-0a973dcd8c67
MICROSOFT_CLIENT_SECRET=<secret>
MICROSOFT_REDIRECT_URI=https://attendance.iiumholdings.com.my/api/auth/callback
AUTH_SECRET=<random-32-char-for-hmac>
APP_URL=https://attendance.iiumholdings.com.my
```

---

## 12. Project Structure

```
e-attendance/
├── src/
│   ├── app/
│   │   ├── layout.tsx
│   │   ├── page.tsx                # User dashboard
│   │   ├── login/page.tsx
│   │   ├── my-logs/page.tsx
│   │   ├── admin/
│   │   │   ├── layout.tsx          # Admin sidebar layout
│   │   │   ├── page.tsx            # Admin dashboard
│   │   │   ├── logs/page.tsx
│   │   │   ├── map/page.tsx
│   │   │   ├── users/page.tsx
│   │   │   └── settings/page.tsx
│   │   └── api/auth/
│   │       ├── login/route.ts
│   │       ├── callback/route.ts
│   │       └── logout/route.ts
│   ├── lib/
│   │   ├── auth.ts
│   │   ├── db.ts
│   │   ├── geofence.ts
│   │   └── utils.ts
│   ├── actions/
│   │   ├── attendance.ts
│   │   ├── users.ts
│   │   └── settings.ts
│   ├── components/
│   │   ├── clock-panel.tsx
│   │   ├── attendance-timeline.tsx
│   │   ├── map-view.tsx
│   │   ├── attendance-table.tsx
│   │   ├── stats-card.tsx
│   │   ├── charts/
│   │   ├── sidebar.tsx
│   │   ├── header.tsx
│   │   ├── selfie-capture.tsx
│   │   └── geofence-warning.tsx
│   └── styles/globals.css
├── migrations/0001_initial.sql
├── wrangler.toml
├── open-next.config.ts
├── next.config.ts
├── tsconfig.json
└── package.json
```

---

## 13. Non-Functional Requirements

- Pages load within 2 seconds
- Mobile-first clock in/out
- httpOnly, secure, SameSite=Lax cookies
- Timestamps stored UTC, displayed in Malaysia Time (UTC+8)
- Attendance logs kept indefinitely
