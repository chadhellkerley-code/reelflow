function sendJson(res, status, body) {
  res.setHeader('content-type', 'application/json; charset=utf-8');
  res.status(status).json(body);
}

async function fetchTikTokJson(url, options) {
  const response = await fetch(url, options);
  const data = await response.json().catch(() => ({}));
  const errorCode = data?.error?.code;

  if (!response.ok || (errorCode && errorCode !== 'ok')) {
    const message = data?.error?.message || data?.message || data?.error_description || 'TikTok API request failed';
    const code = errorCode && errorCode !== 'ok' ? ` (${errorCode})` : '';
    throw new Error(`${message}${code}`);
  }

  return data;
}

function normalizeCaption(caption) {
  return String(caption || '').slice(0, 2200);
}

function selectPrivacyLevel(options, requested) {
  const available = Array.isArray(options) ? options : [];
  if (requested && available.includes(requested)) return requested;
  if (available.includes('SELF_ONLY')) return 'SELF_ONLY';
  return available[0] || 'SELF_ONLY';
}

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
  const videoUrl = String(req.body?.videoUrl || '').trim();
  const caption = normalizeCaption(req.body?.caption);
  const privacyLevel = String(req.body?.privacyLevel || 'SELF_ONLY').trim();
  const thumbOffset = Number(req.body?.thumbOffset || 0);

  if (!accessToken || !videoUrl) {
    return sendJson(res, 400, {
      ok: false,
      error: 'Missing TikTok access token or video URL.',
    });
  }

  try {
    const creatorInfo = await fetchTikTokJson('https://open.tiktokapis.com/v2/post/publish/creator_info/query/', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'content-type': 'application/json; charset=UTF-8',
      },
    });
    const creator = creatorInfo?.data || {};
    const selectedPrivacyLevel = selectPrivacyLevel(creator.privacy_level_options, privacyLevel);

    const init = await fetchTikTokJson('https://open.tiktokapis.com/v2/post/publish/video/init/', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'content-type': 'application/json; charset=UTF-8',
      },
      body: JSON.stringify({
        post_info: {
          title: caption,
          privacy_level: selectedPrivacyLevel,
          disable_duet: Boolean(creator.duet_disabled),
          disable_comment: Boolean(creator.comment_disabled),
          disable_stitch: Boolean(creator.stitch_disabled),
          video_cover_timestamp_ms: Number.isFinite(thumbOffset) ? Math.max(0, Math.round(thumbOffset)) : 0,
          brand_content_toggle: false,
          brand_organic_toggle: false,
          is_aigc: false,
        },
        source_info: {
          source: 'PULL_FROM_URL',
          video_url: videoUrl,
        },
      }),
    });

    return sendJson(res, 200, {
      ok: true,
      publishId: init?.data?.publish_id || null,
      privacyLevel: selectedPrivacyLevel,
      requestedPrivacyLevel: privacyLevel,
      availablePrivacyLevels: creator.privacy_level_options || [],
      creatorUsername: creator.creator_username || null,
      status: 'submitted',
    });
  } catch (error) {
    return sendJson(res, 502, {
      ok: false,
      error: error.message || 'Could not publish TikTok video.',
    });
  }
}
