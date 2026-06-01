function sendJson(res, status, body) {
  res.setHeader('content-type', 'application/json; charset=utf-8');
  res.status(status).json(body);
}

async function fetchJson(url, options) {
  const response = await fetch(url, options);
  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const message = data?.error_description || data?.error?.message || data?.message || 'TikTok API request failed';
    throw new Error(message);
  }

  return data;
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

  const clientKey = String(req.body?.clientKey || process.env.TIKTOK_CLIENT_KEY || '').trim();
  const clientSecret = process.env.TIKTOK_CLIENT_SECRET;
  const code = String(req.body?.code || '').trim();
  const redirectUri = String(req.body?.redirectUri || '').trim();

  if (!clientKey || !clientSecret) {
    return sendJson(res, 500, {
      ok: false,
      error: 'TIKTOK_CLIENT_KEY or TIKTOK_CLIENT_SECRET is not configured on the server.',
    });
  }

  if (!code || !redirectUri) {
    return sendJson(res, 400, {
      ok: false,
      error: 'Missing authorization code or redirect URI.',
    });
  }

  try {
    const tokenForm = new URLSearchParams();
    tokenForm.set('client_key', clientKey);
    tokenForm.set('client_secret', clientSecret);
    tokenForm.set('code', code);
    tokenForm.set('grant_type', 'authorization_code');
    tokenForm.set('redirect_uri', redirectUri);

    const token = await fetchJson('https://open.tiktokapis.com/v2/oauth/token/', {
      method: 'POST',
      headers: {
        'content-type': 'application/x-www-form-urlencoded',
        'cache-control': 'no-cache',
      },
      body: tokenForm,
    });

    let profile = {};
    try {
      const meUrl = new URL('https://open.tiktokapis.com/v2/user/info/');
      meUrl.searchParams.set('fields', 'open_id,union_id,avatar_url,display_name');
      profile = await fetchJson(meUrl.toString(), {
        headers: {
          Authorization: `Bearer ${token.access_token}`,
        },
      });
    } catch {
      profile = { data: { user: { open_id: token.open_id } } };
    }

    const user = profile?.data?.user || {};

    return sendJson(res, 200, {
      ok: true,
      account: {
        platform: 'tt',
        id: user.open_id || token.open_id,
        openId: token.open_id,
        unionId: user.union_id || null,
        username: user.display_name || `TikTok ${String(token.open_id || '').slice(0, 8)}`,
        avatarUrl: user.avatar_url || null,
        accessToken: token.access_token,
        refreshToken: token.refresh_token,
        expiresIn: token.expires_in,
        refreshExpiresIn: token.refresh_expires_in,
        scope: token.scope,
        connectedAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    return sendJson(res, 502, {
      ok: false,
      error: error.message || 'Could not exchange TikTok code.',
    });
  }
}
