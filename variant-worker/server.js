import express from 'express';
import cors from 'cors';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { createJobsRouter } from './routes/jobs.js';
import { createJobScheduler } from './services/jobScheduler.js';
import { createJobStore } from './services/jobStore.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT || 8080);
const TMP_DIR = process.env.TMP_DIR || path.join(__dirname, 'temp');
const MAX_PARALLEL_JOBS = Number(process.env.MAX_PARALLEL_JOBS || 0);
const MAX_VARIANTS = Number(process.env.MAX_VARIANTS || 100);

await fs.mkdir(TMP_DIR, { recursive: true });

const app = express();
const jobStore = createJobStore();
const scheduler = createJobScheduler({
  maxParallelJobs: MAX_PARALLEL_JOBS,
});

app.use(cors());
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true }));

app.get('/health', (_req, res) => {
  res.json({
    ok: true,
    service: 'variant-worker',
    maxParallelJobs: scheduler.getLimit(),
    maxVariants: MAX_VARIANTS,
  });
});

app.use('/jobs', createJobsRouter({
  tmpDir: TMP_DIR,
  jobStore,
  scheduler,
  maxVariants: MAX_VARIANTS,
}));

app.use((_req, res) => {
  res.status(404).json({ error: 'Not found' });
});

app.listen(PORT, () => {
  console.log(`variant-worker listening on ${PORT}`);
});
