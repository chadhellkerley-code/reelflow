import { createReadStream, createWriteStream } from 'node:fs';
import { mkdir, mkdtemp, rm, stat, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { spawn } from 'node:child_process';
import { put } from '@vercel/blob';
import { VariantTransformer } from '../src/engine/variantTransformer.js';

const JOB_ID = String(process.env.VARIANT_JOB_ID || '').trim();
const SOURCE_URL = String(process.env.VARIANT_SOURCE_URL || '').trim();
const SOURCE_FILE_NAME = String(process.env.VARIANT_SOURCE_NAME || process.env.VARIANT_SOURCE_FILE_NAME || 'variant-input.mp4').trim();
const VARIANT_COUNT = Number.parseInt(String(process.env.VARIANT_COUNT || '0'), 10);
const VARIANT_MODE = String(process.env.VARIANT_MODE || 'fast').trim().toLowerCase();
const STATUS_PATH = String(process.env.VARIANT_STATUS_PATH || '').trim() || `variant-jobs/${JOB_ID}.json`;
const RESULT_PATH = String(process.env.VARIANT_RESULT_PATH || '').trim() || `variant-results/${JOB_ID}/variantes-unicas.zip`;
const BLOB_TOKEN = String(process.env.BLOB_READ_WRITE_TOKEN || '').trim();
const ANALYSIS_FRAME_TIME_RATIO = 0.45;
const VARIANT_SPEED_PROFILES = {
  fast: {
    label: 'Rápido',
    maxAttemptsPerVariant: 3,
    maxFrameSide: 720,
    audioSampleSeconds: 5,
    maxDurationSeconds: 12,
    useAudioSimilarity: false,
  },
  balanced: {
    label: 'Balanceado',
    maxAttemptsPerVariant: 5,
    maxFrameSide: 960,
    audioSampleSeconds: 10,
    maxDurationSeconds: 20,
    useAudioSimilarity: true,
  },
  full: {
    label: 'Completo',
    maxAttemptsPerVariant: 8,
    maxFrameSide: 1280,
    audioSampleSeconds: 20,
    maxDurationSeconds: 0,
    useAudioSimilarity: true,
  },
};
const SPEED_PROFILE = VARIANT_SPEED_PROFILES[VARIANT_MODE] || VARIANT_SPEED_PROFILES.fast;

if (!JOB_ID || !SOURCE_URL || !BLOB_TOKEN || !Number.isFinite(VARIANT_COUNT) || VARIANT_COUNT < 1 || VARIANT_COUNT > 100) {
  throw new Error('Faltan variables del job de variantes.');
}

function nowIso() {
  return new Date().toISOString();
}

function normalizePathPart(value) {
  return String(value || 'variant')
    .replace(/\.[^.]+$/, '')
    .replace(/[^a-z0-9._-]/gi, '-')
    .slice(0, 80) || 'variant';
}

function hammingDistance(a, b) {
  const length = Math.min(a.length, b.length);
  let distance = 0;
  for (let index = 0; index < length; index += 1) {
    if (a[index] !== b[index]) distance += 1;
  }
  return distance + Math.abs(a.length - b.length);
}

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

function estimateSimilarity(signature, previousCopies) {
  for (const previous of previousCopies) {
    if (!previous?.hash || !previous?.audioSignature) continue;
    const distance = hammingDistance(signature.hash, previous.hash);
    const audioSimilarity = cosineSimilarity(signature.audioSignature, previous.audioSignature);
    if (distance < 10 || audioSimilarity > 0.7) {
      return false;
    }
  }
  return true;
}

async function runCommand(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: options.cwd,
      env: options.env || process.env,
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    const stdoutChunks = [];
    const stderrChunks = [];

    child.stdout.on('data', chunk => stdoutChunks.push(Buffer.from(chunk)));
    child.stderr.on('data', chunk => stderrChunks.push(Buffer.from(chunk)));
    child.on('error', reject);
    child.on('close', code => {
      const stdout = Buffer.concat(stdoutChunks);
      const stderr = Buffer.concat(stderrChunks).toString('utf8');
      if (code !== 0) {
        const error = new Error(`${command} falló con código ${code}${stderr ? `: ${stderr}` : ''}`);
        error.stderr = stderr;
        error.code = code;
        reject(error);
        return;
      }

      resolve({ stdout, stderr });
    });
  });
}

