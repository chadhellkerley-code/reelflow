import fs from 'fs/promises';
import { createWriteStream } from 'fs';
import path from 'path';
import archiver from 'archiver';
import { VariantTransformer } from '../ffmpeg/variantTransformer.js';
import {
  extractAudioSignature,
  extractFrameImageData,
  probeMedia,
  runFfmpegCommand,
} from './ffmpegService.js';

function cosineSimilarity(a, b) {
  const length = Math.min(a.length, b.length);
  let dot = 0;
  let magA = 0;
  let magB = 0;
  for (let index = 0; index < length; index += 1) {
    dot += a[index] * b[index];
    magA += a[index] * a[index];
    magB += b[index] * b[index];
  }
  if (!magA || !magB) return 0;
  return dot / (Math.sqrt(magA) * Math.sqrt(magB));
}

function hammingDistance(a, b) {
  const length = Math.min(a.length, b.length);
  let distance = 0;
  for (let index = 0; index < length; index += 1) {
    if (a[index] !== b[index]) distance += 1;
  }
  return distance + Math.abs(a.length - b.length);
}

function estimateSimilarity(signature, previousAccepted) {
  for (const previous of previousAccepted) {
    if (!previous?.hash || !previous?.audioSignature) continue;
    const distance = hammingDistance(signature.hash, previous.hash);
    const audioSimilarity = cosineSimilarity(signature.audioSignature, previous.audioSignature);
    if (distance < 10 || audioSimilarity > 0.7) {
      return false;
    }
  }
  return true;
}

function computePhashFromImageData(imageData) {
  const size = 16;
  const small = 8;
  const grayscale = new Array(size * size).fill(0);
  const data = imageData.data;
  const sampleSize = Math.max(1, Math.floor(32 / size));

  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      let sum = 0;
      let count = 0;
      for (let yy = 0; yy < sampleSize; yy += 1) {
        for (let xx = 0; xx < sampleSize; xx += 1) {
          const px = Math.min(31, x * sampleSize + xx);
          const py = Math.min(31, y * sampleSize + yy);
          const index = (py * 32 + px) * 4;
          const r = data[index];
          const g = data[index + 1];
          const b = data[index + 2];
          sum += (0.299 * r + 0.587 * g + 0.114 * b);
          count += 1;
        }
      }
      grayscale[y * size + x] = sum / Math.max(1, count);
    }
  }

  const coeffs = [];
  for (let u = 0; u < size; u += 1) {
    for (let v = 0; v < size; v += 1) {
      let total = 0;
      for (let x = 0; x < size; x += 1) {
        for (let y = 0; y < size; y += 1) {
          total += grayscale[y * size + x]
            * Math.cos(((2 * x + 1) * u * Math.PI) / (2 * size))
            * Math.cos(((2 * y + 1) * v * Math.PI) / (2 * size));
        }
      }
      const cu = u === 0 ? Math.SQRT1_2 : 1;
      const cv = v === 0 ? Math.SQRT1_2 : 1;
      coeffs.push((2 / size) * cu * cv * total);
    }
  }

  const low = [];
  for (let u = 0; u < small; u += 1) {
    for (let v = 0; v < small; v += 1) {
      if (u === 0 && v === 0) continue;
      low.push(coeffs[u * size + v]);
    }
  }

  const sorted = [...low].sort((a, b) => a - b);
  const median = sorted[Math.floor(sorted.length / 2)] || 0;
  return low.map(value => (value > median ? 1 : 0));
}

async function buildManifestZip(job, entries, manifest) {
  const zipPath = path.join(job.tmpDir, 'variantes-unicas.zip');
  await fs.mkdir(job.tmpDir, { recursive: true });

  return new Promise((resolve, reject) => {
    const output = createWriteStream(zipPath);
    const archive = archiver('zip', { zlib: { level: 9 } });
    output.on('close', () => resolve(zipPath));
    output.on('error', reject);
    archive.on('error', reject);
    archive.pipe(output);

    for (const entry of entries) {
      archive.file(entry.path, { name: entry.filename });
    }
    archive.append(JSON.stringify(manifest, null, 2), { name: 'manifest.json' });
    archive.finalize();
  });
}

