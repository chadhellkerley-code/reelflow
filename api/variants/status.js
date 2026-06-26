import { get } from '@vercel/blob';

function sendJson(res, status, body) {
  res.setHeader('content-type', 'application/json; charset=utf-8');
  res.status(status).json(body);
}

function getStatusPath(jobId) {
  return `variant-jobs/${jobId}.json`;
}

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return sendJson(res, 405, { ok: false, error: 'Method not allowed.' });
  }

  try {
    const jobId = String(req.query?.jobId || '').trim().replace(/[^a-zA-Z0-9_-]/g, '');
    if (!jobId) {
      return sendJson(res, 400, { ok: false, error: 'Falta jobId.' });
    }

    const token = String(process.env.BLOB_READ_WRITE_TOKEN || '').trim();
    const response = await get(getStatusPath(jobId), {
      access: 'public',
      token: token || undefined,
    });

    if (!response) {
      return sendJson(res, 404, { ok: false, error: 'Job no encontrado.' });
    }

    const text = await new Response(response.stream).text();

    let job = {};
    try {
      job = JSON.parse(text || '{}');
    } catch {
      job = {};
    }

    return sendJson(res, 200, {
      ok: true,
      job,
      blob: response.blob,
    });
  } catch (error) {
    return sendJson(res, 500, {
      ok: false,
      error: error?.message || 'No se pudo leer el estado del job.',
    });
  }
}
