import { handleUpload } from '@vercel/blob/client';

function sendJson(res, status, body) {
  res.setHeader('content-type', 'application/json; charset=utf-8');
  res.status(status).json(body);
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return sendJson(res, 405, { error: 'Method not allowed.' });
  }

  try {
    const jsonResponse = await handleUpload({
      body: req.body,
      request: req,
      token: process.env.BLOB_READ_WRITE_TOKEN,
      onBeforeGenerateToken: async (pathname) => {
        if (!pathname.match(/\.(mp4|mov|m4v|webm)$/i)) {
          throw new Error('Only video files are allowed.');
        }

        return {
          allowedContentTypes: [
            'video/mp4',
            'video/quicktime',
            'video/x-m4v',
            'video/webm',
          ],
          maximumSizeInBytes: 500 * 1024 * 1024,
          addRandomSuffix: true,
          tokenPayload: JSON.stringify({ uploadedAt: Date.now() }),
        };
      },
      onUploadCompleted: async () => {},
    });

    return sendJson(res, 200, jsonResponse);
  } catch (error) {
    return sendJson(res, 400, {
      error: error.message || 'Could not upload video.',
    });
  }
}
