import express from 'express';
import cors from 'cors';
import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import { Storage } from '@google-cloud/storage';
import { createJobsRouter } from './variant-worker/routes/jobs.js';
import { createJobScheduler } from './variant-worker/services/jobScheduler.js';
import { createJobStore } from './variant-worker/services/jobStore.js';
import { createInstagramExchangeHandler, createInstagramPublishHandler } from './lib/instagram.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = __dirname;

const PORT = Number(process.env.PORT || 8080);
const TMP_DIR = process.env.TMP_DIR || path.join('/tmp', 'reelflow');
const MAX_PARALLEL_JOBS = Number(process.env.MAX_PARALLEL_JOBS || 0);
const MAX_VARIANTS = Number(process.env.MAX_VARIANTS || 30);
const GCS_BUCKET_NAME = String(process.env.GCS_BUCKET || '').trim();
const GCS_SIGNED_URL_TTL_MINUTES = Number.isFinite(Number(process.env.GCS_SIGNED_URL_TTL_MINUTES))
  ? Number(process.env.GCS_SIGNED_URL_TTL_MINUTES)
  : 60;

await fs.mkdir(TMP_DIR, { recursive: true });

const app = express();
const storage = GCS_BUCKET_NAME ? new Storage() : null;
const gcsBucket = storage ? storage.bucket(GCS_BUCKET_NAME) : null;
const jobStore = createJobStore();
const scheduler = createJobScheduler({ maxParallelJobs: MAX_PARALLEL_JOBS });
const instagramExchangeHandler = createInstagramExchangeHandler();
const instagramPublishHandler = createInstagramPublishHandler();

app.disable('x-powered-by');
app.use(cors());
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true }));
app.use('/src', express.static(path.join(ROOT_DIR, 'src')));
app.use('/vendor', express.static(path.join(ROOT_DIR, 'vendor')));
app.use('/auth', express.static(path.join(ROOT_DIR, 'auth')));

function sendJson(res, status, body) {
  res.setHeader('content-type', 'application/json; charset=utf-8');
  return res.status(status).json(body);
}

function sendFile(res, relativePath) {
  return res.sendFile(path.join(ROOT_DIR, relativePath));
}

function sanitizeFilename(name = 'video.mp4') {
  const base = path.basename(String(name || 'video.mp4'));
  const cleaned = base.replace(/[^a-z0-9._-]/gi, '-').replace(/-+/g, '-');
  return cleaned.replace(/^[-.]+|[-.]+$/g, '') || 'video.mp4';
}

function isGcsConfigured() {
  return Boolean(gcsBucket && GCS_BUCKET_NAME);
}

async function createSignedUploadSession({ filename, contentType }) {
  if (!gcsBucket) {
    throw new Error('GCS_BUCKET is not configured.');
  }

  const safeFilename = sanitizeFilename(filename);
  const objectName = `reels/${Date.now()}-${crypto.randomUUID()}-${safeFilename}`;
  const file = gcsBucket.file(objectName);
  const expires = Date.now() + (GCS_SIGNED_URL_TTL_MINUTES * 60 * 1000);

  const [uploadUrl] = await file.getSignedUrl({
    version: 'v4',
    action: 'write',
    expires,
    contentType,
  });

  const [downloadUrl] = await file.getSignedUrl({
    version: 'v4',
    action: 'read',
    expires,
  });

  return {
    objectName,
    uploadUrl,
    downloadUrl,
  };
}

app.get('/health', (_req, res) => {
  return sendJson(res, 200, {
    ok: true,
    service: 'reelflow',
    gcsConfigured: isGcsConfigured(),
    variantWorker: true,
    maxParallelJobs: scheduler.getLimit(),
    maxVariants: MAX_VARIANTS,
  });
});

app.get('/api/blob/status', (_req, res) => {
  return sendJson(res, 200, {
    ok: isGcsConfigured(),
    configured: isGcsConfigured(),
    provider: isGcsConfigured() ? 'gcs' : 'none',
    bucket: GCS_BUCKET_NAME || null,
    signedUrlTtlMinutes: GCS_SIGNED_URL_TTL_MINUTES,
  });
});

app.get('/api/blob/test', async (_req, res) => {
  if (!isGcsConfigured()) {
    return sendJson(res, 500, {
      ok: false,
      error: 'GCS_BUCKET is not configured on the server.',
    });
  }

  try {
    const session = await createSignedUploadSession({
      filename: `blob-test-${Date.now()}.txt`,
      contentType: 'text/plain',
    });

    return sendJson(res, 200, {
      ok: true,
      ...session,
    });
  } catch (error) {
    return sendJson(res, 500, {
      ok: false,
      error: error?.message || 'Blob test failed.',
    });
  }
});

app.post('/api/blob/upload', async (req, res) => {
  if (!isGcsConfigured()) {
    return sendJson(res, 500, {
      ok: false,
      error: 'GCS_BUCKET is not configured on the server.',
    });
  }

  const filename = String(req.body?.filename || 'video.mp4').trim();
  const contentType = String(req.body?.contentType || 'video/mp4').trim() || 'video/mp4';

  try {
    const session = await createSignedUploadSession({ filename, contentType });

    return sendJson(res, 200, {
      ok: true,
      ...session,
      url: session.downloadUrl,
      contentType,
      expiresInMinutes: GCS_SIGNED_URL_TTL_MINUTES,
    });
  } catch (error) {
    return sendJson(res, 500, {
      ok: false,
      error: error?.message || 'Could not create an upload session.',
    });
  }
});

app.options('/api/instagram/exchange', instagramExchangeHandler);
app.post('/api/instagram/exchange', instagramExchangeHandler);

app.options('/api/instagram/publish', instagramPublishHandler);
app.post('/api/instagram/publish', instagramPublishHandler);

app.use('/jobs', createJobsRouter({
  tmpDir: TMP_DIR,
  jobStore,
  scheduler,
  maxVariants: MAX_VARIANTS,
}));

app.get('/', (_req, res) => sendFile(res, 'index.html'));
app.get('/index.html', (_req, res) => sendFile(res, 'index.html'));
app.get('/privacidad.html', (_req, res) => sendFile(res, 'privacidad.html'));
app.get('/terminos.html', (_req, res) => sendFile(res, 'terminos.html'));
app.get('/eliminacion-datos.html', (_req, res) => sendFile(res, 'eliminacion-datos.html'));
app.get('/favicon.ico', (_req, res) => {
  return res.status(204).end();
});
app.get(['/auth/instagram/callback', '/auth/instagram/callback/'], (_req, res) => {
  return sendFile(res, path.join('auth', 'instagram', 'callback', 'index.html'));
});

app.use((req, res) => {
  return sendJson(res, 404, {
    ok: false,
    error: 'Not found.',
    path: req.path,
  });
});

app.listen(PORT, () => {
  console.log(`ReelFlow listening on ${PORT}`);
});
