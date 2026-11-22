import express, { Express, NextFunction, Request, Response } from 'express';
import fs from 'fs';
import os from 'os';
import path from 'path';
import crypto from 'crypto';
import ParserMod from 'rss-parser';
import { DEFAULT_SOURCES_CATALOG } from '../data/sourcesCatalog.js';

const Parser: typeof ParserMod = (ParserMod as any).default || ParserMod;

export interface SourceItem {
  id: string;
  name: string;
  url: string;
  category: string;
  language: string;
  active: boolean;
  description?: string;
  lastFetchedAt?: string;
  lastStatus?: 'ONLINE' | 'ERROR' | 'PENDING';
  lastError?: string;
  latencyMs?: number;
  articleCount?: number;
}

export interface ArticleItem {
  id: string;
  hashId: string;
  title: string;
  summary: string;
  link: string;
  sourceId: string;
  sourceName: string;
  category: string;
  language: string;
  publishedAt: string;
  fetchedAt: string;
}

export interface FetchLog {
  id: string;
  timestamp: string;
  totalSources: number;
  successfulSources: number;
  failedSources: number;
  newArticles: number;
  durationMs: number;
  status: 'SUCCESS' | 'PARTIAL' | 'FAILED';
  details?: string;
}

export interface VedaStore {
  sources: SourceItem[];
  articles: ArticleItem[];
  logs: FetchLog[];
  lastSyncAt: string | null;
  isSyncing: boolean;
}

const isServerlessRuntime = Boolean(
  process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME || process.env.NETLIFY
);

function resolveDbFile(): string {
  if (!isServerlessRuntime) {
    const localDataDir = path.resolve(process.cwd(), 'data');
    try {
      if (!fs.existsSync(localDataDir)) {
        fs.mkdirSync(localDataDir, { recursive: true });
      }
      fs.accessSync(localDataDir, fs.constants.W_OK);
      return path.join(localDataDir, 'veda_store.json');
    } catch {
      // Fallback to tmpdir if project directory is read-only
    }
  }
  return path.join(os.tmpdir(), 'veda_store.json');
}

const DB_FILE = resolveDbFile();

function loadInitialSources(): SourceItem[] {
  return DEFAULT_SOURCES_CATALOG.map((s) => ({
    id: String(s.id),
    name: String(s.name),
    url: String(s.url),
    category: String(s.category),
    language: String(s.language || 'en'),
    active: s.active ?? true,
    description: s.description ? String(s.description) : undefined,
    lastStatus: 'PENDING' as const,
    articleCount: 0,
  }));
}

let store: VedaStore = {
  sources: [],
  articles: [],
  logs: [],
  lastSyncAt: null,
  isSyncing: false,
};

let storeLoaded = false;

function ensureStoreLoaded() {
  if (storeLoaded && store.sources.length > 0) return;

  if (fs.existsSync(DB_FILE)) {
    try {
      const data = JSON.parse(fs.readFileSync(DB_FILE, 'utf-8'));
      store = {
        sources:
          Array.isArray(data.sources) && data.sources.length > 0
            ? data.sources
            : loadInitialSources(),
        articles: Array.isArray(data.articles) ? data.articles : [],
        logs: Array.isArray(data.logs) ? data.logs : [],
        lastSyncAt: data.lastSyncAt || null,
        isSyncing: false,
      };
      storeLoaded = true;
      return;
    } catch (e) {
      console.error('[VEDA DB] Error memuat DB file, fallback ke default sources:', e);
    }
  }

  store.sources = loadInitialSources();
  storeLoaded = true;
  saveStore();
}

function saveStore() {
  try {
    if (store.articles.length > 2500) {
      store.articles = store.articles.slice(0, 2500);
    }
    if (store.logs.length > 100) {
      store.logs = store.logs.slice(0, 100);
    }
    fs.writeFileSync(DB_FILE, JSON.stringify(store, null, 2), 'utf-8');
  } catch (err) {
    console.error('[VEDA DB] Gagal menyimpan database:', err);
  }
}

