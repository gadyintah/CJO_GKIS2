import { createClient, Client } from '@libsql/client';

let client: Client | null = null;
let initialized = false;

export async function getDb(): Promise<Client> {
  if (!client) {
    if (!process.env.TURSO_DATABASE_URL) {
      const fs = await import('fs');
      const path = await import('path');
      const dataDir = path.join(process.cwd(), 'data');
      if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
      }
    }

    client = createClient({
      url: process.env.TURSO_DATABASE_URL || 'file:data/gym.db',
      authToken: process.env.TURSO_AUTH_TOKEN,
    });
  }

  if (!initialized) {
    await initializeSchema(client);
    initialized = true;
  }

  return client;
}

async function initializeSchema(db: Client): Promise<void> {
  await db.executeMultiple(`
    CREATE TABLE IF NOT EXISTS members (
      member_id INTEGER PRIMARY KEY AUTOINCREMENT,
      first_name TEXT NOT NULL,
      last_name TEXT NOT NULL,
      contact_no TEXT,
      address TEXT,
      birthdate TEXT,
      emergency_contact TEXT,
      emergency_contact_number TEXT,
      card_uid TEXT UNIQUE,
      custom_card_id TEXT,
      image_path TEXT,
      notes TEXT,
      created_at TEXT
    );

    CREATE TABLE IF NOT EXISTS memberships (
      membership_id INTEGER PRIMARY KEY AUTOINCREMENT,
      member_id INTEGER NOT NULL,
      plan_type TEXT,
      start_date TEXT,
      end_date TEXT,
      months_purchased INTEGER,
      status TEXT,
      created_at TEXT,
      FOREIGN KEY(member_id) REFERENCES members(member_id)
    );

    CREATE TABLE IF NOT EXISTS payments (
      payment_id INTEGER PRIMARY KEY AUTOINCREMENT,
      member_id INTEGER NOT NULL,
      membership_id INTEGER,
      amount REAL,
      mop TEXT,
      payment_date TEXT,
      notes TEXT,
      FOREIGN KEY(member_id) REFERENCES members(member_id),
      FOREIGN KEY(membership_id) REFERENCES memberships(membership_id)
    );

    CREATE TABLE IF NOT EXISTS logs (
      log_id INTEGER PRIMARY KEY AUTOINCREMENT,
      member_id INTEGER,
      card_uid TEXT,
      action TEXT,
      timestamp TEXT,
      duration_seconds INTEGER,
      FOREIGN KEY(member_id) REFERENCES members(member_id)
    );

    CREATE TABLE IF NOT EXISTS admin_users (
      admin_id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      created_at TEXT
    );

    CREATE TABLE IF NOT EXISTS walkins (
      walkin_id INTEGER PRIMARY KEY AUTOINCREMENT,
      guest_name TEXT,
      amount_paid REAL,
      payment_date TEXT,
      notes TEXT
    );
  `);

  // Migration: add notes column to members if it doesn't exist yet
  const cols = (await db.execute(`PRAGMA table_info(members)`)).rows as unknown as { name: string }[];
  if (!cols.some(c => c.name === 'notes')) {
    await db.execute(`ALTER TABLE members ADD COLUMN notes TEXT`);
  }
  // Migration: add emergency_contact_number column to members if it doesn't exist yet
  if (!cols.some(c => c.name === 'emergency_contact_number')) {
    await db.execute(`ALTER TABLE members ADD COLUMN emergency_contact_number TEXT`);
  }
}
