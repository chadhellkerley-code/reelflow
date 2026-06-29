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

function writeEvent(res, event) {
  res.write(`${JSON.stringify(event)}\n`);
}

function isFinalJobState(job) {
  return job?.status === 'completed' || job?.status === 'failed';
}

function snapshotJob(job) {
  return getJobResponse(job);
}

async function waitForJobState(jobStore, jobId, previousSignature) {
  const job = jobStore.getJob(jobId);
  if (!job) {
    return { job: null, signature: previousSignature };
  }

  const snapshot = snapshotJob(job);
  const signature = JSON.stringify([
    snapshot?.status,
    snapshot?.progress,
    snapshot?.message,
    snapshot?.error || '',
    snapshot?.result?.zipUrl || '',
  ]);

  if (signature !== previousSignature) {
    return { job: snapshot, signature };
  }

  return { job: null, signature: previousSignature };
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

      let job;
      try {
        if (!req.file) {
          await fs.mkdir(path.dirname(sourcePath), { recursive: true });
          await downloadSourceFile(sourceUrl, sourcePath);
        }

        job = jobStore.createJob({
          id: req.jobId,
          sourcePath,
          sourceName,
          tmpDir: jobDir,
          variantCount,
          config,
        });
      } catch (error) {
        return res.status(500).json({
          error: error?.message || 'The worker could not prepare the job.',
        });
      }

      res.status(200);
      res.setHeader('content-type', 'application/x-ndjson; charset=utf-8');
      res.setHeader('cache-control', 'no-cache, no-transform');
      res.setHeader('x-accel-buffering', 'no');
      res.flushHeaders?.();
      writeEvent(res, { type: 'started', job: snapshotJob(job) });

      const jobTask = scheduler.enqueue(() => processVariantUniqueJob(jobStore, job.id))
        .catch(error => {
          jobStore.setError(job.id, error);
          return null;
        });

      let lastSignature = '';

      while (true) {
        const { job: nextSnapshot, signature } = await waitForJobState(jobStore, job.id, lastSignature);
        lastSignature = signature;
        if (nextSnapshot) {
          writeEvent(res, { type: 'progress', job: nextSnapshot });
        }

        const currentJob = jobStore.getJob(job.id);
        if (isFinalJobState(currentJob)) {
          break;
        }

        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      await jobTask.catch(() => {});

      const finalJob = jobStore.getJob(job.id);
      if (!finalJob || finalJob.status !== 'completed' || !finalJob.result?.zipPath) {
        writeEvent(res, {
          type: 'error',
          job: snapshotJob(finalJob),
          error: finalJob?.error || 'The worker did not generate a ZIP archive.',
        });
        return res.end();
      }

      writeEvent(res, {
        type: 'done',
        job: snapshotJob(finalJob),
        downloadUrl: `/jobs/${finalJob.id}/download`,
      });

      return res.end();
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
