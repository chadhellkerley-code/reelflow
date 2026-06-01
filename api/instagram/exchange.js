const DEFAULT_APP_ID = '1428803625601557';

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

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    res.setHeader('access-control-allow-methods', 'POST, OPTIONS');
    res.setHeader('access-control-allow-headers', 'content-type');
    return res.status(204).end();
  }

  if (req.method !== 'POST') {
    return sendJson(res, 405, { ok: false, error: 'Method not allowed.' });
  }

  const appId = process.env.INSTAGRAM_APP_ID || DEFAULT_APP_ID;
  const appSecret = process.env.INSTAGRAM_APP_SECRET;

  if (!appSecret) {
    return sendJson(res, 500, {
      ok: false,
      error: 'INSTAGRAM_APP_SECRET is not configured on the server.',
    });
  }

  const code = String(req.body?.code || '').trim();
  const redirectUri = String(req.body?.redirectUri || '').trim();

  if (!code || !redirectUri) {
    return sendJson(res, 400, {
      ok: false,
      error: 'Missing authorization code or redirect URI.',
    });
  }

  try {
    const tokenForm = new FormData();
    tokenForm.set('client_id', appId);
    tokenForm.set('client_secret', appSecret);
    tokenForm.set('grant_type', 'authorization_code');
    tokenForm.set('redirect_uri', redirectUri);
    tokenForm.set('code', code);

    const shortToken = await fetchJson('https://api.instagram.com/oauth/access_token', {
      method: 'POST',
      body: tokenForm,
    });

    let token = shortToken.access_token;
    let expiresIn = shortToken.expires_in || null;

    try {
      const longTokenUrl = new URL('https://graph.instagram.com/access_token');
      longTokenUrl.searchParams.set('grant_type', 'ig_exchange_token');
      longTokenUrl.searchParams.set('client_secret', appSecret);
      longTokenUrl.searchParams.set('access_token', shortToken.access_token);

      const longToken = await fetchJson(longTokenUrl.toString());
      token = longToken.access_token || token;
      expiresIn = longToken.expires_in || expiresIn;
    } catch {
      // Keep the short-lived token so the OAuth flow can still be validated.
    }

    let profile = {};
    try {
      const meUrl = new URL('https://graph.instagram.com/me');
      meUrl.searchParams.set('fields', 'user_id,username,account_type');
      meUrl.searchParams.set('access_token', token);
      profile = await fetchJson(meUrl.toString());
    } catch {
      profile = { user_id: shortToken.user_id };
    }

    return sendJson(res, 200, {
      ok: true,
      account: {
        platform: 'ig',
        id: String(profile.user_id || shortToken.user_id || ''),
        username: profile.username || `instagram_${profile.user_id || shortToken.user_id || 'account'}`,
        accountType: profile.account_type || null,
        accessToken: token,
        expiresIn,
        connectedAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    return sendJson(res, 502, {
      ok: false,
      error: error.message || 'Could not exchange Instagram code.',
    });
  }
}
