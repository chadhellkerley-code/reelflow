import express from 'express';
import multer from 'multer';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { createJobsController } from '../controllers/jobsController.js';

function sanitizeFilename(name = 'video.mp4') {
  const base = path.basename(String(name || 'video.mp4'));
  const safe = base.replace(/[^a-z0-9._-]/gi, '-');
  return safe || 'video.mp4';
}

function createUploadMiddleware(tmpDir) {
  const storage = multer.diskStorage({
    destination: (req, _file, cb) => {
      const jobDir = path.join(tmpDir, 'jobs', req.jobId);
      fs.mkdir(jobDir, { recursive: true }, err => cb(err, jobDir));
    },
    filename: (_req, file, cb) => {
      cb(null, `source-${Date.now()}-${sanitizeFilename(file.originalname)}`);
    },
  });

  return multer({ storage });
}

export function createJobsRouter({ tmpDir, jobStore, scheduler, maxVariants }) {
  const router = express.Router();
  const controller = createJobsController({
    tmpDir,
    jobStore,
    scheduler,
    maxVariants,
  });
  const upload = createUploadMiddleware(tmpDir);

  router.use((req, _res, next) => {
    req.jobId = crypto.randomUUID();
    next();
  });

  router.post(
    '/variant-unique',
    upload.single('video'),
    controller.postVariantUniqueJob,
  );

  router.get('/:id', controller.getJob);
  router.get('/:id/download', controller.downloadJobResult);

  return router;
}
