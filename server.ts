import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import cookieParser from 'cookie-parser';
import session from 'express-session';
import path from 'path';
import { fileURLToPath } from 'url';
import axios from 'axios';
import * as cheerio from 'cheerio';
import { BetaAnalyticsDataClient } from '@google-analytics/data';
import multer from 'multer';
import fs from 'fs';
import https from 'https';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const uploadDir = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir);

// DB Setup
const DB_DIR = path.join(process.cwd(), 'db');
if (!fs.existsSync(DB_DIR)) fs.mkdirSync(DB_DIR);

function getDbPath(collection: string) {
  return path.join(DB_DIR, `${collection}.json`);
}

function readDb(collection: string) {
  const p = getDbPath(collection);
  if (!fs.existsSync(p)) return [];
  try {
    return JSON.parse(fs.readFileSync(p, 'utf-8'));
  } catch (e) {
    return [];
  }
}

function writeDb(collection: string, data: any) {
  const p = getDbPath(collection);
  fs.writeFileSync(p, JSON.stringify(data, null, 2));
}

function readSingleDb(collection: string) {
  const p = getDbPath(collection);
  if (!fs.existsSync(p)) return {};
  try {
    return JSON.parse(fs.readFileSync(p, 'utf-8'));
  } catch (e) {
    return {};
  }
}

function writeSingleDb(collection: string, data: any) {
  const p = getDbPath(collection);
  fs.writeFileSync(p, JSON.stringify(data, null, 2));
}

dotenv.config();

const app = express();
const PORT = 3000;

app.set('trust proxy', 1);

app.use(cors());
app.use(express.json());
app.use(cookieParser());

// Request logger
app.use((req, res, next) => {
  const isAsset = req.url.match(/\.(js|css|png|jpg|jpeg|gif|svg|ico|woff|woff2|ttf|otf|map|tsx|ts|jsx|json)$/);
  const isApi = req.url.startsWith('/api');
  
  if (isApi) {
    console.log(`[Server] ${new Date().toISOString()} API REQUEST: ${req.method} ${req.path}${req.url.includes('?') ? '?' + req.url.split('?')[1] : ''}`);
  } else if (!isAsset && req.url !== '/' && !req.url.startsWith('/@') && req.method === 'GET') {
    console.log(`[Server] ${new Date().toISOString()} NAVIGATION: ${req.method} ${req.url}`);
    
    // Simple Local Analytics tracking
    try {
      const analytics = readSingleDb('analytics');
      const date = new Date().toISOString().split('T')[0];
      if (!analytics[date]) analytics[date] = 0;
      analytics[date]++;
      writeSingleDb('analytics', analytics);
    } catch (e) {
      console.warn('[Analytics] Failed to track page view:', e);
    }
  }
  next();
});

// Serve uploaded files
app.use('/uploads', express.static(uploadDir));

// API ROUTES START
// --------------------------------------------------------------------------

// Health check
app.get('/api/health', (req, res) => {
  console.log('[Server] Health check requested');
  res.json({ status: 'ok', time: new Date().toISOString(), env: process.env.NODE_ENV });
});

// Discord verification
app.get('/.well-known/discord', (req, res) => {
  res.setHeader('Content-Type', 'text/plain');
  res.send('dh=f74ec827e58e3b50e2e2e7e251b0098aadfb36ac');
});

const httpsAgent = new https.Agent({
  rejectUnauthorized: false
});

// In-memory cache for stream URLs to avoid redundant expensive resolutions
const streamCache = new Map<string, { url: string, expiry: number }>();
const CACHE_TTL = 10 * 60 * 1000; // 10 minutes cache

// Music Search
app.get('/api/music/search', async (req, res) => {
  const query = req.query.s as string;
  if (!query) return res.status(400).json({ error: 'Missing search query' });

  // List of Monochrome instances
  const monoInstances = [
    'https://monochrome-api.samidy.com',
    'https://api.monochrome.tf',
    'https://hund.qqdl.site',
    'https://katze.qqdl.site',
    'https://wolf.qqdl.site',
    'https://maus.qqdl.site',
    'https://vogel.qqdl.site',
    'https://hifi.hund.live',
    'https://hifi.katze.live'
  ];

  for (const base of monoInstances) {
    try {
      console.log(`[Music] Searching Monochrome instance ${base} for: ${query}`);
      const response = await axios.get(`${base}/search/`, {
        params: { s: query, limit: 30 },
        headers: { 
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36',
          'Accept': 'application/json, text/plain, */*',
          'Accept-Language': 'en-US,en;q=0.9',
          'Referer': 'https://monochrome.tf/',
          'Origin': 'https://monochrome.tf',
          'Sec-Fetch-Dest': 'empty',
          'Sec-Fetch-Mode': 'cors',
          'Sec-Fetch-Site': 'cross-site'
        },
        timeout: 10000,
        httpsAgent: httpsAgent,
        validateStatus: (status) => status === 200
      });
      
      const items = response.data?.data?.items || [];
      if (!Array.isArray(items) || items.length === 0) continue;
      
      const mapped = items.map((s: any) => {
        let coverUrl = '';
        if (s.album?.cover) {
          const parts = s.album.cover.split('-');
          if (parts.length === 5) {
            coverUrl = `https://resources.tidal.com/images/${parts[0]}/${parts[1]}/${parts[2]}/${parts[3]}/${parts[4]}/640x640.jpg`;
          } else {
            coverUrl = `https://resources.tidal.com/images/${s.album.cover.replace(/-/g, '/')}/640x640.jpg`;
          }
        }

        return {
          id: s.id.toString(),
          title: s.title,
          artist: s.artist?.name || s.artists?.map((a: any) => a.name).join(', ') || 'Unknown Artist',
          thumb: coverUrl || '',
          duration: s.duration,
          source: 'monochrome'
        };
      });

      console.log(`[Music] Found ${mapped.length} results via ${base}`);
      return res.json(mapped);

    } catch (error: any) {
      console.warn(`[Music] Monochrome search on ${base} failed:`, error.response?.status, error.response?.data || error.message);
    }
  }

  res.status(404).json({ error: 'No results found on any Monochrome instances.' });
});

