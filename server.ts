import express, { Request, Response } from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { createVedaApiApp, startBackgroundScheduler } from './src/server/vedaApi.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT) || 3000;
const isProduction = process.env.NODE_ENV === 'production';

async function startServer() {
  const app = createVedaApiApp({ standalone: false });

  // Start background RSS polling every 30 minutes
  startBackgroundScheduler();

  if (!isProduction) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[VEDA] Core Tactical Server running at http://0.0.0.0:${PORT}`);
  });
}

startServer();