async function downloadToFile(url, filePath) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`No se pudo descargar el video base (${response.status}).`);
  }
  if (!response.body) {
    throw new Error('La descarga del video base no devolvió contenido.');
  }

  await pipeline(Readable.fromWeb(response.body), createWriteStream(filePath));
}

async function probeMediaInfo(filePath) {
  const { stdout } = await runCommand('ffprobe', [
    '-v', 'error',
    '-print_format', 'json',
    '-show_format',
    '-show_streams',
    filePath,
  ]);

  const info = JSON.parse(stdout.toString('utf8') || '{}');
  const videoStream = Array.isArray(info.streams)
    ? info.streams.find(stream => stream.codec_type === 'video')
    : null;
  const audioStream = Array.isArray(info.streams)
    ? info.streams.find(stream => stream.codec_type === 'audio')
    : null;

  return {
    width: Number(videoStream?.width || 0),
    height: Number(videoStream?.height || 0),
    duration: Number(info?.format?.duration || videoStream?.duration || 0),
    hasAudio: Boolean(audioStream),
  };
}

async function extractRawFrame(filePath, timeSeconds) {
  const target = Number.isFinite(timeSeconds) ? Math.max(0, timeSeconds) : 0.5;
  const { stdout } = await runCommand('ffmpeg', [
    '-hide_banner',
    '-loglevel', 'error',
    '-nostdin',
    '-ss', target.toFixed(3),
    '-i', filePath,
    '-frames:v', '1',
    '-vf', 'scale=32:32:force_original_aspect_ratio=decrease,pad=32:32:(ow-iw)/2:(oh-ih)/2,format=rgba',
    '-f', 'rawvideo',
    'pipe:1',
  ]);

  return stdout;
}

async function extractAudioSamples(filePath, sampleSeconds = 20) {
  const { stdout } = await runCommand('ffmpeg', [
    '-hide_banner',
    '-loglevel', 'error',
    '-nostdin',
    '-i', filePath,
    '-vn',
    '-ac', '1',
    '-ar', '8000',
    '-t', String(sampleSeconds),
    '-f', 's16le',
    'pipe:1',
  ]);

  return stdout;
}

