function sendJson(res, status, body) {
  res.setHeader('content-type', 'application/json; charset=utf-8');
  res.status(status).json(body);
}

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return sendJson(res, 405, { ok: false, error: 'Method not allowed.' });
  }

  return sendJson(res, 200, {
    ok: Boolean(process.env.BLOB_READ_WRITE_TOKEN),
    configured: Boolean(process.env.BLOB_READ_WRITE_TOKEN),
  });
}
