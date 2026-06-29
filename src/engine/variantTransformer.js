/**
 * VariantTransformer
 *
 * Genera variantes de un video con transformaciones mínimas e imperceptibles.
 * Cada variante usa un combo reproducible de crop, zoom, speed, silencio inicial y gamma.
 */
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
    const normalized = ((variantNumber - 1) % 30) + 1;
    const familyIndex = (normalized - 1) % 6;
    const tierIndex = Math.floor((normalized - 1) / 6);
    const attemptIndex = Math.max(0, Math.floor(Number(attempt) || 0));

    const basePresets = [
      { crop: 100, zoom: 1.000, speed: 0.985, silenceMs: 82, gamma: 0.98 },
      { crop: 99, zoom: 1.001, speed: 0.991, silenceMs: 90, gamma: 0.99 },
      { crop: 100, zoom: 1.002, speed: 0.997, silenceMs: 98, gamma: 1.00 },
      { crop: 99, zoom: 1.003, speed: 1.003, silenceMs: 106, gamma: 0.99 },
      { crop: 100, zoom: 1.001, speed: 1.009, silenceMs: 114, gamma: 0.98 },
      { crop: 99, zoom: 1.002, speed: 1.015, silenceMs: 122, gamma: 1.00 },
    ];

    const preset = basePresets[familyIndex];

    return {
      crop: Math.max(97, Math.min(100, preset.crop - (tierIndex % 2))),
      zoom: this._toFixed(preset.zoom + (tierIndex * 0.0002) + (attemptIndex * 0.0001), 3),
      speed: this._toFixed(preset.speed + (tierIndex * 0.001) + (attemptIndex * 0.001), 3),
      silenceMs: preset.silenceMs + (tierIndex * 6) + (attemptIndex * 3),
      gamma: this._toFixed(
        Math.max(0.98, Math.min(1, preset.gamma - (tierIndex * 0.002) + ((attemptIndex % 2) * 0.001))),
        2,
      ),
    };
  }

  /**
   * Redondea un número a N decimales.
   * @private
   */
  static _toFixed(num, decimals) {
    return Number(num.toFixed(decimals));
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
    const cropRatio = Math.max(0.97, Math.min(1, Number(transforms?.crop || 100) / 100));
    const zoom = Math.max(1, Number(transforms?.zoom || 1));
    const speed = Math.max(1, Number(transforms?.speed || 1));
    const silenceMs = Math.max(0, Math.round(Number(transforms?.silenceMs || 0)));
    const gamma = Math.max(0.98, Math.min(1, Number(transforms?.gamma || 1)));
    const targetFrame = this.resolveFrameSize(frameSize, 1280);
    const targetWidth = Number.isFinite(Number(targetFrame?.width)) ? Number(targetFrame.width) : 0;
    const targetHeight = Number.isFinite(Number(targetFrame?.height)) ? Number(targetFrame.height) : 0;

    const videoFilters = [
      `crop=w='trunc(iw*${cropRatio} / 2) * 2':h='trunc(ih*${cropRatio} / 2) * 2':x='(iw-ow)/2':y='(ih-oh)/2'`,
      `scale=w='trunc(iw*${zoom} / 2) * 2':h='trunc(ih*${zoom} / 2) * 2'`,
      targetWidth && targetHeight
        ? `crop=${targetWidth}:${targetHeight}:(in_w-${targetWidth})/2:(in_h-${targetHeight})/2`
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
