import http from 'node:http';
import { createApp } from './app';
import { initDb } from './db';
import { config } from './config';

export async function startServer(): Promise<http.Server> {
  await initDb();
  const app = createApp();
  return app.listen(config.port, () => {
    console.log(`🚀 Courier portal listening on ${config.baseUrl}`);
  });
}

if (require.main === module) {
  startServer().catch((error) => {
    console.error('Failed to start server', error);
    process.exitCode = 1;
  });
}
