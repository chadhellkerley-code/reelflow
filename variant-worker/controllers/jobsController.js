import path from 'path';
import fs from 'fs/promises';
import { createWriteStream } from 'fs';
import { pipeline } from 'stream/promises';
import { Readable } from 'stream';
import { processVariantUniqueJob } from '../services/variantUniqueService.js';

function parseConfig(rawConfig) {
  if (!rawConfig) return {};
  if (typeof rawConfig === 'object') return rawConfig;
  try {
    return JSON.parse(String(rawConfig));
  } catch {
    return {};
  }
}

function getJobResponse(job) {
  if (!job) return null;
  const response = {
    jobId: job.id,
    status: job.status,
    message: job.message,
    progress: job.progress,
    createdAt: job.createdAt,
    updatedAt: job.updatedAt,
  };

  if (job.error) {
    response.error = job.error;
  }

  if (job.result) {
    response.result = {
      zipUrl: `/jobs/${job.id}/download`,
      manifest: job.result.manifest,
      statistics: job.result.statistics,
    };
  }

  return response;
}

async function cleanupJobTmpDir(job) {
  if (!job?.tmpDir) return;
  await fs.rm(job.tmpDir, { recursive: true, force: true }).catch(() => {});
}

function isAllowedSourceUrl(rawUrl) {
  try {
    const url = new URL(String(rawUrl || ''));
    return url.protocol === 'https:' && url.hostname === 'storage.googleapis.com';
  } catch {
    return false;
  }
}

async function downloadSourceFile(sourceUrl, destinationPath) {
  const response = await fetch(sourceUrl);
  if (!response.ok || !response.body) {
    throw new Error(`Could not download source video (${response.status}).`);
  }

  await pipeline(
    Readable.fromWeb(response.body),
    createWriteStream(destinationPath),
  );
}

export function createJobsController({ tmpDir, jobStore, scheduler, maxVariants }) {
  return {
    async postVariantUniqueJob(req, res) {
      const variantCount = Number.parseInt(req.body?.cantidadVariantes ?? '0', 10);
      if (!Number.isFinite(variantCount) || variantCount < 1) {
        return res.status(400).json({ error: 'cantidadVariantes must be a positive integer.' });
      }
      if (variantCount > maxVariants) {
        return res.status(400).json({ error: `cantidadVariantes cannot exceed ${maxVariants}.` });
      }

      const config = parseConfig(req.body?.config);
      const sourceUrl = String(req.body?.sourceUrl || req.body?.videoUrl || '').trim();
      const sourceName = String(req.body?.sourceName || req.file?.originalname || 'video.mp4').trim();
      const jobDir = path.join(tmpDir, 'jobs', req.jobId);
      const sourcePath = req.file?.path || path.join(jobDir, `source-${Date.now()}-${sourceName.replace(/[^a-z0-9._-]/gi, '-') || 'video.mp4'}`);

      if (!req.file) {
        if (!sourceUrl) {
          return res.status(400).json({ error: 'Missing video file or sourceUrl.' });
        }
        if (!isAllowedSourceUrl(sourceUrl)) {
          return res.status(400).json({ error: 'Only storage.googleapis.com sourceUrl values are allowed.' });
        }
      }

      if (!req.file) {
        await fs.mkdir(path.dirname(sourcePath), { recursive: true });
        await downloadSourceFile(sourceUrl, sourcePath);
      }

      const job = jobStore.createJob({
        id: req.jobId,
        sourcePath,
        sourceName,
        tmpDir: jobDir,
        variantCount,
        config,
      });

      try {
        await scheduler.enqueue(() => processVariantUniqueJob(jobStore, job.id));
      } catch (error) {
        return res.status(500).json({
          error: error?.message || 'The worker could not complete the task.',
          jobId: job.id,
        });
      }

      if (!job.result?.zipPath) {
        return res.status(500).json({
          error: 'The worker did not generate a ZIP archive.',
          jobId: job.id,
        });
      }

      res.setHeader('X-Job-Id', job.id);
      res.setHeader('X-Job-Status', job.status);
      res.setHeader('X-Job-Progress', String(job.progress));

      return res.download(job.result.zipPath, `variantes-unicas-${job.id}.zip`, async downloadError => {
        if (downloadError) {
          return;
        }
        await cleanupJobTmpDir(job);
      });
    },

    getJob(req, res) {
      const job = jobStore.getJob(req.params.id);
      if (!job) {
        return res.status(404).json({ error: 'Job not found.' });
      }
      return res.json(getJobResponse(job));
    },

    downloadJobResult(req, res) {
      const job = jobStore.getJob(req.params.id);
      if (!job) {
        return res.status(404).json({ error: 'Job not found.' });
      }
      if (job.status !== 'completed' || !job.result?.zipPath) {
        return res.status(409).json({ error: 'Job is not ready.' });
      }

      return res.download(job.result.zipPath, `variantes-unicas-${job.id}.zip`, async downloadError => {
        if (downloadError) {
          return;
        }
        await cleanupJobTmpDir(job);
      });
    },
  };
}
