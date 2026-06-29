/**
 * VariantTransformer
 *
 * Genera variantes de un video con transformaciones mínimas e imperceptibles.
 * Cada variante usa un combo reproducible de crop, zoom, speed, silencio inicial y gamma.
 */

const VARIANT_PRESETS = Object.freeze([
  { crop: 100, zoom: 1.000, speed: 0.920, silenceMs: 0, gamma: 0.96, panX: -0.08, panY: -0.08 },
  { crop: 99, zoom: 1.008, speed: 0.940, silenceMs: 20, gamma: 0.98, panX: -0.04, panY: -0.08 },
  { crop: 98, zoom: 1.016, speed: 0.960, silenceMs: 40, gamma: 1.00, panX: 0.00, panY: -0.08 },
  { crop: 97, zoom: 1.024, speed: 0.980, silenceMs: 60, gamma: 1.02, panX: 0.04, panY: -0.08 },
  { crop: 96, zoom: 1.032, speed: 1.000, silenceMs: 80, gamma: 1.04, panX: 0.08, panY: -0.08 },
  { crop: 95, zoom: 1.040, speed: 1.020, silenceMs: 100, gamma: 1.06, panX: 0.08, panY: -0.04 },
  { crop: 100, zoom: 1.004, speed: 0.930, silenceMs: 16, gamma: 0.97, panX: -0.08, panY: -0.04 },
  { crop: 99, zoom: 1.012, speed: 0.950, silenceMs: 36, gamma: 0.99, panX: -0.04, panY: -0.04 },
  { crop: 98, zoom: 1.020, speed: 0.970, silenceMs: 56, gamma: 1.01, panX: 0.00, panY: -0.04 },
  { crop: 97, zoom: 1.028, speed: 0.990, silenceMs: 76, gamma: 1.03, panX: 0.04, panY: -0.04 },
  { crop: 96, zoom: 1.036, speed: 1.010, silenceMs: 96, gamma: 1.05, panX: 0.08, panY: -0.04 },
  { crop: 95, zoom: 1.044, speed: 1.030, silenceMs: 116, gamma: 1.06, panX: 0.08, panY: 0.00 },
  { crop: 100, zoom: 1.006, speed: 0.940, silenceMs: 12, gamma: 0.98, panX: -0.08, panY: 0.00 },
  { crop: 99, zoom: 1.014, speed: 0.960, silenceMs: 32, gamma: 1.00, panX: -0.04, panY: 0.00 },
  { crop: 98, zoom: 1.022, speed: 0.980, silenceMs: 52, gamma: 1.02, panX: 0.00, panY: 0.00 },
  { crop: 97, zoom: 1.030, speed: 1.000, silenceMs: 72, gamma: 1.04, panX: 0.04, panY: 0.00 },
  { crop: 96, zoom: 1.038, speed: 1.020, silenceMs: 92, gamma: 1.06, panX: 0.08, panY: 0.00 },
  { crop: 95, zoom: 1.046, speed: 1.040, silenceMs: 112, gamma: 1.05, panX: 0.08, panY: 0.04 },
  { crop: 100, zoom: 1.008, speed: 0.950, silenceMs: 24, gamma: 0.97, panX: -0.08, panY: 0.04 },
  { crop: 99, zoom: 1.016, speed: 0.970, silenceMs: 44, gamma: 0.99, panX: -0.04, panY: 0.04 },
  { crop: 98, zoom: 1.024, speed: 0.990, silenceMs: 64, gamma: 1.01, panX: 0.00, panY: 0.04 },
  { crop: 97, zoom: 1.032, speed: 1.010, silenceMs: 84, gamma: 1.03, panX: 0.04, panY: 0.04 },
  { crop: 96, zoom: 1.040, speed: 1.030, silenceMs: 104, gamma: 1.05, panX: 0.08, panY: 0.04 },
  { crop: 95, zoom: 1.048, speed: 1.050, silenceMs: 124, gamma: 1.06, panX: 0.08, panY: 0.08 },
  { crop: 100, zoom: 1.010, speed: 0.960, silenceMs: 28, gamma: 0.98, panX: -0.08, panY: 0.08 },
  { crop: 99, zoom: 1.018, speed: 0.980, silenceMs: 48, gamma: 1.00, panX: -0.04, panY: 0.08 },
  { crop: 98, zoom: 1.026, speed: 1.000, silenceMs: 68, gamma: 1.02, panX: 0.00, panY: 0.08 },
  { crop: 97, zoom: 1.034, speed: 1.020, silenceMs: 88, gamma: 1.04, panX: 0.04, panY: 0.08 },
  { crop: 96, zoom: 1.042, speed: 1.040, silenceMs: 108, gamma: 1.06, panX: 0.08, panY: 0.08 },
  { crop: 95, zoom: 1.050, speed: 1.060, silenceMs: 128, gamma: 1.05, panX: 0.04, panY: 0.08 },
]);
export class VariantTransformer {
  static resolveFrameSize(frameSize, maxSide = 1280) {
    const rawWidth = Number(frameSize?.width);
    const rawHeight = Number(frameSize?.height);
    if (!Number.isFinite(rawWidth) || !Number.isFinite(rawHeight) || rawWidth <= 0 || rawHeight <= 0) {
      return null;
    }

    const width = Math.max(2, Math.round(rawWidth));
    const height = Math.max(2, Math.round(rawHeight));

    const longest = Math.max(width, height);
    const scale = longest > maxSide ? maxSide / longest : 1;
    const nextWidth = Math.max(2, Math.round((width * scale) / 2) * 2);
    const nextHeight = Math.max(2, Math.round((height * scale) / 2) * 2);
    return { width: nextWidth, height: nextHeight };
  }

