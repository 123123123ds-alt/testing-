import { getDb } from '../db';
import { createId } from '../lib/ids';
import { now } from '../lib/dates';
import { hashPassword, verifyPassword } from '../lib/password';

export type UserRole = 'admin' | 'shipper';

export interface User {
  id: string;
  email: string;
  role: UserRole;
  name: string | null;
  companyName: string | null;
  phone: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface UserRow {
  id: string;
  email: string;
  password_hash: string;
  role: UserRole;
  name: string | null;
  company_name: string | null;
  phone: string | null;
  is_active: number;
  created_at: string;
  updated_at: string;
}

function mapUser(row: UserRow): User {
  return {
    id: row.id,
    email: row.email,
    role: row.role,
    name: row.name,
    companyName: row.company_name,
    phone: row.phone,
    isActive: row.is_active === 1,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

export interface CreateShipperInput {
  email: string;
  name: string;
  companyName: string;
  phone: string;
  password: string;
}

export interface UpdateShipperInput {
  email: string;
  name: string;
  companyName: string;
  phone: string;
  password?: string;
  isActive?: boolean;
}

export async function createShipper(input: CreateShipperInput): Promise<User> {
  const db = getDb();
  const id = createId('usr');
  const timestamp = now();
  const passwordHash = await hashPassword(input.password);

  await db.run(
    `INSERT INTO users (id, email, password_hash, role, name, company_name, phone, is_active, created_at, updated_at)
     VALUES (?, ?, ?, 'shipper', ?, ?, ?, 1, ?, ?)`,
    id,
    input.email.toLowerCase(),
    passwordHash,
    input.name,
    input.companyName,
    input.phone,
    timestamp,
    timestamp
  );

  const created = await getUserById(id);
  if (!created) {
    throw new Error('Failed to create shipper account.');
  }

  return created;
}

export async function updateShipper(id: string, input: UpdateShipperInput): Promise<User> {
  const db = getDb();
  const timestamp = now();

  const updates: string[] = ['email = ?', 'name = ?', 'company_name = ?', 'phone = ?', 'updated_at = ?'];
  const params: unknown[] = [input.email.toLowerCase(), input.name, input.companyName, input.phone, timestamp, id];

  if (typeof input.isActive === 'boolean') {
    updates.splice(updates.length - 1, 0, 'is_active = ?');
    params.splice(params.length - 1, 0, input.isActive ? 1 : 0);
  }

  if (input.password && input.password.trim().length > 0) {
    const passwordHash = await hashPassword(input.password);
    updates.splice(updates.length - 1, 0, 'password_hash = ?');
    params.splice(params.length - 1, 0, passwordHash);
  }

  await db.run(`UPDATE users SET ${updates.join(', ')} WHERE id = ? AND role = 'shipper'`, params);

  const updated = await getUserById(id);
  if (!updated) {
    throw new Error('Failed to update shipper account.');
  }

  return updated;
}

export async function setShipperStatus(id: string, active: boolean): Promise<void> {
  const db = getDb();
  const timestamp = now();
  await db.run(
    `UPDATE users SET is_active = ?, updated_at = ? WHERE id = ? AND role = 'shipper'`,
    active ? 1 : 0,
    timestamp,
    id
  );
}

export async function getUserByEmail(email: string): Promise<User | null> {
  const db = getDb();
  const row = await db.get<UserRow>(
    'SELECT * FROM users WHERE email = ? COLLATE NOCASE',
    email.toLowerCase()
  );
  return row ? mapUser(row) : null;
}

export async function getUserWithPasswordByEmail(email: string): Promise<UserRow | null> {
  const db = getDb();
  const row = await db.get<UserRow>(
    'SELECT * FROM users WHERE email = ? COLLATE NOCASE',
    email.toLowerCase()
  );
  return row ?? null;
}

export async function getUserById(id: string): Promise<User | null> {
  const db = getDb();
  const row = await db.get<UserRow>('SELECT * FROM users WHERE id = ?', id);
  return row ? mapUser(row) : null;
}

export async function listShippers(): Promise<User[]> {
  const db = getDb();
  const rows = await db.all<UserRow>(
    "SELECT * FROM users WHERE role = 'shipper' ORDER BY created_at DESC"
  );
  return rows.map(mapUser);
}

export async function authenticateUser(
  email: string,
  password: string
): Promise<User | null> {
  const user = await getUserWithPasswordByEmail(email);
  if (!user || user.is_active !== 1) {
    return null;
  }
  const valid = await verifyPassword(password, user.password_hash);
  if (!valid) {
    return null;
  }
  return mapUser(user);
}
