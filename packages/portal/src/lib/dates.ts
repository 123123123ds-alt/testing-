import dayjs from 'dayjs';

export function now(): string {
  return new Date().toISOString();
}

export function formatDate(value: string | Date | null | undefined, withTime = true): string {
  if (!value) {
    return '';
  }
  const instance = typeof value === 'string' ? dayjs(value) : dayjs(value.toISOString());
  return instance.format(withTime ? 'YYYY-MM-DD HH:mm' : 'YYYY-MM-DD');
}
