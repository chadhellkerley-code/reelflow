import { proxyToCloudRun } from '../_proxy.js';

export default async function handler(req, res) {
  const segments = Array.isArray(req.query?.path)
    ? req.query.path
    : req.query?.path
      ? [req.query.path]
      : [];
  const targetPath = segments.length > 0
    ? `/jobs/${segments.map(segment => encodeURIComponent(segment)).join('/')}`
    : '/jobs';

  return proxyToCloudRun(req, res, targetPath);
}
