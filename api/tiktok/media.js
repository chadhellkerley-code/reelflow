import { Readable } from 'node:stream';

export const config = {
  maxDuration: 60,
};

const ALLOWED_HOST_SUFFIXES = [
  '.vercel-storage.com',
  '.public.blob.vercel-storage.com',
];

function sendText(res, status, message) {
  res.status(status).send(message);
}

function isAllowedSource(url) {
  return url.protocol === 'https:' && ALLOWED_HOST_SUFFIXES.some(suffix => url.hostname.endsWith(suffix));
}

export default async function handler(req, res) {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    return sendText(res, 405, 'Method not allowed.');
  }

  const rawUrl = String(req.query?.url || '').trim();
  if (!rawUrl) {
    return sendText(res, 400, 'Missing media URL.');
  }

  let sourceUrl;
  try {
    sourceUrl = new URL(rawUrl);
  } catch {
    return sendText(res, 400, 'Invalid media URL.');
  }

  if (!isAllowedSource(sourceUrl)) {
    return sendText(res, 400, 'Media URL must be a Vercel Blob HTTPS URL.');
  }

  const upstream = await fetch(sourceUrl, {
    headers: req.headers.range ? { range: req.headers.range } : undefined,
  });

  if (!upstream.ok && upstream.status !== 206) {
    return sendText(res, upstream.status, 'Could not fetch media.');
  }

  res.status(upstream.status);
  for (const header of ['content-type', 'content-length', 'content-range', 'accept-ranges', 'last-modified', 'etag']) {
    const value = upstream.headers.get(header);
    if (value) res.setHeader(header, value);
  }
  res.setHeader('cache-control', 'public, max-age=3600');

  if (req.method === 'HEAD') {
    return res.end();
  }

  if (!upstream.body) {
    return res.end();
  }

  return Readable.fromWeb(upstream.body).pipe(res);
}
