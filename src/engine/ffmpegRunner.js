import { getSafeZone, getTextBackplate, getTextBlockY } from './layoutEngine.js';
import { fitTextToZone } from './textFitEngine.js';
import { getAnimatedY } from './captionAnimator.js';
import { buildAccentMotionFilters, buildTransitionFilters } from './motionPresets.js';
import { getFormatVisualStyle, getPlanGradeFilters } from './styleEngine.js';

const FFMPEG_CORE_VERSION = '0.12.10';
const OUTPUT_WIDTH = 1080;
const OUTPUT_HEIGHT = 1920;
const FONT_FILE = 'Inter.ttf';
const FONT_URL = 'https://cdn.jsdelivr.net/gh/google/fonts@main/ofl/inter/Inter%5Bopsz,wght%5D.ttf';

let cachedRuntime = null;
let fontLoaded = false;

// Escapes user/model text so FFmpeg drawtext can parse it safely.
function escapeDrawText(value) {
  return String(value || '')
    .replace(/\\/g, '\\\\')
    .replace(/:/g, '\\:')
    .replace(/'/g, "\\'")
    .replace(/%/g, '\\%')
    .replace(/\r?\n/g, ' ')
    .slice(0, 110);
}

// Formats seconds with stable precision for FFmpeg enable expressions.
function formatSeconds(value) {
  const number = Number(value || 0);
  return Number.isFinite(number) ? number.toFixed(3) : '0.000';
}

// Maps timeline text styles to concrete drawtext visual values.
function styleForAction(action, plan) {
  const visualStyle = getFormatVisualStyle(plan?.format);
  const palette = visualStyle.textPalette || {};
  const styles = {
    kinetic_keyword: { minSize: 58, maxSize: 118, color: palette.accent || 'yellow', border: 8, maxLines: 1, uppercase: true, backplate: true, backplateOpacity: 0.16 },
    kinetic_default: { minSize: 46, maxSize: 82, color: palette.primary || 'white', border: 6, maxLines: 1, uppercase: true, backplate: false },
    hook_large: { minSize: 52, maxSize: 86, color: palette.primary || 'white', border: 7, maxLines: 3, uppercase: true, backplate: true, backplateOpacity: 0.34 },
    subtitle_simple: { minSize: 38, maxSize: 54, color: palette.primary || 'white', border: 5, maxLines: 2, uppercase: false, backplate: true, backplateOpacity: 0.28 },
    idea_summary: { minSize: 34, maxSize: 48, color: palette.primary || 'white', border: 4, maxLines: 2, uppercase: false, backplate: true, backplateOpacity: 0.24 },
    countdown_number: { minSize: 120, maxSize: 230, color: palette.primary || 'white', border: 10, maxLines: 1, uppercase: true, backplate: false },
    list_point: { minSize: 42, maxSize: 62, color: palette.accent || 'yellow', border: 5, maxLines: 3, uppercase: true, backplate: true, backplateOpacity: 0.34 },
    documentary_keyword: { minSize: 32, maxSize: 46, color: palette.accent || 'white', border: 3, maxLines: 1, uppercase: true, backplate: true, backplateOpacity: 0.42 },
    context_panel: { minSize: 38, maxSize: 56, color: palette.primary || 'white', border: 2, maxLines: 4, uppercase: false, backplate: false },
    minimal_hook: { minSize: 44, maxSize: 76, color: palette.primary || 'white', border: 4, maxLines: 3, uppercase: false, backplate: false },
    minimal_idea: { minSize: 38, maxSize: 62, color: palette.primary || 'white', border: 3, maxLines: 3, uppercase: false, backplate: true, backplateOpacity: 0.18 },
    minimal_cta: { minSize: 42, maxSize: 66, color: palette.accent || 'white', border: 4, maxLines: 3, uppercase: false, backplate: true, backplateOpacity: 0.26 },
    engagement_question: { minSize: 46, maxSize: 72, color: palette.primary || 'white', border: 6, maxLines: 3, uppercase: false, backplate: true, backplateOpacity: 0.28 },
    pov_hook: { minSize: 46, maxSize: 72, color: palette.primary || 'white', border: 6, maxLines: 3, uppercase: true, backplate: true, backplateOpacity: 0.3 },
  };
  return styles[action.style] || { minSize: 34, maxSize: 54, color: palette.primary || 'white', border: 4, maxLines: 2, uppercase: false, backplate: true, backplateOpacity: 0.24 };
}

// Converts a semantic text position into a drawtext y expression.
function yForPosition(position) {
  const positions = {
    top: 180,
    center: '(h-text_h)/2',
    bottom: 'h-300',
    lower_third: 'h-420',
    panel: 'h-430',
  };
  return positions[position] || positions.center;
}

function buildBackplate(action, fit, style) {
  const start = formatSeconds(action.second);
  const end = formatSeconds(Number(action.second || 0) + Number(action.duration || 1));
  const rect = getTextBackplate(action.position, action.position === 'panel' ? 0 : 22);
  const color = action.position === 'panel'
    ? `black@${style.backplateOpacity ?? 0.18}`
    : `black@${style.backplateOpacity ?? 0.24}`;

  return `drawbox=x=${rect.x}:y=${rect.y}:w=${rect.width}:h=${rect.height}:color=${color}:t=fill:enable='between(t,${start},${end})'`;
}

function buildFormatDesignOverlays(plan) {
  const format = plan?.format || '';
  const overlays = [];

  if (format === 'hook_reveal') {
    overlays.push('drawbox=x=0:y=0:w=1080:h=1920:color=black@0.28:t=fill:enable=lt(t\\,2)');
    overlays.push('drawbox=x=96:y=500:w=888:h=2:color=white@0.42:t=fill:enable=lt(t\\,2)');
    overlays.push('drawbox=x=96:y=1026:w=888:h=2:color=white@0.24:t=fill:enable=lt(t\\,2)');
  }

  if (format === 'documentary_cuts') {
    overlays.push('drawbox=x=64:y=122:w=952:h=2:color=white@0.28:t=fill');
    overlays.push('drawbox=x=64:y=1796:w=952:h=2:color=white@0.18:t=fill');
    overlays.push('drawbox=x=0:y=0:w=1080:h=1920:color=black@0.05:t=fill:enable=lt(mod(t\\,0.5)\\,0.04)');
  }

  if (format === 'minimal_text') {
    overlays.push('drawbox=x=56:y=92:w=968:h=1736:color=white@0.16:t=2');
    overlays.push('drawbox=x=96:y=145:w=180:h=2:color=white@0.38:t=fill');
    overlays.push('drawbox=x=804:y=1774:w=180:h=2:color=white@0.22:t=fill');
  }

  if (format === 'countdown_list') {
    overlays.push('drawbox=x=0:y=0:w=1080:h=1920:color=black@0.08:t=fill');
    overlays.push('drawbox=x=88:y=1200:w=760:h=250:color=black@0.32:t=fill');
  }

  if (format === 'pov_style') {
    overlays.push('drawbox=x=72:y=196:w=936:h=116:color=black@0.34:t=fill:enable=lt(t\\,2)');
    overlays.push('drawbox=x=72:y=316:w=936:h=3:color=white@0.42:t=fill:enable=lt(t\\,2)');
  }

  return overlays;
}

function buildTextLine(action, line, index, fit, style) {
  const start = formatSeconds(action.second);
  const end = formatSeconds(Number(action.second || 0) + Number(action.duration || 1));
  const zone = getSafeZone(action.position);
  const lineStep = Math.round(fit.fontSize * fit.lineHeight);
  const baseY = getTextBlockY(action.position, fit.lines.length, fit.fontSize, fit.lineHeight);
  const y = getAnimatedY(baseY, { ...action, lineStep }, index, formatSeconds);
  const x = `${zone.x}+((${zone.width})-text_w)/2`;

  return `drawtext=fontfile=${FONT_FILE}:text='${escapeDrawText(line)}':x=${x}:y=${y}:fontsize=${fit.fontSize}:fontcolor=${style.color}:borderw=${style.border}:bordercolor=black@0.78:enable='between(t,${start},${end})'`;
}

// Converts a show_text timeline action into safe, auto-fitted drawtext filters.
function buildDrawText(action, plan) {
  if (!action.text) return [];
  const style = styleForAction(action, plan);
  const fit = fitTextToZone(action.text, {
    position: action.position || 'center',
    minSize: style.minSize,
    maxSize: style.maxSize,
    maxLines: style.maxLines,
    uppercase: style.uppercase,
    lineHeight: 1.15,
  });
  const filters = [];

  if (style.backplate) filters.push(buildBackplate(action, fit, style));
  fit.lines.forEach((line, index) => {
    filters.push(buildTextLine(action, line, index, fit, style));
  });

  return filters;
}

// Builds base scaling, cropping, zoom approximation, and split layout filters.
function buildBaseFilters(plan) {
  const strongestZoom = plan.timeline
    .filter(action => action.action === 'zoom')
    .reduce((max, action) => Math.max(max, Number(action.value || 1)), 1);
  const scaleWidth = Math.round(OUTPUT_WIDTH * Math.max(1, Math.min(1.12, strongestZoom)));
  const scaleHeight = Math.round(OUTPUT_HEIGHT * Math.max(1, Math.min(1.12, strongestZoom)));
  const hasSplit = plan.timeline.some(action => action.action === 'layout' && action.type === 'split_context');
  const filters = [
    `scale=${scaleWidth}:${scaleHeight}:force_original_aspect_ratio=increase`,
    `crop=${OUTPUT_WIDTH}:${OUTPUT_HEIGHT}`,
    'setsar=1',
    ...getPlanGradeFilters(plan),
    ...buildFormatDesignOverlays(plan),
  ];

  if (hasSplit) {
    filters.push('drawbox=x=0:y=1138:w=1080:h=782:color=black@0.82:t=fill');
    filters.push('drawbox=x=76:y=1194:w=928:h=2:color=white@0.34:t=fill');
  }

  return filters;
}

// Converts timeline overlay actions into FFmpeg video filters.
function buildOverlayFilters(plan) {
  const filters = [];

  for (const action of plan.timeline || []) {
    if (action.action === 'show_text') {
      filters.push(...buildDrawText(action, plan));
    }
    if (action.action === 'darken') {
      const start = formatSeconds(action.second);
      const end = formatSeconds(Number(action.second || 0) + Number(action.duration || 1));
      filters.push(`drawbox=x=0:y=0:w=iw:h=ih:color=black@${Number(action.opacity || 0.5)}:t=fill:enable='between(t,${start},${end})'`);
    }
    if (action.action === 'background' && action.type === 'blur') {
      const start = formatSeconds(action.second);
      const end = formatSeconds(Number(action.second || 0) + Number(action.duration || 2));
      filters.push(`boxblur=12:enable='between(t,${start},${end})'`);
    }
    if (action.action === 'cut') {
      filters.push(...buildTransitionFilters(action, formatSeconds));
    }
    if (action.action === 'panel_transition') {
      filters.push(...buildAccentMotionFilters(action, formatSeconds));
    }
    if (action.action === 'zoom' && Number(action.duration || 0) <= 0.5) {
      filters.push(...buildAccentMotionFilters(action, formatSeconds));
    }
  }

  return filters.filter(Boolean);
}

// Converts an edit plan timeline into FFmpeg.wasm command arguments.
export function buildFFmpegCommand(inputName, outputName, plan) {
  const filter = [...buildBaseFilters(plan), ...buildOverlayFilters(plan)].join(',');
  return [
    '-i', inputName,
    '-filter_complex', `[0:v]${filter}[v]`,
    '-map', '[v]',
    '-map', '0:a?',
    '-c:v', 'libx264',
    '-preset', 'ultrafast',
    '-crf', '28',
    '-pix_fmt', 'yuv420p',
    '-c:a', 'aac',
    '-b:a', '128k',
    '-shortest',
    '-movflags', 'faststart',
    outputName,
  ];
}

// Loads FFmpeg.wasm and returns { ffmpeg, fetchFile }.
export async function loadFFmpegRuntime(options = {}) {
  if (options.ffmpeg && options.fetchFile) {
    return { ffmpeg: options.ffmpeg, fetchFile: options.fetchFile };
  }
  if (cachedRuntime) return cachedRuntime;

  const [{ FFmpeg }, { fetchFile, toBlobURL }] = await Promise.all([
    import('/vendor/ffmpeg/ffmpeg/index.js'),
    import('/vendor/ffmpeg/util/index.js'),
  ]);
  const ffmpeg = new FFmpeg();
  const baseURL = `https://cdn.jsdelivr.net/npm/@ffmpeg/core@${FFMPEG_CORE_VERSION}/dist/esm`;

  await ffmpeg.load({
    classWorkerURL: '/vendor/ffmpeg/ffmpeg/worker.js',
    coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
    wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
  });

  cachedRuntime = { ffmpeg, fetchFile };
  return cachedRuntime;
}

// Ensures the drawtext font exists in the FFmpeg virtual filesystem.
export async function ensureFont(ffmpeg) {
  if (fontLoaded) return;
  const response = await fetch(FONT_URL);
  if (!response.ok) throw new Error('No se pudo cargar la fuente para subtitulos.');
  await ffmpeg.writeFile(FONT_FILE, new Uint8Array(await response.arrayBuffer()));
  fontLoaded = true;
}

// Processes edit plans sequentially and returns generated MP4 File objects with preview URLs.
export async function renderFormatQueue(videoFile, plans, options = {}) {
  if (!videoFile) throw new Error('Falta el video base para renderizar.');
  if (!Array.isArray(plans) || plans.length === 0) throw new Error('No hay planes de edicion para procesar.');

  const runtime = await loadFFmpegRuntime(options);
  const ffmpeg = runtime.ffmpeg;
  await ensureFont(ffmpeg);

  const inputName = `format-engine-input-${Date.now()}.${videoFile.name.split('.').pop() || 'mp4'}`;
  await ffmpeg.writeFile(inputName, await runtime.fetchFile(videoFile));

  const results = [];
  const onProgress = ({ progress }) => {
    if (!options.activeFormat) return;
    options.onProgress?.({
      format: options.activeFormat,
      progress: Math.max(0, Math.min(100, Math.round((progress || 0) * 100))),
    });
  };

  ffmpeg.on?.('progress', onProgress);

  try {
    for (let index = 0; index < plans.length; index += 1) {
      const plan = plans[index];
      const outputName = `${videoFile.name.replace(/\.[^.]+$/, '').replace(/[^a-z0-9._-]/gi, '-')}-${plan.format}.mp4`;
      options.activeFormat = plan.format;
      options.onFormatStart?.({ plan, index, total: plans.length });

      const command = buildFFmpegCommand(inputName, outputName, plan);
      const code = await ffmpeg.exec(command);
      if (code !== 0) throw new Error(`FFmpeg no pudo renderizar ${plan.format}.`);

      const data = await ffmpeg.readFile(outputName);
      const blob = new Blob([data], { type: 'video/mp4' });
      const file = new File([blob], outputName, { type: 'video/mp4' });
      const result = { format: plan.format, plan, file, url: URL.createObjectURL(blob) };
      results.push(result);
      options.onComplete?.(result);
      await ffmpeg.deleteFile(outputName).catch(() => {});
    }
  } finally {
    options.activeFormat = '';
    ffmpeg.off?.('progress', onProgress);
    await ffmpeg.deleteFile(inputName).catch(() => {});
  }

  return results;
}
