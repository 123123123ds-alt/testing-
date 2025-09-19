import sqlite3 from 'sqlite3';
import { Database, open } from 'sqlite';
import { config } from './config';
import { hashPassword } from './lib/password';
import { createId } from './lib/ids';
import { now } from './lib/dates';

sqlite3.verbose();

export type PortalDatabase = Database<sqlite3.Database, sqlite3.Statement>;

let dbInstance: PortalDatabase | undefined;

export interface DatabaseOptions {
  filename?: string;
  seedAdmin?: boolean;
  adminEmail?: string;
  adminPassword?: string;
  force?: boolean;
}

export async function initDb(options: DatabaseOptions = {}): Promise<PortalDatabase> {
  if (dbInstance && !options.force) {
    return dbInstance;
  }

  if (dbInstance && options.force) {
    await dbInstance.close();
    dbInstance = undefined;
  }

  const filename = options.filename ?? config.databaseFile;

  const database = await open({
    filename,
    driver: sqlite3.Database
  });

  await database.exec('PRAGMA foreign_keys = ON');

  await database.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('admin', 'shipper')),
      name TEXT,
      company_name TEXT,
      phone TEXT,
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )
  `);

  await database.exec(`
    CREATE TABLE IF NOT EXISTS orders (
      id TEXT PRIMARY KEY,
      shipper_id TEXT NOT NULL,
      reference TEXT NOT NULL,
      recipient_name TEXT NOT NULL,
      recipient_email TEXT,
      recipient_phone TEXT,
      destination_address1 TEXT NOT NULL,
      destination_address2 TEXT,
      destination_city TEXT NOT NULL,
      destination_state TEXT,
      destination_postal_code TEXT,
      destination_country TEXT NOT NULL,
      package_weight REAL NOT NULL,
      package_length REAL,
      package_width REAL,
      package_height REAL,
      service_level TEXT,
      status TEXT NOT NULL,
      tracking_number TEXT,
      label_generated_at TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (shipper_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  await database.exec(`
    CREATE TABLE IF NOT EXISTS tracking_events (
      id TEXT PRIMARY KEY,
      order_id TEXT NOT NULL,
      status TEXT NOT NULL,
      description TEXT,
      occurred_at TEXT NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
    )
  `);

  await database.exec('CREATE INDEX IF NOT EXISTS idx_orders_shipper_id ON orders(shipper_id)');
  await database.exec('CREATE INDEX IF NOT EXISTS idx_tracking_order ON tracking_events(order_id, occurred_at)');

  dbInstance = database;

  if (options.seedAdmin ?? true) {
    await ensureDefaultAdmin(database, {
      email: (options.adminEmail ?? config.adminEmail).toLowerCase(),
      password: options.adminPassword ?? config.adminPassword
    });
  }

  return database;
}

export function getDb(): PortalDatabase {
  if (!dbInstance) {
    throw new Error('Database has not been initialised.');
  }
  return dbInstance;
}

async function ensureDefaultAdmin(
  database: PortalDatabase,
  credentials: { email: string; password: string }
): Promise<void> {
  const existing = await database.get<{
    id: string;
  }>('SELECT id FROM users WHERE role = ? AND email = ?', 'admin', credentials.email);

  if (existing) {
    return;
  }

  const id = createId('usr');
  const timestamp = now();
  const passwordHash = await hashPassword(credentials.password);

  await database.run(
    `INSERT INTO users (id, email, password_hash, role, name, company_name, phone, is_active, created_at, updated_at)
     VALUES (?, ?, ?, 'admin', 'System Administrator', NULL, NULL, 1, ?, ?)`,
    id,
    credentials.email,
    passwordHash,
    timestamp,
    timestamp
  );
}
