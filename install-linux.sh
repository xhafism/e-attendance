#!/bin/bash
set -e

echo "==============================================="
echo "     e-Attendance Linux Installer Wizard       "
echo "==============================================="
echo ""

# Check for Node.js
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js (v22.5.0+) and try again."
    exit 1
fi

NODE_VERSION=$(node -v | cut -d 'v' -f 2)
NODE_MAJOR=$(echo $NODE_VERSION | cut -d '.' -f 1)
NODE_MINOR=$(echo $NODE_VERSION | cut -d '.' -f 2)

if [ "$NODE_MAJOR" -lt 22 ] || ([ "$NODE_MAJOR" -eq 22 ] && [ "$NODE_MINOR" -lt 5 ]); then
    echo "⚠️  Warning: Node.js version is $NODE_VERSION. e-Attendance local database requires Node.js v22.5.0+ (node:sqlite)."
    echo "Please upgrade Node.js if the installation fails."
    echo ""
fi

echo "📦 Installing dependencies..."
npm install

echo ""
echo "🗄️  Setting up local SQLite database..."
export EATTENDANCE_FORCE_LOCAL_DB=1
mkdir -p data
# Run migrations on local DB
node -e "
const fs = require('fs');
const { DatabaseSync } = require('node:sqlite');
const db = new DatabaseSync('./data/attendance.sqlite');
const sql = fs.readFileSync('./migrations/0001_initial.sql', 'utf8');
db.exec(sql);
console.log('✅ Database migrated successfully.');
" || echo "⚠️ Database setup script failed (Are you on Node 22.5+?). Continuing anyway..."

echo ""
echo "🏗️  Building Next.js application..."
npm run build

echo ""
echo "🚀 Application is ready!"
echo "Would you like to install 'pm2' globally to keep the app running in the background? (y/n)"
read -r use_pm2

if [ "$use_pm2" = "y" ] || [ "$use_pm2" = "Y" ]; then
    echo "Installing PM2..."
    npm install -g pm2 || sudo npm install -g pm2
    
    echo "Starting app with PM2..."
    pm2 start npm --name "e-attendance" -- run start -- -p 3000
    pm2 save
    
    echo "==============================================="
    echo "   ✅ Installation Complete!                   "
    echo "   Your e-Attendance system is running on      "
    echo "   http://localhost:3000                       "
    echo "   Manage it using: pm2 status                 "
    echo "==============================================="
else
    echo "==============================================="
    echo "   ✅ Installation Complete!                   "
    echo "   To start the application, run:              "
    echo "   EATTENDANCE_FORCE_LOCAL_DB=1 npm run start  "
    echo "==============================================="
fi
