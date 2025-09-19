import fs from 'node:fs';
import path from 'node:path';
import dotenv from 'dotenv';

dotenv.config();

const port = Number.parseInt(process.env.PORT ?? '3000', 10);
const databaseFile = process.env.DATABASE_FILE ?? path.resolve(process.cwd(), 'portal.sqlite');
const sessionStoreDir = process.env.SESSION_STORE_DIR ?? path.resolve(process.cwd(), 'sessions');

fs.mkdirSync(path.dirname(databaseFile), { recursive: true });
fs.mkdirSync(sessionStoreDir, { recursive: true });

export const config = {
  env: process.env.NODE_ENV ?? 'development',
  port: Number.isNaN(port) ? 3000 : port,
  databaseFile,
  sessionStoreDir,
  sessionSecret: process.env.SESSION_SECRET ?? 'change-me',
  sessionCookieName: process.env.SESSION_COOKIE_NAME ?? 'courier.sid',
  adminEmail: process.env.ADMIN_EMAIL ?? 'admin@portal.test',
  adminPassword: process.env.ADMIN_PASSWORD ?? 'Admin123!',
  baseUrl: process.env.BASE_URL ?? `http://localhost:${Number.isNaN(port) ? 3000 : port}`
};
