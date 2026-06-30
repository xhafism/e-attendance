# IIUM Holdings e-Attendance Portal

A modern, fast, and secure employee attendance portal built for IIUM Holdings. This application allows employees to log their attendance (Clock In, Clock Out, Breaks) and includes advanced features like geofencing to ensure location-based compliance. 

## Features

- **Microsoft Entra ID (Azure AD) Authentication:** Secure single sign-on (SSO) integration using the official Microsoft MSAL node flow.
- **Geofencing & Location Tracking:** 
  - Restricts clock-ins to predefined office locations (using circles or complex polygons).
  - Flags "Outside Geofence" attempts automatically.
  - Interactive map in Settings allows HR to easily draw and adjust allowed zones.
- **Live Activity Map:** A real-time dashboard for administrators to view where employees clocked in or went on break, complete with a visual path history.
- **Comprehensive Analytics:** Live statistical dashboards for tracking attendance types (WFH, Office, Client Site, Field Work).
- **Excel Exports:** Advanced filtering allowing administrators to generate custom `.xlsx` reports by date range and specific users.

## Tech Stack

- **Framework:** Next.js 16+ (App Router)
- **Deployment:** Cloudflare Pages & Workers via `@opennextjs/cloudflare`
- **Database:** Cloudflare D1 (Serverless SQLite)
- **Map/Geofencing:** Leaflet & React-Leaflet
- **Styling:** Custom Modern Vanilla CSS with CSS Variables (Square UI/Dashboard 2 inspired theme)

## Development Setup

1. **Install Dependencies:**
   ```bash
   pnpm install
   ```

2. **Database Setup (Local):**
   ```bash
   pnpm run cf:typegen
   # Run migrations locally
   EATTENDANCE_FORCE_LOCAL_DB=1 pnpm wrangler d1 migrations apply e-attendance-prod --local
   ```

3. **Environment Variables:**
   Ensure your Cloudflare environment variables (`AUTH_SECRET`, MSAL Client Secrets, etc.) are configured in Cloudflare dash or a `.dev.vars` file for local development.

4. **Run Locally:**
   ```bash
   pnpm dev
   ```

## Deployment

Deployments to Cloudflare are handled via the OpenNext adapter.

```bash
pnpm run cf:deploy
```

## Security

This repository does **not** contain any hardcoded secrets. All sensitive keys (like Client Secrets and JWT signing keys) are loaded securely at runtime via environment variables (`process.env`). It is safe to push this repository to GitHub. 