function computePhashFromRawRgba(buffer, width = 32, height = 32) {
  const size = 16;
  const small = 8;
  const grayscale = new Array(size * size).fill(0);
  const sampleSize = Math.max(1, Math.floor(width / size));

  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      let sum = 0;
      let count = 0;
      for (let yy = 0; yy < sampleSize; yy += 1) {
        for (let xx = 0; xx < sampleSize; xx += 1) {
          const px = Math.min(width - 1, x * sampleSize + xx);
          const py = Math.min(height - 1, y * sampleSize + yy);
          const index = (py * width + px) * 4;
          const r = buffer[index] || 0;
          const g = buffer[index + 1] || 0;
          const b = buffer[index + 2] || 0;
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

function computeAudioSignatureFromPcm(buffer) {
  const samples = new Int16Array(buffer.buffer, buffer.byteOffset, Math.floor(buffer.byteLength / 2));
  const bands = 64;
  const step = Math.max(1, Math.floor(samples.length / bands));
  const signature = [];

  for (let i = 0; i < bands; i += 1) {
    let sum = 0;
    let count = 0;
    for (let j = 0; j < step; j += 1) {
      const sample = samples[i * step + j] || 0;
      sum += Math.abs(sample) / 32768;
      count += 1;
    }
    signature.push(sum / Math.max(1, count));
  }

  return signature;
}

async function saveStatus(statusPath, status, extra = {}) {
  const payload = {
    ok: true,
    jobId: JOB_ID,
    updatedAt: nowIso(),
    ...status,
    ...extra,
  };

  const blob = await put(statusPath, JSON.stringify(payload, null, 2), {
    access: 'public',
    addRandomSuffix: false,
    allowOverwrite: true,
    contentType: 'application/json; charset=utf-8',
    multipart: false,
    token: BLOB_TOKEN,
  });

  return { payload, blob };
}

async function zipFiles(zipPath, files, cwd) {
  await runCommand('zip', ['-j', '-q', zipPath, ...files], { cwd });
}

async function main() {
  const workDir = await mkdtemp(path.join(tmpdir(), 'reelflow-variants-'));
  const inputPath = path.join(workDir, normalizePathPart(SOURCE_FILE_NAME) || 'source.mp4');
  const outputDir = path.join(workDir, 'output');
  await mkdir(outputDir, { recursive: true });

  let status = {
    status: 'queued',
    progress: 5,
    message: `Job recibido. Descargando el video base (${SPEED_PROFILE.label.toLowerCase()})...`,
    sourceUrl: SOURCE_URL,
    sourceFileName: SOURCE_FILE_NAME,
    variantCount: VARIANT_COUNT,
    variantMode: VARIANT_MODE,
    statusPath: STATUS_PATH,
    resultPath: RESULT_PATH,
    createdAt: nowIso(),
  };
  await saveStatus(STATUS_PATH, status);

  try {
    await downloadToFile(SOURCE_URL, inputPath);
    status = { ...status, status: 'processing', progress: 12, message: 'Video base descargado. Analizando metadatos...' };
    await saveStatus(STATUS_PATH, status);

    const metadata = await probeMediaInfo(inputPath);
    const hasAudio = metadata.hasAudio;
    const frameSize = VariantTransformer.resolveFrameSize(metadata, SPEED_PROFILE.maxFrameSide) || {
      width: Math.max(2, metadata.width || 1080),
      height: Math.max(2, metadata.height || 1920),
    };

    const previousAccepted = [];
    const manifestEntries = [];
    const inputBaseName = path.basename(inputPath);

    for (let i = 1; i <= VARIANT_COUNT; i += 1) {
      const variantNum = String(i).padStart(3, '0');
      const outputName = `variant-${variantNum}.mp4`;
      const outputPath = path.join(outputDir, outputName);
      const outputRelativePath = path.join('output', outputName);
      let accepted = false;

      for (let attempt = 0; attempt < SPEED_PROFILE.maxAttemptsPerVariant; attempt += 1) {
        const transforms = VariantTransformer.generateRandomTransforms(i, attempt);
        const pctBefore = Math.round(12 + (((i - 1) / VARIANT_COUNT) * 78));
        status = {
          ...status,
          status: 'processing',
          progress: pctBefore,
          message: `Procesando variante ${i}/${VARIANT_COUNT} · ${SPEED_PROFILE.label} (intento ${attempt + 1})...`,
        };
        await saveStatus(STATUS_PATH, status);

        const ffmpegArgs = [
          '-hide_banner',
          '-loglevel', 'error',
          '-nostdin',
          '-y',
          '-threads', '0',
          ...VariantTransformer.buildFFmpegCommand(
            inputBaseName,
            outputRelativePath,
            transforms,
            hasAudio,
            frameSize,
            SPEED_PROFILE.maxDurationSeconds,
          ),
        ];

        await runCommand('ffmpeg', ffmpegArgs, { cwd: workDir });

        const duration = Math.max(0, Number(metadata.duration || 0));
        const frameTime = duration > 0
          ? Math.min(Math.max(duration * ANALYSIS_FRAME_TIME_RATIO, 0.05), Math.max(duration - 0.05, 0.05))
          : 0.45;

        const frameBuffer = await extractRawFrame(outputPath, frameTime);
        const hash = computePhashFromRawRgba(frameBuffer);
        const audioSignature = hasAudio && SPEED_PROFILE.useAudioSimilarity
          ? computeAudioSignatureFromPcm(await extractAudioSamples(outputPath, SPEED_PROFILE.audioSampleSeconds))
          : null;
        const signature = { hash, audioSignature };

        if (!estimateSimilarity(signature, previousAccepted)) {
          await rm(outputPath, { force: true });
          status = {
            ...status,
            status: 'processing',
            progress: pctBefore,
            message: `Variante ${i}/${VARIANT_COUNT} muy parecida. Reintentando con otro combo...`,
          };
          await saveStatus(STATUS_PATH, status);
          continue;
        }

        accepted = true;
        previousAccepted.push(signature);
        const outputStats = await stat(outputPath);
        manifestEntries.push({
          filename: outputName,
          size_mb: outputStats.size / 1024 / 1024,
          transforms,
          phash: hash,
          audio_signature: audioSignature,
          attempts: attempt + 1,
          unique_check_passed: true,
        });

        status = {
          ...status,
          status: 'processing',
          progress: Math.round(12 + ((i / VARIANT_COUNT) * 78)),
          message: `Variante ${i}/${VARIANT_COUNT} lista.`,
        };
        await saveStatus(STATUS_PATH, status);
        break;
      }

      if (!accepted) {
        throw new Error(`No se pudo generar la variante ${variantNum} sin duplicados.`);
      }
    }

    const manifest = {
      generated_at: nowIso(),
      original_file: SOURCE_FILE_NAME,
      total_variants: VARIANT_COUNT,
      variants: manifestEntries.map(entry => ({
        filename: entry.filename,
        size_mb: Number(entry.size_mb).toFixed(2),
        transforms: entry.transforms,
        phash: entry.phash,
        audio_signature: entry.audio_signature,
        attempts: entry.attempts,
        unique_check_passed: entry.unique_check_passed,
      })),
    };

    const manifestPath = path.join(outputDir, 'manifest.json');
    await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);

    const zipPath = path.join(workDir, 'variantes-unicas.zip');
    const filesToZip = [
      'manifest.json',
      ...manifestEntries.map(entry => entry.filename),
    ];

    status = {
      ...status,
      status: 'processing',
      progress: 95,
      message: 'Empaquetando ZIP final...',
    };
    await saveStatus(STATUS_PATH, status);

    await zipFiles(zipPath, filesToZip, outputDir);

    status = {
      ...status,
      status: 'processing',
      progress: 98,
      message: 'Subiendo ZIP final a Blob...',
    };
    await saveStatus(STATUS_PATH, status);

    const zipBlob = await put(RESULT_PATH, createReadStream(zipPath), {
      access: 'public',
      addRandomSuffix: false,
      allowOverwrite: true,
      contentType: 'application/zip',
      multipart: true,
      token: BLOB_TOKEN,
    });

    status = {
      ...status,
      status: 'completed',
      progress: 100,
      message: 'ZIP listo para descargar.',
      resultUrl: zipBlob.url,
      downloadUrl: zipBlob.downloadUrl,
      resultName: 'variantes-unicas.zip',
      completedAt: nowIso(),
    };
    await saveStatus(STATUS_PATH, status);
  } catch (error) {
    status = {
      ...status,
      status: 'error',
      progress: status.progress || 0,
      message: error?.message || 'No se pudo completar la generación.',
      error: error?.message || 'No se pudo completar la generación.',
      failedAt: nowIso(),
    };
    await saveStatus(STATUS_PATH, status).catch(() => {});
    throw error;
  } finally {
    await rm(workDir, { recursive: true, force: true }).catch(() => {});
  }
}

await main();
