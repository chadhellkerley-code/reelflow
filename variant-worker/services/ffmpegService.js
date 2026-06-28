import { spawn } from 'child_process';
import fs from 'fs/promises';

function resolveBinary(envKeys, fallback) {
  for (const key of envKeys) {
    const value = process.env[key];
    if (value && String(value).trim()) {
      return String(value).trim();
    }
  }
  return fallback;
}

function runCommand(command, args, {
  cwd,
  onProgress,
  estimatedDuration,
  prependArgs = [],
} = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, [...prependArgs, ...args], {
      cwd,
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    const stdout = [];
    const stderr = [];
    let progressBuffer = '';

    child.stdout.on('data', chunk => stdout.push(chunk));
    child.stderr.on('data', chunk => {
      stderr.push(chunk);
      progressBuffer += chunk.toString('utf8');

      if (!onProgress) return;
      const lines = progressBuffer.split(/\r?\n/);
      progressBuffer = lines.pop() || '';
      for (const line of lines) {
        const [key, value] = line.split('=');
        if (!value) continue;
        if (key === 'out_time_ms' && estimatedDuration) {
          const elapsed = Number(value) / 1000000;
          onProgress(Math.max(0, Math.min(1, elapsed / estimatedDuration)));
        }
        if (key === 'progress' && value === 'end') {
          onProgress(1);
        }
      }
    });

    child.on('error', reject);
    child.on('close', code => {
      const result = {
        code,
        stdout: Buffer.concat(stdout),
        stderr: Buffer.concat(stderr).toString('utf8'),
      };
      if (code === 0) {
        resolve(result);
        return;
      }
      const error = new Error(result.stderr || `Command failed with exit code ${code}`);
      error.code = code;
      error.stderr = result.stderr;
      reject(error);
    });
  });
}

export async function runFfmpegCommand(args, options = {}) {
  const ffmpegBin = resolveBinary(['FFMPEG_BIN', 'FFMPEG_PATH'], 'ffmpeg');
  await runCommand(ffmpegBin, args, {
    ...options,
    prependArgs: ['-hide_banner', '-loglevel', 'error', '-nostats', '-progress', 'pipe:2'],
  });
}

export async function probeMedia(filePath) {
  const ffprobeBin = resolveBinary(['FFPROBE_BIN', 'FFPROBE_PATH'], 'ffprobe');
  const { stdout } = await runCommand(ffprobeBin, [
    '-v', 'error',
    '-print_format', 'json',
    '-show_format',
    '-show_streams',
    filePath,
  ]);

  const parsed = JSON.parse(stdout.toString('utf8') || '{}');
  const streams = Array.isArray(parsed.streams) ? parsed.streams : [];
  const videoStream = streams.find(stream => stream.codec_type === 'video') || {};
  const hasAudio = streams.some(stream => stream.codec_type === 'audio');
  const formatDuration = Number(parsed?.format?.duration || 0);
  const streamDuration = Number(videoStream.duration || 0);

  return {
    duration: Number.isFinite(formatDuration) && formatDuration > 0
      ? formatDuration
      : Number.isFinite(streamDuration) && streamDuration > 0
        ? streamDuration
        : 0,
    width: Number(videoStream.width || 0),
    height: Number(videoStream.height || 0),
    hasAudio,
  };
}

export async function extractFrameImageData(filePath, time = 0.45) {
  const ffmpegBin = resolveBinary(['FFMPEG_BIN', 'FFMPEG_PATH'], 'ffmpeg');
  const { stdout } = await runCommand(ffmpegBin, [
    '-ss', String(time),
    '-i', filePath,
    '-frames:v', '1',
    '-vf', 'scale=32:32:flags=bicubic',
    '-f', 'rawvideo',
    '-pix_fmt', 'rgba',
    'pipe:1',
  ], {
    prependArgs: ['-hide_banner', '-loglevel', 'error', '-nostats'],
  });

  const buffer = stdout;
  if (buffer.length < 32 * 32 * 4) {
    return null;
  }

  return {
    data: new Uint8ClampedArray(buffer.subarray(0, 32 * 32 * 4)),
    width: 32,
    height: 32,
  };
}

export async function extractAudioSignature(filePath) {
  const ffmpegBin = resolveBinary(['FFMPEG_BIN', 'FFMPEG_PATH'], 'ffmpeg');
  const { stdout } = await runCommand(ffmpegBin, [
    '-i', filePath,
    '-vn',
    '-ac', '1',
    '-ar', '44100',
    '-f', 's16le',
    'pipe:1',
  ], {
    prependArgs: ['-hide_banner', '-loglevel', 'error', '-nostats'],
  });

  const audio = stdout;
  if (!audio.length) return [];

  const samples = new Int16Array(audio.buffer, audio.byteOffset, Math.floor(audio.length / 2));
  const floats = Array.from(samples, sample => Math.abs(sample / 32768));
  const bands = 64;
  const step = Math.max(1, Math.floor(floats.length / bands));
  const signature = [];
  for (let index = 0; index < bands; index += 1) {
    let sum = 0;
    let count = 0;
    for (let offset = 0; offset < step; offset += 1) {
      const value = floats[index * step + offset] || 0;
      sum += value;
      count += 1;
    }
    signature.push(sum / Math.max(1, count));
  }
  return signature;
}
