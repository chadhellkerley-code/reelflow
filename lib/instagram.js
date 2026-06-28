const GRAPH_API_VERSION = (typeof process !== 'undefined' && process?.env?.META_GRAPH_API_VERSION
  ? String(process.env.META_GRAPH_API_VERSION).trim()
  : '') || 'v21.0';
const GRAPH_FACEBOOK_BASE = `https://graph.facebook.com/${GRAPH_API_VERSION}`;
const GRAPH_INSTAGRAM_BASE = 'https://graph.instagram.com';
const INSTAGRAM_OAUTH_BASE = 'https://api.instagram.com';

const NODE_JSON_HEADERS = {
  'content-type': 'application/json; charset=utf-8',
};

function normalizeString(value) {
  return String(value || '').trim();
}

function getRuntimeEnv(env) {
  if (env && typeof env === 'object') return env;
  return typeof process !== 'undefined' && process?.env ? process.env : {};
}

function getAppId(env) {
  const runtimeEnv = getRuntimeEnv(env);
  return normalizeString(runtimeEnv.INSTAGRAM_APP_ID || '1428803625601557');
}

function getAppSecret(env) {
  const runtimeEnv = getRuntimeEnv(env);
  return normalizeString(runtimeEnv.INSTAGRAM_APP_SECRET);
}

function toBoolean(value, fallback = false) {
  if (value === true || value === 'true' || value === '1') return true;
  if (value === false || value === 'false' || value === '0') return false;
  return fallback;
}

function toNonNegativeInteger(value) {
  const parsed = Number.parseInt(String(value ?? ''), 10);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
}

async function readJsonSafe(request) {
  try {
    return await request.json();
  } catch {
    return {};
  }
}

async function fetchJson(url, options = {}, fetchImpl = fetch) {
  const response = await fetchImpl(url, options);
  const text = await response.text().catch(() => '');
  let data = {};

  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = { raw: text };
    }
  }

  if (!response.ok) {
    const message = data?.error?.message || data?.error_message || data?.message || data?.raw || 'Instagram API request failed';
    const error = new Error(message);
    error.status = response.status;
    error.payload = data;
    throw error;
  }

  return data;
}

function buildErrorPayload(error, fallbackMessage) {
  const payload = {
    ok: false,
    error: error?.message || fallbackMessage,
  };

  if (error?.status) payload.status = error.status;
  if (error?.payload?.error?.code) payload.code = error.payload.error.code;
  if (error?.payload?.error?.error_subcode) payload.subcode = error.payload.error.error_subcode;
  return payload;
}

function sendNodeJson(res, status, body) {
  res.setHeader('content-type', NODE_JSON_HEADERS['content-type']);
  return res.status(status).json(body);
}

async function exchangeInstagramCode({ code, redirectUri, env, fetchImpl = fetch } = {}) {
  const runtimeEnv = getRuntimeEnv(env);
  const appId = getAppId(runtimeEnv);
  const appSecret = getAppSecret(runtimeEnv);

  if (!appSecret) {
    return {
      status: 500,
      body: { ok: false, error: 'INSTAGRAM_APP_SECRET is not configured on the server.' },
    };
  }

  const authCode = normalizeString(code);
  const callbackUrl = normalizeString(redirectUri);

  if (!authCode) {
    return {
      status: 400,
      body: { ok: false, error: 'Missing authorization code.' },
    };
  }

  if (!callbackUrl) {
    return {
      status: 400,
      body: { ok: false, error: 'Missing redirect URI.' },
    };
  }

  try {
    const tokenForm = new URLSearchParams();
    tokenForm.set('client_id', appId);
    tokenForm.set('client_secret', appSecret);
    tokenForm.set('grant_type', 'authorization_code');
    tokenForm.set('redirect_uri', callbackUrl);
    tokenForm.set('code', authCode);

    const shortToken = await fetchJson(`${INSTAGRAM_OAUTH_BASE}/oauth/access_token`, {
      method: 'POST',
      body: tokenForm,
    }, fetchImpl);

    let token = shortToken.access_token;
    let expiresIn = shortToken.expires_in || null;

    try {
      const longTokenUrl = new URL(`${GRAPH_INSTAGRAM_BASE}/access_token`);
      longTokenUrl.searchParams.set('grant_type', 'ig_exchange_token');
      longTokenUrl.searchParams.set('client_secret', appSecret);
      longTokenUrl.searchParams.set('access_token', shortToken.access_token);

      const longToken = await fetchJson(longTokenUrl.toString(), {}, fetchImpl);
      token = longToken.access_token || token;
      expiresIn = longToken.expires_in || expiresIn;
    } catch {
      // Keep the short-lived token when the app only returns that variant.
    }

    let profile = {};
    try {
      const meUrl = new URL(`${GRAPH_INSTAGRAM_BASE}/me`);
      meUrl.searchParams.set('fields', 'user_id,username,account_type');
      meUrl.searchParams.set('access_token', token);
      profile = await fetchJson(meUrl.toString(), {}, fetchImpl);
    } catch {
      profile = { user_id: shortToken.user_id };
    }

    return {
      status: 200,
      body: {
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
      },
    };
  } catch (error) {
    return {
      status: 502,
      body: buildErrorPayload(error, 'Could not exchange Instagram code.'),
    };
  }
}

async function getContainerStatus({ igUserId, containerId, accessToken, fetchImpl = fetch } = {}) {
  const statusUrl = new URL(`${GRAPH_FACEBOOK_BASE}/${encodeURIComponent(igUserId)}/${encodeURIComponent(containerId)}`);
  statusUrl.searchParams.set('fields', 'status_code,status');
  statusUrl.searchParams.set('access_token', accessToken);
  return fetchJson(statusUrl.toString(), {}, fetchImpl);
}

