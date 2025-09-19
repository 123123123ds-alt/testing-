import type { Request } from 'express';

export type FlashMessageType = 'success' | 'error' | 'info';
export interface FlashMessage {
  type: FlashMessageType;
  message: string;
}

export function addFlash(request: Request, type: FlashMessageType, message: string): void {
  if (!request.session.flash) {
    request.session.flash = [];
  }
  request.session.flash.push({ type, message });
}

export function pullFlash(request: Request): FlashMessage[] {
  const messages = request.session.flash ?? [];
  request.session.flash = [];
  return messages;
}
