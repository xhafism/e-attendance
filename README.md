# e-Attendance Portal

A modern, fast, and secure open-source employee attendance portal. This application allows employees to log their attendance (Clock In, Clock Out, Breaks) and includes advanced features like geofencing to ensure location-based compliance. 

Originally built for enterprise use, this repository has been sanitized and generalized for public use.

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

## 🚀 Complete Setup Guide

To run this project yourself, you will need a Cloudflare account and a Microsoft Azure account (for Entra ID authentication).

### 1. Installation

Clone the repository and install dependencies using `pnpm`:

```bash
git clone https://github.com/your-username/e-attendance.git
cd e-attendance
pnpm install
```

### 2. Configure Environment Variables

Create a `.dev.vars` file in the root directory for local development. In production, these should be added as secrets in the Cloudflare dashboard.

```env
# Required for Authentication
AUTH_SECRET="your-random-32-character-secret"
ADMIN_EMAILS="admin@yourcompany.com,hr@yourcompany.com"

# Microsoft Entra ID (Azure AD) Settings
MSAL_CLIENT_ID="your-azure-app-client-id"
MSAL_CLIENT_SECRET="your-azure-app-client-secret"
MSAL_TENANT_ID="your-azure-tenant-id"

# Optional Settings
COOKIE_DOMAIN="yourcompany.com"
SHARED_COOKIE_NAME="custom_shared_session"
```

*Note: The system uses MSAL to handle logins. Ensure your Azure App Registration has the correct redirect URIs configured (e.g. `http://localhost:3000/api/auth/callback` and `https://yourdomain.com/api/auth/callback`).*

### 3. Database Setup (Cloudflare D1)

This project uses Cloudflare D1 (Serverless SQLite). You need to create a database and apply the schema migrations.

First, create a local database and apply migrations:
```bash
# Generate typescript definitions for DB
pnpm run cf:typegen

# Apply the SQL migrations locally
EATTENDANCE_FORCE_LOCAL_DB=1 pnpm wrangler d1 migrations apply e-attendance-prod --local
```

For production, you will need to create a D1 database on your Cloudflare account:
```bash
# Create the production database
pnpm wrangler d1 create e-attendance-prod
```
*After running this command, copy the generated `database_id` and update your `wrangler.jsonc` file with it.*

Then, apply the migrations to production:
```bash
pnpm wrangler d1 migrations apply e-attendance-prod --remote
```

### 4. Local Development

Run the development server locally:

```bash
pnpm dev
```
Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

### 5. Deployment

Deployments to Cloudflare are handled via the OpenNext adapter. 

Before deploying, ensure you have set your `CLOUDFLARE_ACCOUNT_ID` environment variable in your terminal or CI/CD pipeline.

```bash
export CLOUDFLARE_ACCOUNT_ID="your-cloudflare-account-id"
pnpm run cf:deploy
```

## Security & Privacy

This repository does **not** contain any hardcoded secrets. All sensitive keys (like Client Secrets and JWT signing keys) are loaded securely at runtime via environment variables. It is 100% safe for open-source use.
