import { Router } from 'express';

export const publicRouter = Router();

publicRouter.get('/', (_request, response) => {
  response.render('home', {
    title: 'Courier Portal'
  });
});

publicRouter.get('/healthz', (_request, response) => {
  response.json({ status: 'ok' });
});