const parser = new Parser({
  customFields: {
    item: ['description', 'summary', 'content', 'pubDate', 'isoDate', 'dc:date'],
  },
});

function cleanSummary(rawHtml?: string): string {
  if (!rawHtml) return '';
  return rawHtml
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 450);
}

function generateHash(link: string, title: string): string {
  return crypto.createHash('sha256').update(`${link.trim()}_${title.trim()}`).digest('hex');
}

async function fetchSource(
  source: SourceItem,
  timeoutMs: number
): Promise<{
  success: boolean;
  articles: ArticleItem[];
  latencyMs: number;
  error?: string;
}> {
  const startTime = Date.now();
  try {
    const res = await fetch(source.url, {
      signal: AbortSignal.timeout(timeoutMs),
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36 (compatible; VEDA-Aggregator/1.0)',
        Accept: 'application/rss+xml, application/atom+xml, application/xml, text/xml;q=0.9, */*;q=0.8',
      },
    });

    if (!res.ok) {
      return {
        success: false,
        articles: [],
        latencyMs: Date.now() - startTime,
        error: `HTTP ${res.status}`,
      };
    }

    const xml = await res.text();
    const feed = await parser.parseString(xml);
    const latencyMs = Date.now() - startTime;

    const items: ArticleItem[] = [];
    const entries = feed.items || [];

    for (const entry of entries) {
      const title = (entry.title || '').trim();
      const link = (entry.link || '').trim();
      if (!title || !link) continue;

      const rawSummary = (entry as any).summary || (entry as any).description || entry.content || '';
      const summary = cleanSummary(rawSummary);

      const dateVal = entry.isoDate || entry.pubDate || new Date().toISOString();
      const publishedAt = !isNaN(Date.parse(dateVal))
        ? new Date(dateVal).toISOString()
        : new Date().toISOString();

      const hashId = generateHash(link, title);

      items.push({
        id: hashId,
        hashId,
        title,
        summary,
        link,
        sourceId: source.id,
        sourceName: source.name,
        category: source.category,
        language: source.language,
        publishedAt,
        fetchedAt: new Date().toISOString(),
      });
    }

    return {
      success: true,
      articles: items,
      latencyMs,
    };
  } catch (err: any) {
    return {
      success: false,
      articles: [],
      latencyMs: Date.now() - startTime,
      error:
        err?.name === 'TimeoutError'
          ? `Timeout (${(timeoutMs / 1000).toFixed(1)}s)`
          : err?.message || 'Network error',
    };
  }
}

let inflightSync: Promise<any> | null = null;

