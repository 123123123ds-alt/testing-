export interface ApiLogEntry {
  service: string;
  request: unknown;
  response?: unknown;
  status: 'success' | 'error';
  durationMs: number;
  error?: {
    message: string;
    code?: string;
  };
}

export interface ApiLogger {
  log(entry: ApiLogEntry): void | Promise<void>;
}

const SENSITIVE_KEYS = ['token', 'secret', 'password', 'telephone', 'mobile', 'email', 'appToken', 'appKey'];

const MASK = '***';

function maskString(value: string): string {
  if (value.length <= 3) {
    return MASK;
  }
  return `${value.slice(0, 1)}${MASK}${value.slice(-1)}`;
}

export function redactSensitive(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map((item) => redactSensitive(item));
  }

  if (value && typeof value === 'object') {
    const record: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
      if (SENSITIVE_KEYS.some((sensitive) => key.toLowerCase().includes(sensitive.toLowerCase()))) {
        if (typeof val === 'string') {
          record[key] = maskString(val);
        } else if (typeof val === 'number') {
          record[key] = MASK;
        } else {
          record[key] = MASK;
        }
      } else {
        record[key] = redactSensitive(val);
      }
    }
    return record;
  }

  return value;
}
