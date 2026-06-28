import { proxyToCloudRun } from './_proxy.js';

export default async function handler(req, res) {
  return proxyToCloudRun(req, res, '/health');
}
