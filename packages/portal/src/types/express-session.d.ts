import 'express-session';

declare module 'express-session' {
  interface SessionData {
    userId?: string;
    role?: 'admin' | 'shipper';
    flash?: { type: 'success' | 'error' | 'info'; message: string }[];
  }
}