async function createReelContainer({ igUserId, accessToken, videoUrl, caption, thumbOffset, shareToFeed = true, fetchImpl = fetch } = {}) {
  const createUrl = new URL(`${GRAPH_FACEBOOK_BASE}/${encodeURIComponent(igUserId)}/media`);
  createUrl.searchParams.set('media_type', 'REELS');
  createUrl.searchParams.set('video_url', videoUrl);
  createUrl.searchParams.set('access_token', accessToken);

  const safeCaption = normalizeString(caption);
  if (safeCaption) {
    createUrl.searchParams.set('caption', safeCaption);
  }

  const safeThumbOffset = toNonNegativeInteger(thumbOffset);
  if (safeThumbOffset !== null) {
    createUrl.searchParams.set('thumb_offset', String(safeThumbOffset));
  }

  createUrl.searchParams.set('share_to_feed', toBoolean(shareToFeed, true) ? 'true' : 'false');

  const container = await fetchJson(createUrl.toString(), { method: 'POST' }, fetchImpl);
  const containerId = normalizeString(container.id || container.creation_id || container.container_id);

  if (!containerId) {
    throw new Error('Instagram did not return a container id.');
  }

  return { containerId, container };
}

async function publishReelContainer({ igUserId, accessToken, containerId, fetchImpl = fetch } = {}) {
  const publishUrl = new URL(`${GRAPH_FACEBOOK_BASE}/${encodeURIComponent(igUserId)}/media_publish`);
  publishUrl.searchParams.set('creation_id', containerId);
  publishUrl.searchParams.set('access_token', accessToken);

  const published = await fetchJson(publishUrl.toString(), { method: 'POST' }, fetchImpl);
  return published;
}

async function publishInstagramReel({
  igUserId,
  accessToken,
  videoUrl,
  caption,
  thumbOffset,
  containerId,
  shareToFeed = true,
  env,
  fetchImpl = fetch,
} = {}) {
  const userId = normalizeString(igUserId);
  const token = normalizeString(accessToken);
  const sourceUrl = normalizeString(videoUrl);

  if (!userId) {
    return {
      status: 400,
      body: { ok: false, error: 'Missing Instagram user id.' },
    };
  }

  if (!token) {
    return {
      status: 400,
      body: { ok: false, error: 'Missing Instagram access token.' },
    };
  }

  if (!sourceUrl) {
    return {
      status: 400,
      body: { ok: false, error: 'Missing video URL.' },
    };
  }

  try {
    let currentContainerId = normalizeString(containerId);

    if (!currentContainerId) {
      const created = await createReelContainer({
        igUserId: userId,
        accessToken: token,
        videoUrl: sourceUrl,
        caption,
        thumbOffset,
        shareToFeed,
        fetchImpl,
      });
      currentContainerId = created.containerId;
    }

    const statusPayload = await getContainerStatus({
      igUserId: userId,
      containerId: currentContainerId,
      accessToken: token,
      fetchImpl,
    });

    const statusCode = normalizeString(statusPayload.status_code || statusPayload.status || '').toUpperCase();

    if (statusCode === 'FINISHED') {
      const published = await publishReelContainer({
        igUserId: userId,
        accessToken: token,
        containerId: currentContainerId,
        fetchImpl,
      });

      return {
        status: 200,
        body: {
          ok: true,
          published: true,
          containerId: currentContainerId,
          mediaId: published.id || published.media_id || null,
          statusCode,
        },
      };
    }

    if (statusCode === 'ERROR' || statusCode === 'FAILED') {
      return {
        status: 502,
        body: {
          ok: false,
          error: statusPayload?.status || statusPayload?.status_code || 'Instagram returned an error while processing the reel.',
          containerId: currentContainerId,
          statusCode,
        },
      };
    }

    return {
      status: 202,
      body: {
        ok: false,
        pending: true,
        containerId: currentContainerId,
        statusCode: statusCode || 'PENDING',
      },
    };
  } catch (error) {
    return {
      status: 502,
      body: buildErrorPayload(error, 'Could not publish Instagram Reel.'),
    };
  }
}

export function createInstagramExchangeHandler({ env, fetchImpl = fetch } = {}) {
  return async function instagramExchangeHandler(req, res) {
    if (req.method === 'OPTIONS') {
      return res.status(204).end();
    }

    const body = req.body || {};
    const result = await exchangeInstagramCode({
      code: body.code,
      redirectUri: body.redirectUri || body.redirect_uri,
      env: getRuntimeEnv(env),
      fetchImpl,
    });
    return sendNodeJson(res, result.status, result.body);
  };
}

export function createInstagramPublishHandler({ env, fetchImpl = fetch } = {}) {
  return async function instagramPublishHandler(req, res) {
    if (req.method === 'OPTIONS') {
      return res.status(204).end();
    }

    const body = req.body || {};
    const result = await publishInstagramReel({
      igUserId: body.igUserId || body.ig_user_id,
      accessToken: body.accessToken || body.access_token,
      videoUrl: body.videoUrl || body.video_url,
      caption: body.caption,
      thumbOffset: body.thumbOffset ?? body.thumb_offset,
      containerId: body.containerId || body.creation_id,
      shareToFeed: body.shareToFeed ?? body.share_to_feed,
      env: getRuntimeEnv(env),
      fetchImpl,
    });
    return sendNodeJson(res, result.status, result.body);
  };
}

export {
  exchangeInstagramCode,
  publishInstagramReel,
  readJsonSafe,
};
