# CJO GYM - Membership Management System

A complete web-based gym membership management system built with **Next.js 15** (App Router), **Prisma ORM**, and **PostgreSQL**. Ready for deployment on **Vercel**.

## Features

- 🖥️ **Kiosk Display** — Full-screen branded display for gym entrance with RFID/barcode scanner support
- 📊 **Admin Dashboard** — Comprehensive management panel with stats, charts, and recent activity
- 👥 **Member Management** — Register, view, edit, and renew memberships
- 🚶 **Walk-in Tracking** — Log and track daily walk-in guests
- 💰 **Revenue Tracking** — Daily and monthly revenue reports
- 📋 **Attendance Logs** — Check-in/check-out history with duration tracking
- 🔍 **Scanner Check** — Quick card lookup for admin use
- ⬇️ **Excel Import/Export** — Import and export member data via Excel/CSV

## Setup

### Prerequisites
- Node.js 18+
- npm
- PostgreSQL database (local or hosted, e.g. Neon, Supabase, Vercel Postgres)

### Installation

```bash
# 1. Install dependencies (this also auto-generates the Prisma client)
npm install

# 2. Copy environment file and configure your database URL
cp .env.example .env
# Edit .env and set DATABASE_URL to your PostgreSQL connection string

# 3. Push the Prisma schema to your database
npx prisma db push

# 4. Start development server
npm run dev
```

The app will be available at `http://localhost:3000`.

> **⚠️ Important:** You must run `npm install` before running `npm run dev` or `npm run build`.
> The Prisma client (`src/generated/prisma`) is auto-generated during install and is not committed to git.
> If you see `Module not found: Can't resolve '@/generated/prisma/client'`, run `npm install` or `npx prisma generate` to fix it.

## Deploying to Vercel

1. Push your code to a GitHub repository
2. Import the project in [Vercel](https://vercel.com)
3. Add the `DATABASE_URL` environment variable pointing to your PostgreSQL database
4. Deploy — Vercel will automatically run `prisma generate` during the build

### Recommended Database Providers
- [Neon](https://neon.tech) — Serverless PostgreSQL (free tier available)
- [Supabase](https://supabase.com) — PostgreSQL with extras (free tier available)
- [Vercel Postgres](https://vercel.com/docs/storage/vercel-postgres)

## Two-Monitor Setup

This system is designed for a two-monitor setup:

1. **Monitor 1 (Public/Entrance):** Open `http://localhost:3000/kiosk` — Full-screen kiosk display
   - Press F11 for full-screen mode in the browser
   - The scanner types the card UID and presses Enter automatically

2. **Monitor 2 (Admin/Front Desk):** Open `http://localhost:3000/admin/dashboard` — Management panel

## RFID/Barcode Scanner Setup

The system works with any RFID or barcode scanner that acts as a keyboard (HID device):
1. Connect the scanner to the computer
2. Open the kiosk page (`/kiosk`) on the entrance monitor
3. The hidden input field automatically captures scanner input
4. When a card is scanned, it processes the check-in or check-out

## Default Admin Access

No authentication is required by default. Access the admin panel at `/admin/dashboard`.

## Project Structure

```
src/
├── app/
│   ├── kiosk/          # Public kiosk display
│   ├── admin/          # Admin panel pages
│   │   ├── dashboard/
│   │   ├── members/
│   │   ├── walkins/
│   │   ├── revenue/
│   │   ├── logs/
│   │   └── scan/
│   └── api/            # REST API routes
├── lib/
│   ├── db.ts           # Prisma client singleton
│   └── dateUtils.ts    # Date utility functions
└── components/         # Shared UI components
prisma/
└── schema.prisma       # Database schema
public/uploads/members/ # Member photos (auto-created)
```

## Database

The app uses PostgreSQL via Prisma ORM. Set your `DATABASE_URL` in `.env` and run:

```bash
# Push schema to database (for initial setup or schema changes)
npx prisma db push

# Or create a migration (recommended for production)
npx prisma migrate dev --name init

# View and manage data in Prisma Studio
npx prisma studio
```

## Tech Stack

- **Framework:** Next.js 15 (App Router)
- **ORM:** Prisma 7
- **Database:** PostgreSQL
- **Styling:** Tailwind CSS
- **Language:** TypeScript
- **Deployment:** Vercel-ready

## Troubleshooting

### `Module not found: Can't resolve '@/generated/prisma/client'`

This means the Prisma client hasn't been generated yet. Fix it by running:

```bash
npm install
# or if dependencies are already installed:
npx prisma generate
```

The Prisma client is auto-generated code (located in `src/generated/prisma/`) and is not committed to git. It gets regenerated automatically during `npm install` (via the `postinstall` script) and during `npm run build`.

### `DATABASE_URL` not set

Copy the example env file and edit it with your PostgreSQL connection string:

```bash
cp .env.example .env
```

You need a PostgreSQL database. You can get a free one from [Neon](https://neon.tech), [Supabase](https://supabase.com), or use a local PostgreSQL installation.
