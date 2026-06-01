function sendJson(res, status, body) {
  res.setHeader('content-type', 'application/json; charset=utf-8');
  res.status(status).json(body);
}

async function fetchJson(url, options) {
  const response = await fetch(url, options);
  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const message = data?.error?.message || data?.error_message || data?.message || 'Instagram API request failed';
    throw new Error(message);
  }

  return data;
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function waitForContainer(containerId, accessToken, attempts = 12, delayMs = 5000) {
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    const statusUrl = new URL(`https://graph.instagram.com/${containerId}`);
    statusUrl.searchParams.set('fields', 'status_code,status');
    statusUrl.searchParams.set('access_token', accessToken);

    const status = await fetchJson(statusUrl.toString());
    if (status.status_code === 'FINISHED') return status;
    if (status.status_code === 'ERROR' || status.status_code === 'EXPIRED') {
      throw new Error(status.status || `Instagram container ${status.status_code}`);
    }

    await sleep(delayMs);
  }

  return { status_code: 'IN_PROGRESS', status: 'Instagram is still processing the video.' };
}

export const config = {
  maxDuration: 120,
};

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    res.setHeader('access-control-allow-methods', 'POST, OPTIONS');
    res.setHeader('access-control-allow-headers', 'content-type');
    return res.status(204).end();
  }

  if (req.method !== 'POST') {
    return sendJson(res, 405, { ok: false, error: 'Method not allowed.' });
  }

  const accessToken = String(req.body?.accessToken || '').trim();
  const igUserId = String(req.body?.igUserId || '').replace(/^ig_/, '').trim();
  const videoUrl = String(req.body?.videoUrl || '').trim();
  let containerId = String(req.body?.containerId || '').trim();
  const caption = String(req.body?.caption || '').slice(0, 2200);
  const thumbOffset = Number(req.body?.thumbOffset || 0);

  if (!accessToken || !igUserId || (!videoUrl && !containerId)) {
    return sendJson(res, 400, {
      ok: false,
      error: 'Missing Instagram account, access token, or public video URL.',
    });
  }

  try {
    if (!containerId) {
      const mediaForm = new URLSearchParams();
      mediaForm.set('media_type', 'REELS');
      mediaForm.set('video_url', videoUrl);
      mediaForm.set('caption', caption);
      mediaForm.set('share_to_feed', 'true');
      mediaForm.set('access_token', accessToken);
      if (Number.isFinite(thumbOffset) && thumbOffset > 0) {
        mediaForm.set('thumb_offset', String(Math.round(thumbOffset)));
      }

      const container = await fetchJson(`https://graph.instagram.com/${igUserId}/media`, {
        method: 'POST',
        body: mediaForm,
      });
      containerId = container.id;
    }

    const containerStatus = await waitForContainer(containerId, accessToken);
    if (containerStatus.status_code !== 'FINISHED') {
      return sendJson(res, 202, {
        ok: false,
        pending: true,
        containerId,
        status: containerStatus.status,
        error: 'Instagram is still processing the video. Try again in a few seconds.',
      });
    }

    const publishForm = new URLSearchParams();
    publishForm.set('creation_id', containerId);
    publishForm.set('access_token', accessToken);

    const published = await fetchJson(`https://graph.instagram.com/${igUserId}/media_publish`, {
      method: 'POST',
      body: publishForm,
    });

    return sendJson(res, 200, {
      ok: true,
      containerId,
      mediaId: published.id,
      status: 'published',
    });
  } catch (error) {
    return sendJson(res, 502, {
      ok: false,
      error: error.message || 'Could not publish Instagram Reel.',
    });
  }
}
