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
   * @param {number} index
   * @param {number} [attempt=0]
   * @returns {{crop:number, zoom:number, speed:number, silenceMs:number, gamma:number}}
   */
  static generateRandomTransforms(index, attempt = 0) {
    const seed = (Number(index) || 0) * 7919 + (Number(attempt) || 0) * 104729;

    return {
      crop: Math.floor(this._seededRandom(seed, 97, 101)),
      zoom: this._toFixed(1 + this._seededRandom(seed + 1, 0, 0.02), 3),
      speed: this._toFixed(1 + this._seededRandom(seed + 2, 0, 0.03), 3),
      silenceMs: Math.floor(this._seededRandom(seed + 3, 80, 151)),
      gamma: this._toFixed(0.98 + this._seededRandom(seed + 4, 0, 0.02), 2),
    };
  }

  /**
   * Random seeded: valor reproducible entre min y max.
   * @private
   */
  static _seededRandom(seed, min, max) {
    const x = Math.sin(seed) * 10000;
    const rand = x - Math.floor(x);
    return min + rand * (max - min);
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
