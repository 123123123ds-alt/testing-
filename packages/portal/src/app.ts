import path from 'node:path';
import express from 'express';
import session from 'express-session';
import connectSqlite3 from 'connect-sqlite3';
import helmet from 'helmet';
import morgan from 'morgan';
import nunjucks from 'nunjucks';
import cookieParser from 'cookie-parser';
import csurf from 'csurf';
import { config } from './config';
import { formatDate } from './lib/dates';
import { publicRouter } from './routes/public';
import { adminRouter } from './routes/admin';
import { shipperRouter } from './routes/shipper';
import { attachUser } from './middleware/auth';
import { flashMiddleware } from './middleware/flash';
import type { FlashMessage } from './lib/flash';

const SQLiteStore = connectSqlite3(session);

export function createApp(): express.Express {
  const app = express();

  const viewsPath = path.join(__dirname, '../views');
  const publicPath = path.join(__dirname, '../public');

  const nunjucksEnv = nunjucks.configure(viewsPath, {
    autoescape: true,
    express: app,
    watch: false,
    noCache: config.env !== 'production'
  });

  nunjucksEnv.addGlobal('now', () => new Date().toISOString());
  nunjucksEnv.addGlobal('formatDate', formatDate);
  app.set('view engine', 'njk');
  app.set('views', viewsPath);

  app.use(helmet());
  app.use(morgan(config.env === 'production' ? 'combined' : 'dev'));
  app.use(express.urlencoded({ extended: true }));
  app.use(express.json());
  app.use(cookieParser());
  app.use(
    session({
      store: new SQLiteStore({
        dir: config.sessionStoreDir,
        db: 'sessions.sqlite'
      }),
      secret: config.sessionSecret,
      name: config.sessionCookieName,
      resave: false,
      saveUninitialized: false,
      rolling: true,
      cookie: {
        httpOnly: true,
        sameSite: 'lax',
        secure: config.env === 'production',
        maxAge: 1000 * 60 * 60 * 12
      }
    })
  );

  app.use(express.static(publicPath));
  app.use(csurf());
  app.use((request, response, next) => {
    response.locals.csrfToken = request.csrfToken();
    next();
  });
  app.use(attachUser);
  app.use(flashMiddleware);

  app.use((_request, response, next) => {
    response.locals.flashMessages = (response.locals.flashMessages ?? []) as FlashMessage[];
    response.locals.currentUser = response.locals.currentUser ?? null;
    next();
  });

  app.use(publicRouter);
  app.use(adminRouter);
  app.use(shipperRouter);

  app.use((error: unknown, request: express.Request, response: express.Response, next: express.NextFunction) => {
    if (typeof error === 'object' && error && 'code' in error && (error as { code?: string }).code === 'EBADCSRFTOKEN') {
      response.status(403);
      addErrorMessage(response, 'The form has expired. Please try again.');
      return response.render('errors/403', { title: 'Security token mismatch' });
    }
    next(error);
  });

  app.use((error: unknown, _request, response, _next) => {
    console.error(error);
    response.status(500);
    response.render('errors/500', { title: 'Something went wrong' });
  });

  app.use((_request, response) => {
    response.status(404);
    response.render('errors/404', { title: 'Page not found' });
  });

  return app;
}

function addErrorMessage(response: express.Response, message: string): void {
  const existing = (response.locals.flashMessages ?? []) as FlashMessage[];
  response.locals.flashMessages = [...existing, { type: 'error', message }];
}