export async function runIngestionCycle(triggeredBy = 'AUTO_SCHEDULER') {
  ensureStoreLoaded();

  if (store.isSyncing && inflightSync) {
    return inflightSync;
  }

  store.isSyncing = true;
  const cycleStart = Date.now();
  const isFastServerless = isServerlessRuntime;
  const fetchTimeoutMs = isFastServerless ? 2600 : 4500;
  const concurrency = isFastServerless ? 28 : 12;
  const maxCycleMs = isFastServerless ? 4500 : 60000;

  inflightSync = (async () => {
    console.log(`[VEDA] Memulai siklus pengambilan (${triggeredBy}). Total sumber: ${store.sources.length}`);

    const activeSources = store.sources.filter((s) => s.active);
    let successfulCount = 0;
    let failedCount = 0;
    let newArticlesCount = 0;
    const failureDetails: string[] = [];

    try {
      const existingHashes = new Set(store.articles.map((a) => a.hashId));
      const newArticles: ArticleItem[] = [];

      for (let i = 0; i < activeSources.length; i += concurrency) {
        if (Date.now() - cycleStart > maxCycleMs) {
          break;
        }
        const chunk = activeSources.slice(i, i + concurrency);
        await Promise.all(
          chunk.map(async (src) => {
            const result = await fetchSource(src, fetchTimeoutMs);
            const sourceIndex = store.sources.findIndex((s) => s.id === src.id);

            if (result.success) {
              successfulCount++;
              if (sourceIndex !== -1) {
                store.sources[sourceIndex].lastStatus = 'ONLINE';
                store.sources[sourceIndex].lastFetchedAt = new Date().toISOString();
                store.sources[sourceIndex].latencyMs = result.latencyMs;
                store.sources[sourceIndex].lastError = undefined;
              }

              let addedForThis = 0;
              for (const art of result.articles) {
                if (!existingHashes.has(art.hashId)) {
                  existingHashes.add(art.hashId);
                  newArticles.push(art);
                  addedForThis++;
                }
              }
              newArticlesCount += addedForThis;

              if (sourceIndex !== -1) {
                store.sources[sourceIndex].articleCount =
                  (store.sources[sourceIndex].articleCount || 0) + addedForThis;
              }
            } else {
              failedCount++;
              failureDetails.push(`${src.name}: ${result.error}`);
              if (sourceIndex !== -1) {
                store.sources[sourceIndex].lastStatus = 'ERROR';
                store.sources[sourceIndex].lastFetchedAt = new Date().toISOString();
                store.sources[sourceIndex].lastError = result.error;
              }
            }
          })
        );
      }

      if (newArticles.length > 0) {
        store.articles = [...newArticles, ...store.articles].sort(
          (a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
        );
      } else {
        store.articles.sort(
          (a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
        );
      }

      const durationMs = Date.now() - cycleStart;
      const status: 'SUCCESS' | 'PARTIAL' | 'FAILED' =
        failedCount === 0 ? 'SUCCESS' : successfulCount > 0 ? 'PARTIAL' : 'FAILED';

      const logEntry: FetchLog = {
        id: `log-${Date.now()}`,
        timestamp: new Date().toISOString(),
        totalSources: activeSources.length,
        successfulSources: successfulCount,
        failedSources: failedCount,
        newArticles: newArticlesCount,
        durationMs,
        status,
        details: failureDetails.slice(0, 5).join('; '),
      };

      store.logs.unshift(logEntry);
      store.lastSyncAt = new Date().toISOString();

      console.log(
        `[VEDA] Siklus selesai dalam ${(durationMs / 1000).toFixed(1)}s | Sukses: ${successfulCount}/${activeSources.length} | Baru: +${newArticlesCount}`
      );

      return logEntry;
    } catch (cycleErr) {
      console.error('[VEDA] Error fatal saat siklus sinkronisasi:', cycleErr);
      return { status: 'FAILED' };
    } finally {
      store.isSyncing = false;
      inflightSync = null;
      saveStore();
    }
  })();

  return inflightSync;
}

async function ensureFreshForServerless() {
  ensureStoreLoaded();
  if (!isServerlessRuntime) return;

  const timeSinceLastSync = store.lastSyncAt
    ? Date.now() - new Date(store.lastSyncAt).getTime()
    : Infinity;

  if (store.articles.length === 0 || timeSinceLastSync > 30 * 60 * 1000) {
    await runIngestionCycle('SERVERLESS_AUTO_SYNC');
  }
}

export function startBackgroundScheduler() {
  ensureStoreLoaded();

  const timeSinceLastSync = store.lastSyncAt
    ? Date.now() - new Date(store.lastSyncAt).getTime()
    : Infinity;

  if (store.articles.length === 0 || timeSinceLastSync > 30 * 60 * 1000) {
    console.log('[VEDA] Data usang atau awal. Menjadwalkan sinkronisasi otomatis startup...');
    setTimeout(() => {
      runIngestionCycle('STARTUP_AUTO_SYNC');
    }, 1000);
  }

  const THIRTY_MINUTES_MS = 30 * 60 * 1000;
  setInterval(() => {
    runIngestionCycle('30_MIN_INTERVAL');
  }, THIRTY_MINUTES_MS);
}

function escapeXml(unsafe: string) {
  return unsafe.replace(/[<>&'"]/g, (c) => {
    switch (c) {
      case '<':
        return '&lt;';
      case '>':
        return '&gt;';
      case '&':
        return '&amp;';
      case "'":
        return '&apos;';
      case '"':
        return '&quot;';
      default:
        return c;
    }
  });
}

export function createVedaApiApp(options?: { standalone?: boolean }): Express {
  ensureStoreLoaded();
  const app = express();

  app.use(express.json());

  app.use((_req, res, next) => {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.setHeader('Surrogate-Control', 'no-store');
    next();
  });

  // 1. GET /api/articles
  app.get('/api/articles', async (req: Request, res: Response, next: NextFunction) => {
    try {
      await ensureFreshForServerless();
      const { category, source, search, limit = '50', offset = '0' } = req.query;
      const numLimit = Math.min(Math.max(parseInt(limit as string, 10) || 50, 1), 200);
      const numOffset = Math.max(parseInt(offset as string, 10) || 0, 0);

      let filtered = store.articles;

      if (category && category !== 'all') {
        filtered = filtered.filter((a) => a.category.toLowerCase() === (category as string).toLowerCase());
      }

      if (source && source !== 'all') {
        filtered = filtered.filter((a) => a.sourceId === source);
      }

      if (search && typeof search === 'string') {
        const q = search.toLowerCase().trim();
        filtered = filtered.filter(
          (a) =>
            a.title.toLowerCase().includes(q) ||
            a.summary.toLowerCase().includes(q) ||
            a.sourceName.toLowerCase().includes(q)
        );
      }

      const total = filtered.length;
      const paginated = filtered.slice(numOffset, numOffset + numLimit);

      res.json({
        total,
        offset: numOffset,
        limit: numLimit,
        count: paginated.length,
        articles: paginated,
      });
    } catch (err) {
      next(err);
    }
  });

  // 2. GET /api/sources (non-blocking)
  app.get('/api/sources', (_req: Request, res: Response, next: NextFunction) => {
    try {
      ensureStoreLoaded();
      const categories = Array.from(new Set(store.sources.map((s) => s.category)));
      res.json({
        total: store.sources.length,
        active: store.sources.filter((s) => s.active).length,
        categories,
        sources: store.sources,
      });
    } catch (err) {
      next(err);
    }
  });

  // 3. POST /api/sources
  app.post('/api/sources', (req: Request, res: Response, next: NextFunction) => {
    try {
      ensureStoreLoaded();
      const { name, url, category, language = 'en', description } = req.body || {};
      if (!name || !url || !category) {
        res.status(400).json({ error: 'Nama, URL RSS, dan Kategori wajib diisi.' });
        return;
      }

      const id = `src-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
      const newSource: SourceItem = {
        id,
        name: String(name).slice(0, 120),
        url: String(url).slice(0, 1000),
        category: String(category),
        language: String(language),
        active: true,
        description: description ? String(description).slice(0, 300) : '',
        lastStatus: 'PENDING',
        articleCount: 0,
      };

      store.sources.push(newSource);
      saveStore();
      res.status(201).json({ message: 'Sumber berhasil ditambahkan.', source: newSource });
    } catch (err) {
      next(err);
    }
  });

  // 4. PATCH /api/sources/:id/toggle
  app.patch('/api/sources/:id/toggle', (req: Request, res: Response, next: NextFunction) => {
    try {
      ensureStoreLoaded();
      const { id } = req.params;
      const source = store.sources.find((s) => s.id === id);
      if (!source) {
        res.status(404).json({ error: 'Sumber tidak ditemukan.' });
        return;
      }
      source.active = !source.active;
      saveStore();
      res.json({
        message: `Sumber ${source.name} sekarang ${source.active ? 'Aktif' : 'Nonaktif'}`,
        source,
      });
    } catch (err) {
      next(err);
    }
  });

  // 5. DELETE /api/sources/:id
  app.delete('/api/sources/:id', (req: Request, res: Response, next: NextFunction) => {
    try {
      ensureStoreLoaded();
      const { id } = req.params;
      const initialLen = store.sources.length;
      store.sources = store.sources.filter((s) => s.id !== id);
      if (store.sources.length === initialLen) {
        res.status(404).json({ error: 'Sumber tidak ditemukan.' });
        return;
      }
      saveStore();
      res.json({ message: 'Sumber berhasil dihapus.' });
    } catch (err) {
      next(err);
    }
  });

  // 6. GET /api/stats
  app.get('/api/stats', async (_req: Request, res: Response, next: NextFunction) => {
    try {
      await ensureFreshForServerless();
      const totalArticles = store.articles.length;
      const totalSources = store.sources.length;
      const activeSources = store.sources.filter((s) => s.active).length;
      const onlineSources = store.sources.filter((s) => s.active && s.lastStatus === 'ONLINE').length;

      const categoryCounts: Record<string, number> = {};
      for (const art of store.articles) {
        categoryCounts[art.category] = (categoryCounts[art.category] || 0) + 1;
      }

      const healthRate = activeSources > 0 ? Math.round((onlineSources / activeSources) * 100) : 100;

      res.json({
        totalArticles,
        totalSources,
        activeSources,
        onlineSources,
        healthRate,
        lastSyncAt: store.lastSyncAt,
        isSyncing: store.isSyncing,
        nextSyncMinutes: 30,
        categoryCounts,
        recentLog: store.logs[0] || null,
      });
    } catch (err) {
      next(err);
    }
  });

  // 7. GET /api/logs (non-blocking)
  app.get('/api/logs', (_req: Request, res: Response, next: NextFunction) => {
    try {
      ensureStoreLoaded();
      res.json({
        total: store.logs.length,
        logs: store.logs,
      });
    } catch (err) {
      next(err);
    }
  });

  // 8. POST /api/sync
  app.post('/api/sync', async (_req: Request, res: Response, next: NextFunction) => {
    try {
      ensureStoreLoaded();
      if (isServerlessRuntime) {
        const log = await runIngestionCycle('SERVERLESS_MANUAL_SYNC');
        res.json({ message: 'Sinkronisasi VEDA selesai.', status: 'COMPLETED', log });
        return;
      }

      if (store.isSyncing) {
        res.json({ message: 'Sinkronisasi sudah dalam proses.', status: 'IN_PROGRESS' });
        return;
      }

      runIngestionCycle('MANUAL_USER_TRIGGER');
      res.json({ message: 'Siklus sinkronisasi VEDA telah dimulai di background.', status: 'STARTED' });
    } catch (err) {
      next(err);
    }
  });

  // 9. GET /api/opml/export
  app.get('/api/opml/export', (_req: Request, res: Response, next: NextFunction) => {
    try {
      ensureStoreLoaded();
      const outlines = store.sources
        .map(
          (s) =>
            `    <outline text="${escapeXml(s.name)}" title="${escapeXml(s.name)}" type="rss" xmlUrl="${escapeXml(
              s.url
            )}" htmlUrl="" category="${escapeXml(s.category)}"/>`
        )
        .join('\n');

      const opml = `<?xml version="1.0" encoding="UTF-8"?>
<opml version="2.0">
  <head>
    <title>VEDA News Intelligence Feeds</title>
    <dateCreated>${new Date().toUTCString()}</dateCreated>
    <docs>http://opml.org/spec2.opml</docs>
  </head>
  <body>
${outlines}
  </body>
</opml>`;

      res.setHeader('Content-Type', 'text/xml');
      res.setHeader('Content-Disposition', 'attachment; filename="veda_feeds.opml"');
      res.send(opml);
    } catch (err) {
      next(err);
    }
  });

  // Ensure unknown /api/* routes always return JSON instead of HTML
  app.use('/api', (req: Request, res: Response) => {
    res.status(404).json({
      error: `API endpoint not found: ${req.method} ${req.originalUrl}`,
    });
  });

  if (options?.standalone) {
    app.use((req: Request, res: Response) => {
      res.status(404).json({
        error: `Endpoint not found: ${req.method} ${req.originalUrl}`,
      });
    });
  }

  // Global JSON error handler so Express never crashes uncaught
  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    console.error('[VEDA API ERROR]', err);
    if (!res.headersSent) {
      res.status(500).json({
        error: err?.message || 'Internal Server Error',
      });
    }
  });

  return app;
}
