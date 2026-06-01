import { put } from '@vercel/blob';

function sendJson(res, status, body) {
  res.setHeader('content-type', 'application/json; charset=utf-8');
  res.status(status).json(body);
}

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return sendJson(res, 405, { ok: false, error: 'Method not allowed.' });
  }

  try {
    const blob = await put(`debug/blob-test-${Date.now()}.txt`, 'ok', {
      access: 'public',
      addRandomSuffix: true,
      token: process.env.BLOB_READ_WRITE_TOKEN,
    });

    return sendJson(res, 200, {
      ok: true,
      url: blob.url,
      downloadUrl: blob.downloadUrl,
    });
  } catch (error) {
    return sendJson(res, 500, {
      ok: false,
      error: error.message || 'Blob test failed.',
    });
  }
}
