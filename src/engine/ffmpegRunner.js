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
function styleForAction(action) {
  const styles = {
    kinetic_keyword: { size: 104, color: 'yellow', border: 7 },
    kinetic_default: { size: 78, color: 'white', border: 6 },
    hook_large: { size: 78, color: 'white', border: 6 },
    subtitle_simple: { size: 52, color: 'white', border: 5 },
    idea_summary: { size: 48, color: 'white', border: 4 },
    countdown_number: { size: 220, color: 'white', border: 9 },
    list_point: { size: 58, color: 'yellow', border: 5 },
    documentary_keyword: { size: 44, color: 'white', border: 4 },
    context_panel: { size: 52, color: 'white', border: 3 },
    minimal_hook: { size: 70, color: 'white', border: 5 },
    minimal_idea: { size: 58, color: 'white', border: 4 },
    minimal_cta: { size: 62, color: 'yellow', border: 5 },
    engagement_question: { size: 66, color: 'white', border: 6 },
    pov_hook: { size: 64, color: 'white', border: 5 },
  };
  return styles[action.style] || { size: 54, color: 'white', border: 4 };
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

// Converts a show_text timeline action into one drawtext filter.
function buildDrawText(action) {
  if (!action.text) return '';
  const style = styleForAction(action);
  const start = formatSeconds(action.second);
  const end = formatSeconds(Number(action.second || 0) + Number(action.duration || 1));
  return `drawtext=fontfile=${FONT_FILE}:text='${escapeDrawText(action.text)}':x=(w-text_w)/2:y=${yForPosition(action.position)}:fontsize=${style.size}:fontcolor=${style.color}:borderw=${style.border}:bordercolor=black@0.75:enable='between(t,${start},${end})'`;
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
  ];

  if (hasSplit) {
    filters.push('drawbox=x=0:y=1152:w=1080:h=768:color=black@0.78:t=fill');
  }

  return filters;
}

// Converts timeline overlay actions into FFmpeg video filters.
function buildOverlayFilters(plan) {
  const filters = [];

  for (const action of plan.timeline || []) {
    if (action.action === 'show_text') {
      filters.push(buildDrawText(action));
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
      const start = formatSeconds(action.second);
      const end = formatSeconds(Number(action.second || 0) + 0.06);
      filters.push(`drawbox=x=0:y=0:w=iw:h=ih:color=white@0.12:t=fill:enable='between(t,${start},${end})'`);
    }
    if (action.action === 'panel_transition') {
      const start = formatSeconds(action.second);
      const end = formatSeconds(Number(action.second || 0) + 0.18);
      filters.push(`drawbox=x=0:y=1152:w=1080:h=768:color=white@0.12:t=fill:enable='between(t,${start},${end})'`);
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