export async function processVariantUniqueJob(jobStore, jobId) {
  const job = jobStore.getJob(jobId);
  if (!job) return;

  const startedAt = Date.now();
  const previousAccepted = [];
  const acceptedEntries = [];
  const manifestEntries = [];
  const maxAttemptsPerVariant = Number(job.config?.maxAttemptsPerVariant || 2);
  const frameSizes = Array.isArray(job.config?.frameSizes) && job.config.frameSizes.length
    ? job.config.frameSizes
    : [720, 540, 360];

  try {
    jobStore.updateJob(jobId, {
      status: 'running',
      message: 'Inicializando',
      progress: 1,
    });

    const media = await probeMedia(job.sourcePath);
    const hasAudio = Boolean(media.hasAudio);
    const metadata = {
      duration: media.duration,
      width: media.width,
      height: media.height,
    };
    const stageFrameSizes = frameSizes
      .map(maxSide => VariantTransformer.resolveFrameSize(metadata, maxSide))
      .filter(Boolean);

    if (!stageFrameSizes.length) {
      throw new Error('No se pudo resolver el tamaño de frame.');
    }

    for (let i = 1; i <= job.variantCount; i += 1) {
      const variantNum = String(i).padStart(3, '0');
      const outputFileName = `variant-${variantNum}.mp4`;
      const outputPath = path.join(job.tmpDir, outputFileName);
      let acceptedVariant = null;
      let acceptedTransforms = null;
      let acceptedSignature = null;

      jobStore.updateJob(jobId, {
        message: `Procesando variante ${i}/${job.variantCount}`,
        progress: Math.max(1, Math.min(94, Math.round(((i - 1) / job.variantCount) * 100))),
      });

      for (let attempt = 0; attempt < maxAttemptsPerVariant; attempt += 1) {
        const transforms = VariantTransformer.generateRandomTransforms(i, attempt);
        let attemptSucceeded = false;

        for (const [frameIndex, frameSize] of stageFrameSizes.entries()) {
          const stageHasAudio = hasAudio && frameIndex === 0;
          const ffmpegArgs = VariantTransformer.buildFFmpegCommand(
            job.sourcePath,
            outputPath,
            transforms,
            stageHasAudio,
            frameSize,
          );

          const estimatedDuration = Math.max(
            1,
            ((Number(metadata.duration) || 0) / Math.max(1, Number(transforms.speed || 1))) + (Number(transforms.silenceMs || 0) / 1000),
          );
          const variantBase = ((i - 1) / job.variantCount) * 100;
          const variantSpan = 100 / job.variantCount;

          jobStore.updateJob(jobId, {
            message: `Procesando variante ${i}/${job.variantCount}`,
          });

          try {
            await runFfmpegCommand(ffmpegArgs, {
              onProgress: pct => {
                const percent = Number.isFinite(pct)
                  ? Math.max(0, Math.min(1, pct))
                  : 0;
                const stageFraction = (frameIndex + percent) / Math.max(1, stageFrameSizes.length);
                const overall = variantBase + (stageFraction * variantSpan);
                jobStore.updateJob(jobId, {
                  message: `Procesando variante ${i}/${job.variantCount}`,
                  progress: Math.max(1, Math.min(94, Math.round(overall))),
                });
              },
              estimatedDuration,
            });
          } catch (error) {
            await fs.rm(outputPath, { force: true }).catch(() => {});
            throw error;
          }

          const frame = await extractFrameImageData(outputPath, 0.45).catch(() => null);
          const hash = frame ? computePhashFromImageData(frame) : [];
          const audioSignature = stageHasAudio
            ? await extractAudioSignature(outputPath).catch(() => [])
            : [];
          const signature = { hash, audioSignature };

          if (!estimateSimilarity(signature, previousAccepted)) {
            await fs.rm(outputPath, { force: true }).catch(() => {});
            continue;
          }

          acceptedVariant = outputPath;
          acceptedTransforms = transforms;
          acceptedSignature = signature;
          previousAccepted.push(signature);
          acceptedEntries.push({ path: outputPath, filename: outputFileName });
          manifestEntries.push({
            filename: outputFileName,
            size_mb: (Number((await fs.stat(outputPath)).size) / 1024 / 1024).toFixed(2),
            transforms: acceptedTransforms,
            phash: hash,
            audio_signature: audioSignature,
            attempts: attempt + 1,
            stage_frame: frameSize,
            unique_check_passed: true,
          });
          attemptSucceeded = true;
          break;
        }

        if (attemptSucceeded) break;
      }

      if (!acceptedVariant || !acceptedTransforms || !acceptedSignature) {
        throw new Error(`No se pudo generar la variante ${variantNum} sin duplicados.`);
      }
    }

    jobStore.updateJob(jobId, {
      message: 'Comprimiendo ZIP...',
      progress: 95,
    });

    const manifest = {
      generated_at: new Date().toISOString(),
      original_file: job.sourceName,
      total_variants: acceptedEntries.length,
      variants: manifestEntries,
    };
    const zipPath = await buildManifestZip(job, acceptedEntries, manifest);
    const statistics = {
      elapsed_ms: Date.now() - startedAt,
      source: mediaSummary(media),
      total_variants: acceptedEntries.length,
      attempts: manifestEntries.reduce((sum, entry) => sum + Number(entry.attempts || 0), 0),
      stage_frame_sizes: stageFrameSizes,
      max_attempts_per_variant: maxAttemptsPerVariant,
    };

    jobStore.setResult(jobId, {
      zipPath,
      manifest,
      statistics,
    });

    await Promise.all(
      acceptedEntries.map(entry => fs.rm(entry.path, { force: true }).catch(() => {})),
    );
  } catch (error) {
    jobStore.setError(jobId, error);
    throw error;
  } finally {
    const currentJob = jobStore.getJob(jobId);
    if (currentJob?.status !== 'completed') {
      await fs.rm(job.tmpDir, { recursive: true, force: true }).catch(() => {});
    }
  }
}

function mediaSummary(media) {
  return {
    duration: Number(media.duration || 0),
    width: Number(media.width || 0),
    height: Number(media.height || 0),
    hasAudio: Boolean(media.hasAudio),
  };
}