// Music Stream 
app.use('/api/music/stream', async (req, res) => {
  const id = req.query.id as string;
  const isHead = req.method === 'HEAD';
  if (!id) return res.status(400).json({ error: 'Missing track ID' });

  // 1. Check Cache first
  const now = Date.now();
  const cached = streamCache.get(id);
  let streamUrl = (cached && cached.expiry > now) ? cached.url : null;

  if (!streamUrl) {
    // Monochrome instances for streaming (Stable list + additional fallbacks)
    const monoInstances = [
      'https://monochrome-api.samidy.com',
      'https://api.monochrome.tf',
      'https://hund.qqdl.site',
      'https://katze.qqdl.site',
      'https://wolf.qqdl.site',
      'https://maus.qqdl.site',
      'https://vogel.qqdl.site',
      'https://hifi.hund.live',
      'https://hifi.katze.live'
    ];

    for (const base of monoInstances) {
      try {
        console.log(`[Music] Resolving Monochrome stream from ${base} for ID: ${id}`);
        
        const trackRes = await axios.get(`${base}/track/`, {
          params: { id, quality: 'HIGH' },
          timeout: 12000,
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36',
            'Accept': 'application/json, text/plain, */*',
            'Accept-Language': 'en-US,en;q=0.9',
            'Referer': 'https://monochrome.tf/',
            'Origin': 'https://monochrome.tf',
            'Sec-Fetch-Dest': 'empty',
            'Sec-Fetch-Mode': 'cors',
            'Sec-Fetch-Site': 'cross-site'
          },
          httpsAgent: httpsAgent,
          validateStatus: (status) => status === 200
        });

        const foundUrl = trackRes.data?.data?.url;
        if (foundUrl) {
          streamUrl = foundUrl;
          streamCache.set(id, { url: foundUrl, expiry: now + CACHE_TTL });
          console.log(`[Music] Successfully resolved ${id} via ${base}`);
          break;
        } else {
          // Fallback: Try without quality parameter if the instance returns success but no URL
          console.warn(`[Music] Instance ${base} returned OK but no URL. Retrying without quality param.`);
          const retryRes = await axios.get(`${base}/track/`, {
            params: { id },
            timeout: 10000,
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36',
              'Referer': 'https://monochrome.tf/'
            },
            httpsAgent,
            validateStatus: (status) => status === 200
          });
          if (retryRes.data?.data?.url) {
            const retryUrl = retryRes.data.data.url;
            streamUrl = retryUrl;
            streamCache.set(id, { url: retryUrl, expiry: now + CACHE_TTL });
            console.log(`[Music] Successfully resolved ${id} via ${base} (fallback)`);
            break;
          }
        }
      } catch (err: any) {
        const fetchStatus = err.response?.status;
        const fetchData = err.response?.data;
        console.warn(`[Music] Resolution failed on ${base}: ${fetchStatus || 'TIMEOUT'}`, fetchData || err.message);
      }
    }
  }

  if (!streamUrl) {
    console.error(`[Music] All Monochrome streaming instances failed for ${id}.`);
    return res.status(503).json({ error: 'Playback unavailable. The music source is currently unreachable.' });
  }

  // 2. Handle HEAD requests quickly after resolution
  if (isHead) {
    return res.status(200).end();
  }

  // 3. Proxy the stream
  try {
    console.log(`[Music] Proxying stream: ${streamUrl.substring(0, 50)}...`);
    const streamResponse = await axios({
      method: 'get',
      url: streamUrl,
      responseType: 'stream',
      timeout: 30000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36',
        'Accept': '*/*',
        'Accept-Language': 'en-US,en;q=0.9',
        'Range': req.headers.range || 'bytes=0-',
        'Referer': 'https://monochrome.tf/',
        'Origin': 'https://monochrome.tf',
        'Sec-Fetch-Dest': 'audio',
        'Sec-Fetch-Mode': 'no-cors',
        'Sec-Fetch-Site': 'cross-site'
      },
      httpsAgent: httpsAgent
    });

    const contentType = streamResponse.headers['content-type'] || '';
    if (contentType.includes('text/html') || contentType.includes('application/json')) {
       console.warn(`[Music] Upstream returned non-audio content: ${contentType}`);
       return res.status(502).json({ error: 'Source returned invalid audio format.' });
    }

    res.status(streamResponse.status);
    const headersToCopy = ['content-type', 'content-length', 'content-range', 'accept-ranges', 'cache-control', 'content-disposition'];
    headersToCopy.forEach(h => {
      if (streamResponse.headers[h]) res.set(h, streamResponse.headers[h]);
    });

    req.on('close', () => {
      if (streamResponse.data) streamResponse.data.destroy();
    });

    streamResponse.data.on('error', (e: any) => {
       console.error('[Music] Proxy stream flow error:', e.message);
       if (!res.headersSent) res.status(500).end();
       else res.end();
    });

    streamResponse.data.pipe(res);
  } catch (proxyErr: any) {
    console.error(`[Music] Proxy failed for stream:`, proxyErr.response?.status, proxyErr.message);
    if (!res.headersSent) {
      res.redirect(streamUrl);
    } else {
      res.end();
    }
  }
});

