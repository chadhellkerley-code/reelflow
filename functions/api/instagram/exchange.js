const JSON_HEADERS = {
  'content-type': 'application/json; charset=utf-8',
  'access-control-allow-origin': '*',
  'access-control-allow-methods': 'POST, OPTIONS',
  'access-control-allow-headers': 'content-type',
};

const DEFAULT_REDIRECT_URI = 'https://reelflow-topaz.vercel.app/auth/instagram/callback';

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: JSON_HEADERS,
  });
}

async function readJson(request) {
  try {
    return await request.json();
  } catch {
    return {};
  }
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

export async function onRequestOptions() {
  return new Response(null, { status: 204, headers: JSON_HEADERS });
}

export async function onRequestPost({ request, env }) {
  const appId = env.INSTAGRAM_APP_ID || '1428803625601557';
  const appSecret = env.INSTAGRAM_APP_SECRET;

  if (!appSecret) {
    return json({
      ok: false,
      error: 'INSTAGRAM_APP_SECRET is not configured on the server.',
    }, 500);
  }

  const body = await readJson(request);
  const code = String(body.code || '').trim();
  const redirectUri = String(body.redirectUri || DEFAULT_REDIRECT_URI).trim();

  if (!code) {
    return json({ ok: false, error: 'Missing authorization code.' }, 400);
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
    } catch (error) {
      // Some app modes may return only the short-lived token. Keep the first token so testing can continue.
    }

    let profile = {};
    try {
      const meUrl = new URL('https://graph.instagram.com/me');
      meUrl.searchParams.set('fields', 'user_id,username,account_type');
      meUrl.searchParams.set('access_token', token);
      profile = await fetchJson(meUrl.toString());
    } catch (error) {
      profile = { user_id: shortToken.user_id };
    }

    return json({
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
    return json({
      ok: false,
      error: error.message || 'Could not exchange Instagram code.',
    }, 502);
  }
}
