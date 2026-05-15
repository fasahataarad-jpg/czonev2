// server.ts
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import cookieParser from "cookie-parser";
import session from "express-session";
import path from "path";
import { fileURLToPath } from "url";
import axios from "axios";
import { BetaAnalyticsDataClient } from "@google-analytics/data";
import fs from "fs";
import https from "https";
var __filename = fileURLToPath(import.meta.url);
var __dirname = path.dirname(__filename);
var uploadDir = path.join(process.cwd(), "uploads");
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir);
var DB_DIR = path.join(process.cwd(), "db");
if (!fs.existsSync(DB_DIR)) fs.mkdirSync(DB_DIR);
function getDbPath(collection) {
  return path.join(DB_DIR, `${collection}.json`);
}
function readSingleDb(collection) {
  const p = getDbPath(collection);
  if (!fs.existsSync(p)) return {};
  try {
    return JSON.parse(fs.readFileSync(p, "utf-8"));
  } catch (e) {
    return {};
  }
}
function writeSingleDb(collection, data) {
  const p = getDbPath(collection);
  fs.writeFileSync(p, JSON.stringify(data, null, 2));
}
dotenv.config();
var app = express();
var PORT = 3001;
app.set("trust proxy", 1);
app.use(cors());
app.use(express.json());
app.use(cookieParser());
app.use((req, res, next) => {
  const isAsset = req.url.match(/\.(js|css|png|jpg|jpeg|gif|svg|ico|woff|woff2|ttf|otf|map|tsx|ts|jsx|json)$/);
  const isApi = req.url.startsWith("/api");
  if (isApi) {
    console.log(`[Server] ${(/* @__PURE__ */ new Date()).toISOString()} API REQUEST: ${req.method} ${req.path}${req.url.includes("?") ? "?" + req.url.split("?")[1] : ""}`);
  } else if (!isAsset && !req.url.startsWith("/@") && req.method === "GET") {
    const cleanPath = req.path;
    if (cleanPath === "/" || !cleanPath.includes(".")) {
      console.log(`[Server] ${(/* @__PURE__ */ new Date()).toISOString()} ACCESS: ${req.method} ${req.url}`);
      try {
        const analytics = readSingleDb("analytics");
        const date = (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
        if (!analytics[date]) analytics[date] = 0;
        analytics[date]++;
        writeSingleDb("analytics", analytics);
      } catch (e) {
        console.warn("[Analytics] Failed to track page view:", e);
      }
    }
  }
  next();
});
app.use("/uploads", express.static(uploadDir));
app.get("/api/health", (req, res) => {
  console.log("[Server] Health check requested");
  res.json({ status: "ok", time: (/* @__PURE__ */ new Date()).toISOString(), env: process.env.NODE_ENV });
});
app.get("/api/analytics/data", async (req, res) => {
  console.log(`[Analytics] Request received from ${req.ip} for path ${req.path}`);
  try {
    const propertyId = "527976762";
    if (process.env.GA4_SERVICE_ACCOUNT_JSON) {
      console.log("[Analytics] GA4_SERVICE_ACCOUNT_JSON found, attempting GA4 fetch...");
      try {
        const credentials = JSON.parse(process.env.GA4_SERVICE_ACCOUNT_JSON);
        const analyticsDataClient = new BetaAnalyticsDataClient({
          credentials
        });
        const [response] = await analyticsDataClient.runReport({
          property: `properties/${propertyId}`,
          dateRanges: [{ startDate: "30daysAgo", endDate: "today" }],
          metrics: [{ name: "activeUsers" }],
          dimensions: [{ name: "date" }]
        });
        console.log("[Analytics] GA4 fetch successful");
        return res.json(response);
      } catch (e) {
        console.error("[Analytics] GA4 configuration error, falling back to local analytics:", e.message);
      }
    } else {
      console.log("[Analytics] GA4_SERVICE_ACCOUNT_JSON not found in environment");
    }
    console.log("[Analytics] Using local analytics fallback");
    const localData = readSingleDb("analytics");
    console.log(`[Analytics] Local data entries: ${Object.keys(localData).length}`);
    const rows = Object.entries(localData).map(([date, count]) => ({
      dimensionValues: [{ value: date.replace(/-/g, "") }],
      metricValues: [{ value: String(count) }]
    })).sort((a, b) => a.dimensionValues[0].value.localeCompare(b.dimensionValues[0].value));
    res.json({ rows });
  } catch (error) {
    console.error("[Analytics] Total failure:", error);
    res.status(500).json({ error: "Failed to fetch analytics", detail: error.message });
  }
});
app.get("/.well-known/discord", (req, res) => {
  res.setHeader("Content-Type", "text/plain");
  res.send("dh=f74ec827e58e3b50e2e2e7e251b0098aadfb36ac");
});
var httpsAgent = new https.Agent({
  rejectUnauthorized: false
});
var streamCache = /* @__PURE__ */ new Map();
var CACHE_TTL = 10 * 60 * 1e3;
var MONO_INSTANCES = [
  "https://monochrome.tf",
  "https://monochrome.hund.live",
  "https://monochrome.katze.live",
  "https://monochrome.wolf.live",
  "https://hifi.hund.live",
  "https://hifi.katze.live",
  "https://api.monochrome.tf",
  "https://monochrome-api.samidy.com",
  "https://maus.qqdl.site",
  "https://vogel.qqdl.site",
  "https://hund.qqdl.site",
  "https://katze.qqdl.site",
  "https://wolf.qqdl.site"
];
var instanceCooldowns = /* @__PURE__ */ new Map();
app.get("/api/music/search", async (req, res) => {
  const query = req.query.s;
  if (!query) return res.status(400).json({ error: "Missing search query" });
  for (const base of MONO_INSTANCES) {
    const cooldownUntil = instanceCooldowns.get(base) || 0;
    if (Date.now() < cooldownUntil) continue;
    try {
      console.log(`[Music] Searching Monochrome instance ${base} for: ${query}`);
      const response = await axios.get(`${base}/search/`, {
        params: { s: query, limit: 30 },
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36",
          "Accept": "application/json, text/plain, */*",
          "Accept-Language": "en-US,en;q=0.9",
          "Referer": `${base}/`,
          "Origin": `${base}`,
          "Sec-Fetch-Dest": "empty",
          "Sec-Fetch-Mode": "cors",
          "Sec-Fetch-Site": "cross-site"
        },
        timeout: 8e3,
        httpsAgent,
        validateStatus: (status) => status === 200
      });
      const items = response.data?.data?.items || [];
      if (!Array.isArray(items) || items.length === 0) {
        continue;
      }
      const mapped = items.map((s) => {
        let coverUrl = "";
        if (s.album?.cover) {
          const parts = s.album.cover.split("-");
          if (parts.length === 5) {
            coverUrl = `https://resources.tidal.com/images/${parts[0]}/${parts[1]}/${parts[2]}/${parts[3]}/${parts[4]}/640x640.jpg`;
          } else {
            coverUrl = `https://resources.tidal.com/images/${s.album.cover.replace(/-/g, "/")}/640x640.jpg`;
          }
        }
        return {
          id: s.id.toString(),
          title: s.title,
          artist: s.artist?.name || s.artists?.map((a) => a.name).join(", ") || "Unknown Artist",
          thumb: coverUrl || "",
          duration: s.duration,
          source: "monochrome"
        };
      });
      console.log(`[Music] Found ${mapped.length} results via ${base}`);
      return res.json(mapped);
    } catch (error) {
      const status = error.response?.status;
      console.warn(`[Music] Monochrome search on ${base} failed:`, status, error.message);
      if (status === 403 || status >= 500) {
        console.log(`[Music] Cooldown initiated for ${base} due to status ${status}`);
        instanceCooldowns.set(base, Date.now() + 5 * 60 * 1e3);
      }
    }
  }
  res.status(404).json({ error: "No results found on any available Monochrome instances." });
});
app.use("/api/music/stream", async (req, res) => {
  const id = req.query.id;
  const isHead = req.method === "HEAD";
  if (!id) return res.status(400).json({ error: "Missing track ID" });
  const now = Date.now();
  const cached = streamCache.get(id);
  let streamUrl = cached && cached.expiry > now ? cached.url : null;
  if (!streamUrl) {
    for (const base of MONO_INSTANCES) {
      const cooldownUntil = instanceCooldowns.get(base) || 0;
      if (now < cooldownUntil) continue;
      try {
        console.log(`[Music] Resolving Monochrome stream from ${base} for ID: ${id}`);
        const trackRes = await axios.get(`${base}/track/`, {
          params: { id, quality: "HIGH" },
          timeout: 1e4,
          headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36",
            "Accept": "application/json, text/plain, */*",
            "Accept-Language": "en-US,en;q=0.9",
            "Referer": `${base}/`,
            "Origin": `${base}`,
            "Sec-Fetch-Dest": "empty",
            "Sec-Fetch-Mode": "cors",
            "Sec-Fetch-Site": "cross-site"
          },
          httpsAgent,
          validateStatus: (status) => status === 200
        });
        const foundUrl = trackRes.data?.data?.url;
        if (foundUrl) {
          streamUrl = foundUrl;
          streamCache.set(id, { url: foundUrl, expiry: now + CACHE_TTL });
          console.log(`[Music] Successfully resolved ${id} via ${base}`);
          break;
        } else {
          console.warn(`[Music] Instance ${base} returned OK but no URL. Retrying without quality param.`);
          const retryRes = await axios.get(`${base}/track/`, {
            params: { id },
            timeout: 8e3,
            headers: {
              "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36",
              "Referer": `${base}/`
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
      } catch (err) {
        const fetchStatus = err.response?.status;
        console.warn(`[Music] Resolution failed on ${base}: ${fetchStatus || "TIMEOUT"}`);
        if (fetchStatus === 403 || fetchStatus >= 500) {
          instanceCooldowns.set(base, now + 5 * 60 * 1e3);
        }
      }
    }
  }
  if (!streamUrl) {
    console.error(`[Music] All Monochrome streaming instances failed for ${id}.`);
    return res.status(503).json({ error: "Playback unavailable. The music source is currently unreachable." });
  }
  if (isHead) {
    return res.status(200).end();
  }
  try {
    console.log(`[Music] Proxying stream: ${streamUrl.substring(0, 50)}...`);
    const streamResponse = await axios({
      method: "get",
      url: streamUrl,
      responseType: "stream",
      timeout: 3e4,
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36",
        "Accept": "*/*",
        "Accept-Language": "en-US,en;q=0.9",
        "Range": req.headers.range || "bytes=0-",
        "Referer": "https://monochrome.tf/",
        "Origin": "https://monochrome.tf",
        "Sec-Fetch-Dest": "audio",
        "Sec-Fetch-Mode": "no-cors",
        "Sec-Fetch-Site": "cross-site"
      },
      httpsAgent
    });
    const contentType = streamResponse.headers["content-type"] || "";
    if (contentType.includes("text/html") || contentType.includes("application/json")) {
      console.warn(`[Music] Upstream returned non-audio content: ${contentType}`);
      return res.status(502).json({ error: "Source returned invalid audio format." });
    }
    res.status(streamResponse.status);
    const headersToCopy = ["content-type", "content-length", "content-range", "accept-ranges", "cache-control", "content-disposition"];
    headersToCopy.forEach((h) => {
      if (streamResponse.headers[h]) res.set(h, streamResponse.headers[h]);
    });
    req.on("close", () => {
      if (streamResponse.data) streamResponse.data.destroy();
    });
    streamResponse.data.on("error", (e) => {
      console.error("[Music] Proxy stream flow error:", e.message);
      if (!res.headersSent) res.status(500).end();
      else res.end();
    });
    streamResponse.data.pipe(res);
  } catch (proxyErr) {
    console.error(`[Music] Proxy failed for stream:`, proxyErr.response?.status, proxyErr.message);
    if (!res.headersSent) {
      res.redirect(streamUrl);
    } else {
      res.end();
    }
  }
});
app.get("/api/proxies/check", async (req, res) => {
  const url = req.query.url;
  if (!url) return res.status(400).json({ error: "URL is required" });
  try {
    const config = {
      method: "head",
      url,
      httpsAgent,
      timeout: 5e3,
      validateStatus: (status) => status >= 200 && status < 400
    };
    let response;
    try {
      response = await axios(config);
    } catch (e) {
      response = await axios({ ...config, method: "get" });
    }
    res.json({ online: true, status: response.status });
  } catch (err) {
    res.json({ online: false, error: "TIMEOUT_OR_BLOCKED" });
  }
});
app.all(/\/api\/.*/, (req, res) => {
  console.warn(`[Server] 404 NOT FOUND - API route match failed: ${req.method} ${req.url}`);
  res.status(404).json({
    error: "API route not found",
    method: req.method,
    path: req.url,
    timestamp: (/* @__PURE__ */ new Date()).toISOString()
  });
});
app.use(session({
  secret: process.env.SESSION_SECRET || "secret-key",
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: true,
    sameSite: "none",
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1e3
  }
}));
async function startServer() {
  const isProd = process.env.NODE_ENV === "production";
  console.log(`Starting server in ${isProd ? "production" : "development"} mode...`);
  if (!isProd) {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa"
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get(/.*/, (req, res, next) => {
      if (req.path.startsWith("/api")) {
        console.log(`[Server] API route fell through to SPA fallback: ${req.path}`);
        return next();
      }
      res.sendFile(path.join(distPath, "index.html"));
    });
  }
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
  app.use((err, req, res, next) => {
    console.error("[Server Error]", err);
    res.status(500).json({
      error: "Internal Server Error",
      message: err.message
    });
  });
}
startServer();