  /**
   * Genera parámetros reproducibles para una variante.
   * El índice define un preset fijo: 6 familias base x 5 niveles.
   * @param {number} index
   * @param {number} [attempt=0]
   * @returns {{crop:number, zoom:number, speed:number, silenceMs:number, gamma:number}}
   */
  static generateRandomTransforms(index, attempt = 0) {
    const variantNumber = Math.max(1, Math.floor(Number(index) || 1));
    const attemptIndex = Math.max(0, Math.floor(Number(attempt) || 0));
    const preset = VARIANT_PRESETS[(variantNumber - 1) % VARIANT_PRESETS.length];

    if (attemptIndex === 0) {
      return { ...preset };
    }

    return {
      crop: Math.max(90, Math.min(100, preset.crop - 1)),
      zoom: Number((preset.zoom + 0.01).toFixed(3)),
      speed: Number((preset.speed + 0.03).toFixed(3)),
      silenceMs: preset.silenceMs + 24,
      gamma: Number(Math.max(0.92, Math.min(1.08, preset.gamma + 0.02)).toFixed(2)),
      panX: Number((-preset.panX).toFixed(3)),
      panY: Number((-preset.panY).toFixed(3)),
    };
  }

  /**
   * Construye los argumentos FFmpeg para una variante.
   *
   * @param {string} inputPath
   * @param {string} outputPath
   * @param {{crop:number, zoom:number, speed:number, silenceMs:number, gamma:number}} transforms
   * @param {boolean} [hasAudio=true]
   * @param {{width:number, height:number}|null} [frameSize=null]
   * @returns {string[]}
   */
  static buildFFmpegCommand(inputPath, outputPath, transforms, hasAudio = true, frameSize = null) {
    const cropRatio = Math.max(0.90, Math.min(1, Number(transforms?.crop || 100) / 100));
    const zoom = Math.max(1, Number(transforms?.zoom || 1));
    const speed = Math.max(0.8, Number(transforms?.speed || 1));
    const silenceMs = Math.max(0, Math.round(Number(transforms?.silenceMs || 0)));
    const gamma = Math.max(0.92, Math.min(1.08, Number(transforms?.gamma || 1)));
    const targetFrame = this.resolveFrameSize(frameSize, 1280);
    const targetWidth = Number.isFinite(Number(targetFrame?.width)) ? Number(targetFrame.width) : 0;
    const targetHeight = Number.isFinite(Number(targetFrame?.height)) ? Number(targetFrame.height) : 0;
    const panXRatio = Math.max(-0.08, Math.min(0.08, Number(transforms?.panX || 0)));
    const panYRatio = Math.max(-0.08, Math.min(0.08, Number(transforms?.panY || 0)));
    const panXOffset = targetWidth > 0 ? Math.round(panXRatio * targetWidth) : 0;
    const panYOffset = targetHeight > 0 ? Math.round(panYRatio * targetHeight) : 0;
    const panXOffsetExpr = panXOffset >= 0 ? `+${panXOffset}` : `${panXOffset}`;
    const panYOffsetExpr = panYOffset >= 0 ? `+${panYOffset}` : `${panYOffset}`;

    const videoFilters = [
      `crop=w='trunc(iw*${cropRatio} / 2) * 2':h='trunc(ih*${cropRatio} / 2) * 2':x='(iw-ow)/2':y='(ih-oh)/2'`,
      `scale=w='trunc(iw*${zoom} / 2) * 2':h='trunc(ih*${zoom} / 2) * 2'`,
      targetWidth && targetHeight
        ? `crop=${targetWidth}:${targetHeight}:max(0,min(in_w-${targetWidth},(in_w-${targetWidth})/2${panXOffsetExpr})):max(0,min(in_h-${targetHeight},(in_h-${targetHeight})/2${panYOffsetExpr}))`
        : 'crop=iw:ih:0:0',
      `eq=gamma=${gamma}`,
      `setpts=PTS/${speed}`,
    ];

    if (silenceMs > 0) {
      videoFilters.push(`tpad=start_duration=${(silenceMs / 1000).toFixed(3)}:start_mode=clone`);
    }

    videoFilters.push('format=yuv420p');

    const args = ['-i', inputPath, '-filter_complex'];
    const filterParts = [];

    filterParts.push(`[0:v]${videoFilters.join(',')}[v]`);

    if (hasAudio) {
      const audioFilters = [
        `atempo=${speed}`,
      ];

      if (silenceMs > 0) {
        audioFilters.push(`adelay=${silenceMs}|${silenceMs}`);
      }

      filterParts.push(`[0:a]${audioFilters.join(',')}[a]`);
      args.push(filterParts.join(';'), '-map', '[v]', '-map', '[a]');
      args.push(
        '-c:v', 'libx264',
        '-preset', 'ultrafast',
        '-crf', '28',
        '-pix_fmt', 'yuv420p',
        '-c:a', 'aac',
        '-b:a', '128k',
        '-shortest',
        '-movflags', 'faststart',
        outputPath,
      );
      return args;
    }

    args.push(filterParts.join(';'), '-map', '[v]');
    args.push(
      '-an',
      '-c:v', 'libx264',
      '-preset', 'ultrafast',
      '-crf', '28',
      '-pix_fmt', 'yuv420p',
      '-shortest',
      '-movflags', 'faststart',
      outputPath,
    );
    return args;
  }

  static buildProxyCommand(inputPath, outputPath, frameSize = null) {
    const proxyFrame = this.resolveFrameSize(frameSize, 960) || { width: 960, height: 1706 };
    return [
      '-i', inputPath,
      '-vf', `scale=${proxyFrame.width}:${proxyFrame.height}:flags=bicubic,format=yuv420p`,
      '-c:v', 'libx264',
      '-preset', 'ultrafast',
      '-crf', '32',
      '-c:a', 'aac',
      '-b:a', '96k',
      '-movflags', 'faststart',
      outputPath,
    ];
  }
}
