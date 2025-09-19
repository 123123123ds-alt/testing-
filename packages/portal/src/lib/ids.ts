import { customAlphabet } from 'nanoid';

const generator = customAlphabet('0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz', 16);

export function createId(prefix: string): string {
  return `${prefix}_${generator()}`;
}

export function createTrackingNumber(): string {
  return `TRK-${generator()}`;
}
