import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

const DATA_DIR = path.join(process.cwd(), 'data');
const DB_PATH = path.join(DATA_DIR, 'gym.db');

let db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (db) return db;

  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }

  db = new Database(DB_PATH);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  initializeSchema(db);
  return db;
}

function initializeSchema(db: Database.Database): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS members (
      member_id INTEGER PRIMARY KEY AUTOINCREMENT,
      first_name TEXT NOT NULL,
      last_name TEXT NOT NULL,
      contact_no TEXT,
      address TEXT,
      birthdate TEXT,
      emergency_contact TEXT,
      card_uid TEXT UNIQUE,
      custom_card_id TEXT,
      image_path TEXT,
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
}
