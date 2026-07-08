#!/bin/bash
set -e

echo "==============================================="
echo "   e-Attendance Cloudflare Installer Wizard    "
echo "==============================================="
echo ""

# Check for Node.js
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js (v18+) and try again."
    exit 1
fi

echo "📦 Installing dependencies..."
npm install

echo ""
echo "🔑 We need to log in to Cloudflare to create and deploy the database."
echo "Running 'npx wrangler login'..."
npx wrangler login

echo ""
echo "s Preparing D1 Database..."
echo "Creating a new D1 database named 'e-attendance-db'..."
DB_OUTPUT=$(npx wrangler d1 create e-attendance-db || true)

# Extract database_id
DB_ID=$(echo "$DB_OUTPUT" | grep "database_id" | awk -F '"' '{print $4}' || true)

if [ -z "$DB_ID" ]; then
    echo "⚠️  Could not automatically extract database_id."
    echo "Please look at the output above and manually update 'wrangler.jsonc'."
    echo "Press Enter when you have updated wrangler.jsonc with your new database_id..."
    read -r
else
    echo "✅ Created D1 database with ID: $DB_ID"
    echo "Updating wrangler.jsonc..."
    # Replace the database_id in wrangler.jsonc
    sed -i.bak -e "s/\"database_id\": \".*\"/\"database_id\": \"$DB_ID\"/" wrangler.jsonc
    rm -f wrangler.jsonc.bak
fi

echo ""
echo "🗄️  Running database migrations..."
npx wrangler d1 execute e-attendance-db --file=migrations/0001_initial.sql --remote || true

echo ""
echo "🚀 Deploying to Cloudflare..."
npm run cf:deploy

echo ""
echo "==============================================="
echo "   ✅ Deployment Complete!                     "
echo "   Your e-Attendance system is now live on     "
echo "   Cloudflare Workers.                         "
echo "==============================================="
