# e-Attendance Portal

A modern, fast, and secure open-source employee attendance portal. This application allows employees to log their attendance (Clock In, Clock Out, Breaks) and includes advanced features like geofencing to ensure location-based compliance. 

Originally built for enterprise use on Cloudflare, this repository is fully decoupled and database-agnostic. It can be easily deployed to your own server, Docker, or Vercel, and supports traditional databases like PostgreSQL or MySQL using Drizzle ORM.

## ✨ Key Features

- **🔐 Microsoft Entra ID (Azure AD) Single Sign-On:** 
  - Secure, enterprise-grade authentication using the official Microsoft MSAL node flow.
  - Automatically provisions users upon their first login.
  - Role-based access control (Admin, HR, User) based on configured emails.

- **📸 Face Capture & Verification:**
  - Integrated camera support to capture a live photo of the employee when logging attendance.
  - Ensures proof of presence and prevents buddy-punching.
  - Photos are securely stored and viewable by HR in the logs dashboard.

- **📍 Advanced Geofencing & Location Tracking:** 
  - Restricts or flags clock-ins based on physical location.
  - Interactive Map interface in Settings allows administrators to draw complex polygons or circular geofences.
  - Automatically calculates distance and flags "Outside Geofence" attempts in real-time.
  - Captures high-accuracy GPS coordinates for every transaction (Clock In, Clock Out, Break Start, Break End).

- **🗺️ Live Activity & Tracking Map:** 
  - A real-time geospatial dashboard for administrators.
  - View exact locations where employees clocked in or went on break.
  - Features visual path tracing to map an employee's movement throughout the workday.
  - Custom color-coded map markers for different activity types.

- **📊 Comprehensive Analytics Dashboard:** 
  - Live statistical breakdowns tracking attendance categories (WFH, Office, Client Site, Field Work).
  - Daily active user trends mapped over a 7-day rolling window.
  - Automated anomaly detection highlighting out-of-bounds geofence warnings.

- **📑 Smart Export & Reporting:** 
  - Export attendance logs directly to Microsoft Excel (`.xlsx`) format.
  - Advanced filtering allows administrators to generate custom reports bounded by specific date ranges and individual users.

- **🎨 Modern "Square UI" Design:**
  - Premium, responsive frontend utilizing modern CSS variables and glassmorphism.
  - Mobile-first approach ensures the app works flawlessly on employee smartphones.

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

### 5. Deployment (Cloudflare)

Deployments to Cloudflare are handled via the OpenNext adapter. 

Before deploying, ensure you have set your `CLOUDFLARE_ACCOUNT_ID` environment variable in your terminal or CI/CD pipeline.

```bash
export CLOUDFLARE_ACCOUNT_ID="your-cloudflare-account-id"
pnpm run cf:deploy
```

## 🏗️ Hosting on Your Own Server (No Cloudflare Required)

This project is built on Next.js and Drizzle ORM, which means **Cloudflare is completely optional**. You can host this application on any standard Node.js server (VPS, AWS EC2, DigitalOcean), Docker container, or platform like Vercel, Render, or Railway.

### Using Your Preferred Database (PostgreSQL / MySQL)

Because this project uses Drizzle ORM, switching from Cloudflare D1 to a traditional database like **PostgreSQL** or **MySQL** is extremely straightforward.

1. **Install the required database driver:**
   ```bash
   # For PostgreSQL:
   pnpm add pg
   pnpm add -D @types/pg
   ```

2. **Update the Drizzle config (`drizzle.config.ts`):**
   Change the dialect to `postgresql` and provide your database URL connection string.

3. **Update Database Connection (`src/lib/db.ts`):**
   Replace the D1 specific code with standard PostgreSQL connection logic:
   ```typescript
   import { drizzle } from 'drizzle-orm/node-postgres';
   import { Pool } from 'pg';
   
   const pool = new Pool({ connectionString: process.env.DATABASE_URL });
   export const getDb = async () => drizzle(pool);
   ```

4. **Build and Deploy as a Standard Next.js App:**
   Once your database is configured, you can build and start the application normally without any Cloudflare dependencies:
   ```bash
   pnpm build
   pnpm start
   ```

