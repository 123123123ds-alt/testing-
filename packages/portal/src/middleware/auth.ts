import type { Request, RequestHandler } from 'express';
import { addFlash } from '../lib/flash';
import { getUserById } from '../services/user-service';
import type { User, UserRole } from '../services/user-service';

export const attachUser: RequestHandler = async (request, response, next) => {
  if (!request.session.userId) {
    response.locals.currentUser = null;
    return next();
  }

  try {
    const user = await getUserById(request.session.userId);
    if (!user || (request.session.role === 'shipper' && !user.isActive)) {
      request.session.userId = undefined;
      request.session.role = undefined;
      response.locals.currentUser = null;
      return next();
    }
    response.locals.currentUser = user;
    return next();
  } catch (error) {
    return next(error);
  }
};

export function requireRole(role: UserRole): RequestHandler {
  return (request, response, next) => {
    if (!request.session.userId || request.session.role !== role) {
      addFlash(
        request,
        'error',
        'Please sign in to continue.'
      );
      const redirectTo = role === 'admin' ? '/admin/login' : '/shipper/login';
      return response.redirect(redirectTo);
    }

    if (!response.locals.currentUser) {
      addFlash(request, 'error', 'Your account is no longer active.');
      request.session.userId = undefined;
      request.session.role = undefined;
      const redirectTo = role === 'admin' ? '/admin/login' : '/shipper/login';
      return response.redirect(redirectTo);
    }

    return next();
  };
}

export function logout(request: Request): void {
  request.session.userId = undefined;
  request.session.role = undefined;
}
