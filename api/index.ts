import type { IncomingMessage, ServerResponse } from 'http';
import { createVedaApiApp } from '../src/server/vedaApi.js';

let cachedApp: ReturnType<typeof createVedaApiApp> | null = null;

export default function handler(req: IncomingMessage, res: ServerResponse) {
  try {
    if (!cachedApp) {
      cachedApp = createVedaApiApp({ standalone: true });
    }
    return cachedApp(req as any, res as any);
  } catch (err: any) {
    console.error('[VEDA VERCEL HANDLER ERROR]', err);
    if (!res.headersSent) {
      res.statusCode = 500;
      res.setHeader('Content-Type', 'application/json');
      res.end(
        JSON.stringify({
          error: err?.message || 'Internal Server Error',
        })
      );
    }
  }
}