// GA4 Proxy Route
app.get('/api/analytics/data', async (req, res) => {
  console.log('[Analytics] Request received');
  try {
    const propertyId = '527976762';
    
    // Check if GA4 is configured
    if (process.env.GA4_SERVICE_ACCOUNT_JSON) {
      console.log('[Analytics] Attempting GA4 fetch...');
      try {
        const credentials = JSON.parse(process.env.GA4_SERVICE_ACCOUNT_JSON);
        const analyticsDataClient = new BetaAnalyticsDataClient({
            credentials
        });

        const [response] = await analyticsDataClient.runReport({
          property: `properties/${propertyId}`,
          dateRanges: [{ startDate: '30daysAgo', endDate: 'today' }],
          metrics: [{ name: 'activeUsers' }],
          dimensions: [{ name: 'date' }],
        });

        console.log('[Analytics] GA4 fetch successful');
        return res.json(response);
      } catch (e) {
        console.error('[Analytics] GA4 configuration error, falling back to local analytics:', e);
      }
    }
    
    // Local Analytics Fallback
    console.log('[Analytics] Using local analytics fallback');
    const localData = readSingleDb('analytics');
    console.log(`[Analytics] Local data entries: ${Object.keys(localData).length}`);
    const rows = Object.entries(localData).map(([date, count]) => ({
      dimensionValues: [{ value: date.replace(/-/g, '') }],
      metricValues: [{ value: String(count) }]
    })).sort((a: any, b: any) => a.dimensionValues[0].value.localeCompare(b.dimensionValues[0].value));

    res.json({ rows });
  } catch (error) {
    console.error('[Analytics] Total failure:', error);
    res.status(500).json({ error: 'Failed to fetch analytics' });
  }
});

// Final catch-all for unmatched API routes
app.get('/api/proxies/check', async (req, res) => {
  const url = req.query.url as string;
  if (!url) return res.status(400).json({ error: 'URL is required' });

  try {
    const config = {
      method: 'head' as const,
      url: url,
      httpsAgent: httpsAgent,
      timeout: 5000,
      validateStatus: (status: number) => status >= 200 && status < 400
    };

    let response;
    try {
      response = await axios(config);
    } catch (e) {
      // Fallback to GET if HEAD fails
      response = await axios({ ...config, method: 'get' });
    }

    res.json({ online: true, status: response.status });
  } catch (err) {
    res.json({ online: false, error: 'TIMEOUT_OR_BLOCKED' });
  }
});

app.all(/\/api\/.*/, (req, res) => {
  console.warn(`[Server] 404 NOT FOUND - API route match failed: ${req.method} ${req.url}`);
  res.status(404).json({ 
    error: 'API route not found', 
    method: req.method,
    path: req.url,
    timestamp: new Date().toISOString()
  });
});

// Session configuration
app.use(session({
  secret: process.env.SESSION_SECRET || 'secret-key',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: true,
    sameSite: 'none',
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000
  }
}));

async function startServer() {
  const isProd = process.env.NODE_ENV === 'production';
  console.log(`Starting server in ${isProd ? 'production' : 'development'} mode...`);

  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    
    // SPA fallback - only for non-API routes
    app.get(/.*/, (req, res, next) => {
      if (req.path.startsWith('/api')) {
        console.log(`[Server] API route fell through to SPA fallback: ${req.path}`);
        return next();
      }
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });

  // Global error handler
  app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error('[Server Error]', err);
    res.status(500).json({ 
      error: 'Internal Server Error', 
      message: err.message
    });
  });
}

startServer();
