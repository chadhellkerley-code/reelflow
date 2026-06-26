import { randomUUID } from 'node:crypto';
import { put } from '@vercel/blob';

function sendJson(res, status, body) {
  res.setHeader('content-type', 'application/json; charset=utf-8');
  res.status(status).json(body);
}

function getStatusPath(jobId) {
  return `variant-jobs/${jobId}.json`;
}

function getResultPath(jobId) {
  return `variant-results/${jobId}/variantes-unicas.zip`;
}

async function writeJobStatus(token, jobId, job) {
  return put(getStatusPath(jobId), JSON.stringify(job, null, 2), {
    access: 'public',
    addRandomSuffix: false,
    allowOverwrite: true,
    contentType: 'application/json; charset=utf-8',
    token,
  });
}

async function dispatchWorkflow(payload) {
  const owner = String(process.env.GITHUB_OWNER || '').trim();
  const repo = String(process.env.GITHUB_REPO || '').trim();
  const token = String(process.env.GITHUB_ACTIONS_TOKEN || '').trim();

  if (!owner || !repo || !token) {
    throw new Error('Faltan variables GITHUB_OWNER, GITHUB_REPO o GITHUB_ACTIONS_TOKEN.');
  }

  const response = await fetch(`https://api.github.com/repos/${owner}/${repo}/dispatches`, {
    method: 'POST',
    headers: {
      accept: 'application/vnd.github+json',
      authorization: `Bearer ${token}`,
      'content-type': 'application/json',
      'x-github-api-version': '2022-11-28',
    },
    body: JSON.stringify({
      event_type: 'variant-generation',
      client_payload: payload,
    }),
  });

  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new Error(`No se pudo disparar GitHub Actions: ${response.status} ${text}`.trim());
  }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return sendJson(res, 405, { ok: false, error: 'Method not allowed.' });
  }

  try {
    const sourceUrl = String(req.body?.sourceUrl || '').trim();
    const sourceFileName = String(req.body?.sourceFileName || 'video.mp4').trim();
    const variantCount = Number.parseInt(String(req.body?.variantCount || '0'), 10);
    const variantMode = String(req.body?.variantMode || 'fast').trim().toLowerCase();
    const token = String(process.env.BLOB_READ_WRITE_TOKEN || '').trim();

    if (!token) {
      return sendJson(res, 500, {
        ok: false,
        error: 'Falta configurar BLOB_READ_WRITE_TOKEN.',
      });
    }

    if (!sourceUrl) {
      return sendJson(res, 400, {
        ok: false,
        error: 'Falta la URL del video base.',
      });
    }

    if (!Number.isFinite(variantCount) || variantCount < 1 || variantCount > 100) {
      return sendJson(res, 400, {
        ok: false,
        error: 'La cantidad de variantes debe estar entre 1 y 100.',
      });
    }

    if (!['fast', 'balanced', 'full'].includes(variantMode)) {
      return sendJson(res, 400, {
        ok: false,
        error: 'El modo de procesamiento no es válido.',
      });
    }

    const jobId = `variant-${Date.now()}-${randomUUID().slice(0, 8)}`;
    const now = new Date().toISOString();
    const statusPath = getStatusPath(jobId);
    const resultPath = getResultPath(jobId);
    const statusUrl = `/api/variants/status?jobId=${encodeURIComponent(jobId)}`;

    const initialStatus = {
      ok: true,
      jobId,
      status: 'queued',
      progress: 5,
      message: 'Job creado. Esperando que GitHub Actions lo tome.',
      sourceUrl,
      sourceFileName,
      variantCount,
      variantMode,
      statusPath,
      resultPath,
      createdAt: now,
      updatedAt: now,
    };

    const statusBlob = await writeJobStatus(token, jobId, initialStatus);

    try {
      await dispatchWorkflow({
        jobId,
        sourceUrl,
        sourceFileName,
        variantCount,
        variantMode,
        statusPath,
        resultPath,
        statusUrl,
      });
    } catch (error) {
      await writeJobStatus(token, jobId, {
        ...initialStatus,
        status: 'error',
        progress: 0,
        message: error?.message || 'No se pudo disparar GitHub Actions.',
        error: error?.message || 'No se pudo disparar GitHub Actions.',
        failedAt: new Date().toISOString(),
      }).catch(() => {});
      throw error;
    }

    return sendJson(res, 200, {
      ok: true,
      jobId,
      statusUrl,
      statusBlobUrl: statusBlob.url,
      resultPath,
    });
  } catch (error) {
    return sendJson(res, 500, {
      ok: false,
      error: error?.message || 'No se pudo crear el job de variantes.',
    });
  }
}
