import type { RequestHandler } from 'express';
import { pullFlash } from '../lib/flash';

export const flashMiddleware: RequestHandler = (request, response, next) => {
  response.locals.flashMessages = pullFlash(request);
  next();
};
