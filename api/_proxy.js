import { Readable } from 'stream';
import { pipeline } from 'stream/promises';

const HOP_BY_HOP_HEADERS = new Set([
  'connection',
  'keep-alive',
  'proxy-authenticate',
  'proxy-authorization',
  'te',
  'trailer',
  'transfer-encoding',
  'upgrade',
]);

function getCloudRunBaseUrl() {
  return String(process.env.CLOUD_RUN_BASE_URL || process.env.BACKEND_URL || '').trim().replace(/\/+$/, '');
}

function buildRequestHeaders(req) {
  const headers = new Headers();
  for (const [key, value] of Object.entries(req.headers || {})) {
    if (!value) continue;
    const lowerKey = key.toLowerCase();
    if (lowerKey === 'host' || lowerKey === 'content-length' || HOP_BY_HOP_HEADERS.has(lowerKey)) continue;
    if (Array.isArray(value)) {
      headers.set(key, value.join(', '));
    } else {
      headers.set(key, String(value));
    }
  }
  return headers;
}

function getRequestBody(req) {
  if (req.method === 'GET' || req.method === 'HEAD') return undefined;
  if (req.body == null) return undefined;
  if (Buffer.isBuffer(req.body)) return req.body;
  if (typeof req.body === 'string') return req.body;
  return JSON.stringify(req.body);
}

function sendJson(res, status, body) {
  res.setHeader('content-type', 'application/json; charset=utf-8');
  res.status(status).json(body);
}

export async function proxyToCloudRun(req, res, targetPath) {
  const baseUrl = getCloudRunBaseUrl();
  if (!baseUrl) {
    return sendJson(res, 500, {
      ok: false,
      error: 'CLOUD_RUN_BASE_URL is not configured on Vercel.',
    });
  }

  try {
    const incomingUrl = new URL(req.url, 'http://localhost');
    const targetUrl = new URL(targetPath, `${baseUrl}/`);
    targetUrl.search = incomingUrl.search;

    const upstream = await fetch(targetUrl, {
      method: req.method,
      headers: buildRequestHeaders(req),
      body: getRequestBody(req),
    });

    res.status(upstream.status);

    upstream.headers.forEach((value, key) => {
      if (!HOP_BY_HOP_HEADERS.has(key.toLowerCase())) {
        res.setHeader(key, value);
      }
    });

    if (!upstream.body) {
      return res.end();
    }

    await pipeline(Readable.fromWeb(upstream.body), res);
    return undefined;
  } catch (error) {
    return sendJson(res, 502, {
      ok: false,
      error: error?.message || 'Could not proxy request to Cloud Run.',
    });
  }
}
