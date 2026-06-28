import { publishInstagramReel, readJsonSafe } from '../../../lib/instagram.js';

const JSON_HEADERS = {
  'content-type': 'application/json; charset=utf-8',
  'access-control-allow-origin': '*',
  'access-control-allow-methods': 'POST, OPTIONS',
  'access-control-allow-headers': 'content-type',
};

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: JSON_HEADERS,
  });
}

export async function onRequestOptions() {
  return new Response(null, { status: 204, headers: JSON_HEADERS });
}

export async function onRequestPost({ request, env }) {
  const body = await readJsonSafe(request);
  const result = await publishInstagramReel({
    igUserId: body.igUserId || body.ig_user_id,
    accessToken: body.accessToken || body.access_token,
    videoUrl: body.videoUrl || body.video_url,
    caption: body.caption,
    thumbOffset: body.thumbOffset ?? body.thumb_offset,
    containerId: body.containerId || body.creation_id,
    shareToFeed: body.shareToFeed ?? body.share_to_feed,
    env,
  });

  return json(result.body, result.status);
}
