# CJO GYM - Membership Management System

A complete web-based gym membership management system built with **Next.js 14** (App Router) and **SQLite** (via `better-sqlite3`).

## Features

- 🖥️ **Kiosk Display** — Full-screen branded display for gym entrance with RFID/barcode scanner support
- 📊 **Admin Dashboard** — Comprehensive management panel with stats, charts, and recent activity
- 👥 **Member Management** — Register, view, edit, and renew memberships
- 🚶 **Walk-in Tracking** — Log and track daily walk-in guests
- 💰 **Revenue Tracking** — Daily and monthly revenue reports
- 📋 **Attendance Logs** — Check-in/check-out history with duration tracking
- 🔍 **Scanner Check** — Quick card lookup for admin use

## Setup

### Prerequisites
- Node.js 18+
- npm

### Installation

```bash
# Install dependencies
npm install

# Start development server
npm run dev
```

The app will be available at `http://localhost:3000`.

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
│   └── db.ts           # SQLite database connection
└── components/         # Shared UI components
data/                   # SQLite database (auto-created)
public/uploads/members/ # Member photos (auto-created)
```

## Database

The SQLite database is automatically created at `./data/gym.db` on first run. No additional setup required.

## Tech Stack

- **Framework:** Next.js 14 (App Router)
- **Database:** SQLite via better-sqlite3
- **Styling:** Tailwind CSS
- **Language:** TypeScript
