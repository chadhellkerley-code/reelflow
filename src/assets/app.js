/* ═══════════════════════════════════════════════════════════
   REELFLOW — APP.JS  (Frontend-only scaffold)
   ═══════════════════════════════════════════════════════════ */

'use strict';

// ── State ─────────────────────────────────────────────────
const state = {
  currentPage: 'dashboard',
  accounts: JSON.parse(localStorage.getItem('rf_accounts') || '[]'),
  history:  JSON.parse(localStorage.getItem('rf_history')  || '[]'),
  settings: JSON.parse(localStorage.getItem('rf_settings') || '{"backendUrl":"http://localhost:4000"}'),
  selectedVideo: null,
  editorVideos: [],
  editorProjects: [],
  editorModalProjectId: null,
  editorModalCopyIndex: 0,
  editorPreviewMode: 'original',
  editorTitleDrag: null,
  editorQueueRunning: false,
  referenceVideos: [],
  selectedReferences: new Set(),
  selectedTemplates: new Set(['ig-cinematic-hook']),
  generatedVideos: [],
  segmentImages: {},
  lastAutomaticEngineResult: null,
  selectedAccounts: new Set(),
  pubType: 'reel',
  scheduleType: 'now',
  ffmpeg: {
    instance: null,
    fetchFile: null,
    loaded: false,
    loading: false,
    fontLoaded: false,
    activeStatusId: null,
  },
};

state.settings = {
  backendUrl: 'http://localhost:4000',
  geminiApiKey: '',
  geminiModel: 'gemini-1.5-pro',
  geminiImageModel: 'gemini-2.0-flash-preview-image-generation',
  generateSegmentImages: false,
  imageOverlayOpacity: 0.55,
  ...state.settings,
};

const PUBLIC_ORIGIN = 'https://reelflow-topaz.vercel.app';
const INSTAGRAM_APP_ID = '1428803625601557';
const INSTAGRAM_SCOPES = 'instagram_business_basic,instagram_business_content_publish';
const TIKTOK_CLIENT_KEY = 'sbaw89mga3yconmz26';
const TIKTOK_SCOPES = 'user.info.basic,video.publish';
const GEMINI_INLINE_VIDEO_MAX_BYTES = 18 * 1024 * 1024;
const FFMPEG_CORE_VERSION = '0.12.10';
const FFMPEG_FONT_URL = 'https://cdn.jsdelivr.net/gh/google/fonts@main/ofl/inter/Inter%5Bopsz,wght%5D.ttf';
const FFMPEG_FONT_FILE = 'Inter.ttf';
const EDITOR_FFMPEG_EXEC_TIMEOUT_MS = 25 * 60 * 1000;
const EDITOR_FFMPEG_STALL_TIMEOUT_MS = 90 * 1000;
const EDITOR_POSTPROCESS_TIMEOUT_MS = 15 * 1000;

const EDITOR_FONT_OPTIONS = [
  { label: 'Syne', family: 'Syne, sans-serif' },
  { label: 'DM Sans', family: 'DM Sans, sans-serif' },
  { label: 'Inter', family: 'Inter, sans-serif' },
  { label: 'Helvetica Neue', family: '"Helvetica Neue", Helvetica, Arial, sans-serif' },
  { label: 'Arial', family: 'Arial, sans-serif' },
  { label: 'Georgia', family: 'Georgia, serif' },
  { label: 'Times New Roman', family: '"Times New Roman", Times, serif' },
  { label: 'Trebuchet MS', family: '"Trebuchet MS", sans-serif' },
  { label: 'Verdana', family: 'Verdana, sans-serif' },
  { label: 'Tahoma', family: 'Tahoma, sans-serif' },
  { label: 'Impact', family: 'Impact, sans-serif' },
  { label: 'Arial Black', family: '"Arial Black", Arial, sans-serif' },
  { label: 'Courier New', family: '"Courier New", monospace' },
  { label: 'Lucida Sans', family: '"Lucida Sans Unicode", "Lucida Grande", sans-serif' },
  { label: 'Gill Sans', family: '"Gill Sans", "Gill Sans MT", sans-serif' },
  { label: 'Palatino', family: '"Palatino Linotype", Palatino, serif' },
  { label: 'Garamond', family: 'Garamond, serif' },
  { label: 'Baskerville', family: 'Baskerville, "Times New Roman", serif' },
  { label: 'Futura', family: 'Futura, "Trebuchet MS", sans-serif' },
  { label: 'Avenir', family: 'Avenir, "Helvetica Neue", sans-serif' },
  { label: 'Montserrat', family: 'Montserrat, sans-serif' },
  { label: 'Poppins', family: 'Poppins, sans-serif' },
  { label: 'Bebas Neue', family: '"Bebas Neue", sans-serif' },
  { label: 'Oswald', family: 'Oswald, sans-serif' },
  { label: 'Anton', family: 'Anton, sans-serif' },
  { label: 'Playfair Display', family: '"Playfair Display", serif' },
  { label: 'Merriweather', family: 'Merriweather, serif' },
  { label: 'Lora', family: 'Lora, serif' },
  { label: 'Raleway', family: 'Raleway, sans-serif' },
  { label: 'Rubik', family: 'Rubik, sans-serif' },
  { label: 'Nunito Sans', family: '"Nunito Sans", sans-serif' },
  { label: 'Work Sans', family: '"Work Sans", sans-serif' },
  { label: 'Archivo', family: 'Archivo, sans-serif' },
  { label: 'Manrope', family: 'Manrope, sans-serif' },
  { label: 'Cabin', family: 'Cabin, sans-serif' },
  { label: 'Josefin Sans', family: '"Josefin Sans", sans-serif' },
  { label: 'League Spartan', family: '"League Spartan", sans-serif' },
  { label: 'Abril Fatface', family: '"Abril Fatface", serif' },
  { label: 'Cormorant Garamond', family: '"Cormorant Garamond", serif' },
  { label: 'Space Grotesk', family: '"Space Grotesk", sans-serif' },
  { label: 'Space Mono', family: '"Space Mono", monospace' },
  { label: 'Source Sans 3', family: '"Source Sans 3", sans-serif' },
  { label: 'Source Serif 4', family: '"Source Serif 4", serif' },
  { label: 'IBM Plex Sans', family: '"IBM Plex Sans", sans-serif' },
  { label: 'IBM Plex Serif', family: '"IBM Plex Serif", serif' },
  { label: 'Sora', family: 'Sora, sans-serif' },
  { label: 'DM Serif Display', family: '"DM Serif Display", serif' },
  { label: 'PT Sans', family: '"PT Sans", sans-serif' },
  { label: 'PT Serif', family: '"PT Serif", serif' },
  { label: 'System UI', family: 'system-ui, sans-serif' },
];

const EDITOR_QUICK_COMBOS = [
  { id: 'ig-bold', label: 'Instagram Bold', font: 'Montserrat, sans-serif', backgroundColor: '#e6683c' },
  { id: 'ig-pop', label: 'Story Pop', font: 'Syne, sans-serif', backgroundColor: '#2563eb' },
  { id: 'ig-premium', label: 'Premium Glass', font: 'Playfair Display, serif', backgroundColor: '#111827' },
  { id: 'ig-neon', label: 'Neon Pulse', font: 'Sora, sans-serif', backgroundColor: '#8b5cf6' },
  { id: 'ig-minimal', label: 'Minimal Soft', font: 'DM Sans, sans-serif', backgroundColor: '#f3f4f6' },
  { id: 'ig-editorial', label: 'Editorial Cut', font: 'Cormorant Garamond, serif', backgroundColor: '#44403c' },
  { id: 'ig-viral', label: 'Viral Hook', font: 'Anton, sans-serif', backgroundColor: '#f97316' },
  { id: 'ig-clean', label: 'Clean Caption', font: 'Inter, sans-serif', backgroundColor: '#334155' },
];

const EDITOR_COLOR_OPTIONS = [
  { label: 'Negro', value: '#050816' },
  { label: 'Blanco', value: '#f8fafc' },
  { label: 'Rojo', value: '#ef4444' },
  { label: 'Naranja', value: '#f97316' },
  { label: 'Amarillo', value: '#facc15' },
  { label: 'Verde', value: '#22c55e' },
  { label: 'Cian', value: '#06b6d4' },
  { label: 'Azul', value: '#3b82f6' },
  { label: 'Violeta', value: '#8b5cf6' },
  { label: 'Rosa', value: '#ec4899' },
  { label: 'Marrón', value: '#92400e' },
  { label: 'Gris', value: '#64748b' },
];

function makeEditorBackgroundOption(index) {
  const hue = (330 + (index * 17)) % 360;
  const saturation = 78 + (index % 4);
  const lightness = 44 + (index % 5);
  const backgroundColor = hslToHex(hue, saturation, lightness);
  const accent = hslToHex((hue + 28) % 360, 92, 66);
  return {
    id: `bg-${index + 1}`,
    label: `Liso ${index + 1}`,
    backgroundColor,
    accent,
  };
}

function hslToHex(h, s, l) {
  const hue = ((Number(h) % 360) + 360) % 360;
  const sat = Math.max(0, Math.min(100, Number(s))) / 100;
  const light = Math.max(0, Math.min(100, Number(l))) / 100;
  const c = (1 - Math.abs((2 * light) - 1)) * sat;
  const x = c * (1 - Math.abs(((hue / 60) % 2) - 1));
  const m = light - (c / 2);
  let r = 0;
  let g = 0;
  let b = 0;

  if (hue < 60) {
    r = c; g = x;
  } else if (hue < 120) {
    r = x; g = c;
  } else if (hue < 180) {
    g = c; b = x;
  } else if (hue < 240) {
    g = x; b = c;
  } else if (hue < 300) {
    r = x; b = c;
  } else {
    r = c; b = x;
  }

  const toHex = value => Math.round((value + m) * 255).toString(16).padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

const EDITOR_BACKGROUND_OPTIONS = Array.from({ length: 50 }, (_, index) => makeEditorBackgroundOption(index));

const EDITOR_DEFAULT_COPY = () => ({
  title: '',
  titleDraft: null,
  titlePositionX: 50,
  titlePositionY: 70,
  font: EDITOR_FONT_OPTIONS[0].family,
  backgroundId: EDITOR_BACKGROUND_OPTIONS[0].id,
  backgroundColor: EDITOR_BACKGROUND_OPTIONS[0].backgroundColor,
  showBackground: true,
  size: 54,
  opacity: 88,
  padding: 18,
  durationMode: 'all',
  rangeEnd: 10,
});

const LOCAL_VIDEO_TEMPLATES = [
  {
    key: 'ig-cinematic-hook',
    name: 'Cinematic Hook',
    desc: 'Barras, contraste cine, entrada suave y hook fuerte.',
    tags: ['Reels', 'Cine'],
    preview: 'mock-story',
    defaultHook: 'NO ERA LO QUE PARECIA',
    defaultSub: 'miralo hasta el final',
    audio: 'cinematic',
    beats: [1.35, 0.85, 1.2, 0.7],
  },
  {
    key: 'ig-bold-captions',
    name: 'Bold Captions',
    desc: 'Subtitulos grandes, cortes rapidos y color viral.',
    tags: ['Texto', 'Viral'],
    preview: 'mock-hook',
    defaultHook: 'ESTO CAMBIA TODO',
    defaultSub: 'guardalo para despues',
    audio: 'punch',
    beats: [0.75, 0.65, 0.9, 0.55],
  },
  {
    key: 'ig-luxury-reveal',
    name: 'Luxury Reveal',
    desc: 'Look premium con reveal lento, marco y grano fino.',
    tags: ['Premium', 'Reveal'],
    preview: 'mock-minimal',
    defaultHook: 'EL DETALLE IMPORTA',
    defaultSub: 'version premium',
    audio: 'warm',
    beats: [1.7, 1.25, 1.5, 1.1],
  },
  {
    key: 'ig-viral-zoom',
    name: 'Viral Zoom',
    desc: 'Zoom punch, flash transitions y texto de impacto.',
    tags: ['Zoom', 'Impacto'],
    preview: 'mock-zoom',
    defaultHook: 'MIRA ESTO',
    defaultSub: 'no lo esperaba',
    audio: 'punch',
    beats: [0.55, 0.8, 0.5, 0.75],
  },
  {
    key: 'ig-clean-tutorial',
    name: 'Clean Tutorial',
    desc: 'Formato claro para pasos, tips y explicaciones.',
    tags: ['Tips', 'Clean'],
    preview: 'mock-slideshow',
    defaultHook: '3 PASOS SIMPLES',
    defaultSub: 'paso a paso',
    audio: 'clean',
    beats: [1.25, 1.25, 1.25, 1],
  },
  {
    key: 'ig-product-spotlight',
    name: 'Product Spotlight',
    desc: 'Producto centrado, viñeta y etiquetas tipo showcase.',
    tags: ['Producto', 'Venta'],
    preview: 'mock-gradient-overlay',
    defaultHook: 'NUEVO FAVORITO',
    defaultSub: 'detalle por detalle',
    audio: 'clean',
    beats: [1.1, 0.9, 1.35, 0.8],
  },
  {
    key: 'ig-story-pop',
    name: 'Story Pop',
    desc: 'Overlays de story, barra superior y movimiento liviano.',
    tags: ['Story', 'Pop'],
    preview: 'mock-story',
    defaultHook: 'HOY PASO ESTO',
    defaultSub: 'mini vlog',
    audio: 'bright',
    beats: [0.9, 1.05, 0.85, 1.1],
  },
  {
    key: 'ig-documentary',
    name: 'Mini Doc',
    desc: 'Blanco y negro, grano, subtitulo sobrio y ritmo narrativo.',
    tags: ['Doc', 'B/N'],
    preview: 'mock-minimal',
    defaultHook: 'LA HISTORIA REAL',
    defaultSub: 'en 30 segundos',
    audio: 'documentary',
    beats: [1.8, 1.25, 1.6, 1.1],
  },
  {
    key: 'ig-neon-glitch',
    name: 'Neon Glitch',
    desc: 'Color neon, flashes, bordes y energia nocturna.',
    tags: ['Neon', 'Glitch'],
    preview: 'mock-glitch',
    defaultHook: 'SIN FILTRO',
    defaultSub: 'modo noche',
    audio: 'neon',
    beats: [0.55, 0.45, 0.7, 0.5],
  },
  {
    key: 'ig-fashion-cut',
    name: 'Fashion Cut',
    desc: 'Cortes elegantes, contraste suave y texto editorial.',
    tags: ['Moda', 'Editorial'],
    preview: 'mock-trending',
    defaultHook: 'LOOK DEL DIA',
    defaultSub: 'detalle final',
    audio: 'warm',
    beats: [0.8, 1.05, 0.75, 1.2],
  },
  {
    key: 'ig-food-closeup',
    name: 'Food Closeup',
    desc: 'Color calido, nitidez y overlays para comida/producto.',
    tags: ['Food', 'Warm'],
    preview: 'mock-gradient-overlay',
    defaultHook: 'PROBALO ASI',
    defaultSub: 'queda increible',
    audio: 'bright',
    beats: [0.95, 0.8, 1.1, 0.75],
  },
  {
    key: 'ig-travel-dream',
    name: 'Travel Dream',
    desc: 'Movimiento suave, brillo limpio y texto aspiracional.',
    tags: ['Travel', 'Dream'],
    preview: 'mock-landscape',
    defaultHook: 'UN LUGAR PARA VOLVER',
    defaultSub: 'guarda esta idea',
    audio: 'wide',
    beats: [1.45, 1.2, 1.55, 1.05],
  },
  {
    key: 'ig-fitness-pulse',
    name: 'Fitness Pulse',
    desc: 'Ritmo agresivo, contraste alto y energia deportiva.',
    tags: ['Fit', 'Pulse'],
    preview: 'mock-countdown',
    defaultHook: 'NO PARES AHORA',
    defaultSub: 'una repeticion mas',
    audio: 'punch',
    beats: [0.5, 0.5, 0.65, 0.45],
  },
  {
    key: 'ig-before-after',
    name: 'Before / After',
    desc: 'Comparacion visual con divisor y llamada al resultado.',
    tags: ['Antes', 'Despues'],
    preview: 'mock-before-after',
    defaultHook: 'ANTES VS DESPUES',
    defaultSub: 'el cambio se nota',
    audio: 'clean',
    beats: [1.05, 0.85, 1.25, 0.75],
  },
  {
    key: 'ig-podcast-clips',
    name: 'Podcast Clip',
    desc: 'Subtitulo central, marco inferior y audio de voz mejorado.',
    tags: ['Voz', 'Clip'],
    preview: 'mock-kinetic',
    defaultHook: 'DIJO ESTO',
    defaultSub: 'clip completo',
    audio: 'voice',
    beats: [1.6, 1.4, 1.2, 1.5],
  },
  {
    key: 'ig-meme-reaction',
    name: 'Meme Reaction',
    desc: 'Split visual, zoom corto y captions tipo reaccion.',
    tags: ['Meme', 'React'],
    preview: 'mock-duet',
    defaultHook: 'YO CUANDO',
    defaultSub: 'situacion real',
    audio: 'neon',
    beats: [0.65, 0.55, 0.8, 0.5],
  },
  {
    key: 'ig-soft-minimal',
    name: 'Soft Minimal',
    desc: 'Estetica limpia, texto delicado y ritmo suave.',
    tags: ['Minimal', 'Soft'],
    preview: 'mock-minimal',
    defaultHook: 'PEQUENOS DETALLES',
    defaultSub: 'menos ruido, mas foco',
    audio: 'warm',
    beats: [1.6, 1.35, 1.8, 1.25],
  },
  {
    key: 'ig-countdown-launch',
    name: 'Countdown Launch',
    desc: 'Intro con cuenta, flash inicial y cierre de accion.',
    tags: ['Launch', 'Intro'],
    preview: 'mock-countdown',
    defaultHook: '3... 2... 1...',
    defaultSub: 'ya esta disponible',
    audio: 'punch',
    beats: [0.55, 0.55, 0.55, 1],
  },
  {
    key: 'ig-ugc-review',
    name: 'UGC Review',
    desc: 'Estilo review, marco social y texto de recomendacion.',
    tags: ['UGC', 'Review'],
    preview: 'mock-story',
    defaultHook: 'LO PROBE POR TI',
    defaultSub: 'mi opinion sincera',
    audio: 'voice',
    beats: [1.05, 0.95, 1.2, 0.85],
  },
  {
    key: 'ig-night-cinema',
    name: 'Night Cinema',
    desc: 'Cine oscuro, contraste fuerte, grano y glow discreto.',
    tags: ['Noche', 'Cine'],
    preview: 'mock-glitch',
    defaultHook: 'CUANDO CAE LA NOCHE',
    defaultSub: 'modo cinematico',
    audio: 'cinematic',
    beats: [1.25, 0.9, 1.4, 0.8],
  },
];

const AUTOMATIC_FORMAT_TEMPLATES = [
  {
    key: 'kinetic_subtitles',
    name: 'Kinetic Subtitles',
    desc: 'Palabra por palabra, keywords grandes, cortes por idea y zoom en enfasis.',
    tags: ['IA', 'Subtitulos'],
    preview: 'mock-kinetic',
    defaultHook: 'TEXTO EN RITMO',
  },
  {
    key: 'hook_reveal',
    name: 'Hook Reveal',
    desc: 'Hook grande al inicio, reveal al segundo 2, subtitulos e ideas por seccion.',
    tags: ['Hook', 'Reveal'],
    preview: 'mock-hook',
    defaultHook: 'HOOK FUERTE',
  },
  {
    key: 'countdown_list',
    name: 'Countdown List',
    desc: 'Numeros animados, puntos de lista, zoom out y whoosh entre items.',
    tags: ['Lista', 'Whoosh'],
    preview: 'mock-countdown',
    defaultHook: '3 PUNTOS',
  },
  {
    key: 'documentary_cuts',
    name: 'Documentary Cuts',
    desc: 'Cortes cada 2.5s, reencuadre alternado, lower thirds y musica tensa.',
    tags: ['Doc', 'Cortes'],
    preview: 'mock-minimal',
    defaultHook: 'LA HISTORIA',
  },
  {
    key: 'split_context',
    name: 'Split Context',
    desc: 'Video arriba y panel inferior con resumen de ideas y keywords destacadas.',
    tags: ['Panel', 'Contexto'],
    preview: 'mock-split',
    defaultHook: 'CONTEXTO',
  },
  {
    key: 'minimal_text',
    name: 'Minimal Text',
    desc: 'Solo hook, idea central y CTA con zoom continuo limpio.',
    tags: ['Minimal', 'CTA'],
    preview: 'mock-minimal',
    defaultHook: 'IDEA CENTRAL',
  },
  {
    key: 'engagement_closer',
    name: 'Engagement Closer',
    desc: 'Subtitulos kinetic y cierre oscuro con pregunta para comentarios.',
    tags: ['Comentarios', 'Cierre'],
    preview: 'mock-kinetic',
    defaultHook: 'QUE OPINAS?',
  },
  {
    key: 'pov_style',
    name: 'POV Style',
    desc: 'Intro POV, subtitulos simples y zoom rapido en momentos de enfasis.',
    tags: ['POV', 'Zoom'],
    preview: 'mock-trending',
    defaultHook: 'POV:',
  },
];

function getPublicOrigin() {
  return window.location.origin && window.location.origin !== 'null'
    ? window.location.origin
    : PUBLIC_ORIGIN;
}

function getInstagramCallbackUrl() {
  return `${getPublicOrigin()}/auth/instagram/callback`;
}

// ── Navigation ─────────────────────────────────────────────
const pages = {
  dashboard: 'Dashboard',
  accounts:  'Cuentas',
  publisher: 'Publicar',
  history:   'Historial',
  settings:  'Configuración',
};

function navigateTo(page) {
  // Hide all pages
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));

  // Show target
  const el = document.getElementById(`page-${page}`);
  if (el) el.classList.add('active');

  const nav = document.querySelector(`[data-page="${page}"]`);
  if (nav) nav.classList.add('active');

  document.getElementById('breadcrumb').textContent = pages[page] || page;
  state.currentPage = page;

  // Close sidebar on mobile
  document.getElementById('sidebar').classList.remove('open');

  // Page-specific init
  if (page === 'dashboard') renderDashboard();
  if (page === 'publisher') renderPublisherAccounts();
  if (page === 'editor') {
    renderEditorVideos();
    updateVariantUniqueControls();
    if (state.editorVideos.length) void ensureVariantUniqueRuntime();
  }
  if (page === 'history')   renderHistory();
  if (page === 'settings')  renderSettings();
}

// Nav click listeners
document.querySelectorAll('.nav-item[data-page]').forEach(item => {
  item.addEventListener('click', e => {
    e.preventDefault();
    navigateTo(item.dataset.page);
  });
});

// Sidebar toggle (mobile)
document.getElementById('sidebar-toggle').addEventListener('click', () => {
  document.getElementById('sidebar').classList.toggle('open');
});

// ── Toast ──────────────────────────────────────────────────
function toast(message, type = 'info') {
  const container = document.getElementById('toast-container');
  const el = document.createElement('div');
  el.className = `toast ${type}`;
  el.textContent = message;
  container.appendChild(el);
  setTimeout(() => el.remove(), 3500);
}

function escapeHtml(value) {
  return String(value || '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

// ── Modal ──────────────────────────────────────────────────
function openModal(title, html) {
  document.getElementById('modal-title').textContent = title;
  document.getElementById('modal-body').innerHTML = html;
  const modal = document.querySelector('#modal-overlay .modal');
  if (modal) modal.classList.toggle('modal-editor-wide', String(html || '').includes('editor-modal'));
  document.getElementById('modal-overlay').classList.add('open');
}

function closeModal() {
  stopEditorTitleDrag();
  document.getElementById('modal-overlay').classList.remove('open');
}

// ── Persist ────────────────────────────────────────────────
function saveAccounts() {
  localStorage.setItem('rf_accounts', JSON.stringify(state.accounts));
}
function saveHistory() {
  localStorage.setItem('rf_history', JSON.stringify(state.history));
}
function saveSettings() {
  state.settings.backendUrl = document.getElementById('backend-url')?.value?.trim() || 'http://localhost:4000';
  localStorage.setItem('rf_settings', JSON.stringify(state.settings));
  toast('Configuración guardada', 'success');
}

// ── Clipboard ──────────────────────────────────────────────
function copyToClipboard(inputId) {
  const input = document.getElementById(inputId);
  navigator.clipboard.writeText(input.value).then(() => toast('Copiado al portapapeles', 'success'));
}

// ── Caption counter ────────────────────────────────────────
const captionInput = document.getElementById('post-caption');
if (captionInput) {
  captionInput.addEventListener('input', () => {
    document.getElementById('caption-count').textContent = captionInput.value.length;
  });
}

// ═══════════════════════════════════════════════════════════
//  DASHBOARD
// ═══════════════════════════════════════════════════════════
function renderDashboard() {
  // Stats
  document.getElementById('stat-accounts').textContent  = state.accounts.length;
  document.getElementById('stat-published').textContent = state.history.filter(h => h.status === 'published').length;
  document.getElementById('stat-formats').textContent   = state.history.filter(h => h.type === 'format').length;
  document.getElementById('stat-drafts').textContent    = state.history.filter(h => h.status === 'draft').length;

  // Accounts preview
  const preview = document.getElementById('accounts-preview');
  if (state.accounts.length === 0) {
    preview.innerHTML = `<div class="empty-state-small"><p>No hay cuentas conectadas aún.</p><button class="btn btn-outline btn-sm" onclick="navigateTo('accounts')">Conectar cuenta</button></div>`;
  } else {
    preview.innerHTML = state.accounts.map(acc => `
      <div class="account-preview-item">
        <div class="platform-dot ${acc.platform}"></div>
        <strong style="font-size:13px">${acc.username}</strong>
        <span style="margin-left:auto;font-size:11px;color:var(--text-muted)">Instagram</span>
        <span class="badge badge-active" style="margin-left:8px">Activa</span>
      </div>
    `).join('');
  }

  // Activity
  const activity = document.getElementById('activity-list');
  if (state.history.length === 0) {
    activity.innerHTML = `<div class="empty-state-small"><p>No hay actividad reciente.</p></div>`;
  } else {
    activity.innerHTML = state.history.slice(-5).reverse().map(h => `
      <div class="activity-item">
        <div class="activity-icon">${h.platform === 'ig' ? '▶' : '◆'}</div>
        <div class="activity-text">${h.type === 'format' ? 'Ediciones generadas' : 'Reel publicado'} · ${h.account || h.filename || ''}</div>
        <div class="activity-time">${formatDate(h.date)}</div>
      </div>
    `).join('');
  }

  // Connected badges in topbar
  renderConnectedBadges();
}

function renderConnectedBadges() {
  const container = document.getElementById('connected-badges');
  if (!container) return;
  container.innerHTML = state.accounts.map(acc => `
    <span class="badge badge-active" style="font-size:10px">📸 ${acc.username}</span>
  `).join('');
}

function formatDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleDateString('es-AR', { day:'2-digit', month:'short', hour:'2-digit', minute:'2-digit' });
}

function formatBytes(bytes) {
  const size = Number(bytes || 0);
  if (!size) return '0 KB';
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(0)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

// ═══════════════════════════════════════════════════════════
//  ACCOUNTS
// ═══════════════════════════════════════════════════════════
function connectInstagram() {
  const appId = document.getElementById('ig-app-id').value.trim();

  if (!appId) {
    toast('Completá el App ID de Instagram', 'error');
    return;
  }

  const oauthState = crypto.randomUUID ? crypto.randomUUID() : String(Date.now());
  const callbackUrl = getInstagramCallbackUrl();
  const authUrl = new URL('https://www.instagram.com/oauth/authorize');

  authUrl.searchParams.set('client_id', appId);
  authUrl.searchParams.set('redirect_uri', callbackUrl);
  authUrl.searchParams.set('response_type', 'code');
  authUrl.searchParams.set('scope', INSTAGRAM_SCOPES);
  authUrl.searchParams.set('state', oauthState);
  authUrl.searchParams.set('enable_fb_login', '0');
  authUrl.searchParams.set('force_authentication', '1');

  localStorage.setItem('rf_ig_app_id', appId);
  localStorage.setItem('rf_ig_oauth_state', oauthState);
  localStorage.setItem('rf_ig_callback_url', callbackUrl);

  window.location.href = authUrl.toString();
}

function saveInstagramAccount() {
  const username = document.getElementById('modal-ig-user').value.trim();
  const token    = document.getElementById('modal-ig-token').value.trim();

  if (!username || !token) { toast('Completá todos los campos', 'error'); return; }

  const expiry = new Date();
  expiry.setDate(expiry.getDate() + 60);

  const account = {
    id:       `ig_${Date.now()}`,
    platform: 'ig',
    username,
    token,
    expiresAt: expiry.toISOString(),
    connectedAt: new Date().toISOString(),
  };

  state.accounts.push(account);
  saveAccounts();
  closeModal();
  renderIGAccounts();
  renderConnectedBadges();
  toast(`Cuenta @${username} conectada`, 'success');

  document.getElementById('ig-status').innerHTML = `<span class="badge badge-active">Conectado</span>`;
  document.getElementById('platform-instagram').classList.add('connected');
}

function removeAccount(id) {
  state.accounts = state.accounts.filter(a => a.id !== id);
  saveAccounts();
  renderIGAccounts();
  renderConnectedBadges();
  toast('Cuenta desconectada', 'success');
}

function renderIGAccounts() {
  const list = document.getElementById('ig-accounts-list');
  const igAccounts = state.accounts.filter(a => a.platform === 'ig');
  if (igAccounts.length === 0) { list.innerHTML = ''; return; }

  list.innerHTML = igAccounts.map(acc => `
    <div class="account-item">
      <div class="account-avatar">${acc.username[0].toUpperCase()}</div>
      <div class="account-item-info">
        <div class="account-item-name">${acc.username}</div>
        <div class="account-item-meta">Token expira: ${formatDate(acc.expiresAt)}</div>
      </div>
      <span class="badge badge-active">Activa</span>
      <button class="account-item-remove" onclick="removeAccount('${acc.id}')">✕</button>
    </div>
  `).join('');

  document.getElementById('ig-status').innerHTML = `<span class="badge badge-active">${igAccounts.length} cuenta(s)</span>`;
  document.getElementById('platform-instagram').classList.add('connected');
}

// ═══════════════════════════════════════════════════════════
//  PUBLISHER
// ═══════════════════════════════════════════════════════════
function handleVideoUpload(event) {
  const file = event.target.files[0];
  if (!file) return;

  state.selectedVideo = file;
  const url = URL.createObjectURL(file);
  const preview = document.getElementById('video-preview');
  preview.src = url;

  document.getElementById('upload-zone').style.display = 'none';
  document.getElementById('video-preview-container').style.display = 'flex';

  const size = (file.size / (1024 * 1024)).toFixed(1);
  document.getElementById('video-info').textContent = `${file.name} · ${size} MB`;
  document.getElementById('video-public-url').value = '';
}

function clearVideo() {
  state.selectedVideo = null;
  document.getElementById('video-input').value = '';
  document.getElementById('upload-zone').style.display = '';
  document.getElementById('video-preview-container').style.display = 'none';
}

function updatePubType(val) { state.pubType = val; }

function updateSchedule(val) {
  state.scheduleType = val;
  document.getElementById('schedule-datetime').style.display = val === 'later' ? 'block' : 'none';
}

function renderPublisherAccounts() {
  const container = document.getElementById('account-selector');
  if (state.accounts.length === 0) {
    container.innerHTML = `<div class="empty-state-small"><p>No hay cuentas conectadas.</p><button class="btn btn-outline btn-sm" onclick="navigateTo('accounts')">Conectar cuenta →</button></div>`;
    return;
  }

  container.innerHTML = state.accounts.map(acc => `
    <div class="account-select-item ${state.selectedAccounts.has(acc.id) ? 'selected' : ''}"
         onclick="toggleAccountSelect('${acc.id}', this)">
      <div class="account-avatar">${acc.username[0].toUpperCase()}</div>
      <div class="account-item-info">
        <div class="account-item-name">${acc.username}</div>
        <div class="account-item-meta">Instagram</div>
      </div>
      <div class="check">${state.selectedAccounts.has(acc.id) ? '✓' : ''}</div>
    </div>
  `).join('');
}

function toggleAccountSelect(id, el) {
  if (state.selectedAccounts.has(id)) {
    state.selectedAccounts.delete(id);
    el.classList.remove('selected');
    el.querySelector('.check').textContent = '';
  } else {
    state.selectedAccounts.add(id);
    el.classList.add('selected');
    el.querySelector('.check').textContent = '✓';
  }
}

async function publishReel() {
  const videoUrlInput = document.getElementById('video-public-url');
  let videoUrl = videoUrlInput.value.trim();
  const caption = document.getElementById('post-caption').value.trim();
  const thumbOffset = Number(document.getElementById('cover-time').value || 0) * 1000;

  if (!videoUrl && !state.selectedVideo) { toast('Seleccioná un video o pegá una URL pública', 'error'); return; }
  if (state.selectedAccounts.size === 0) { toast('Seleccioná al menos una cuenta', 'error'); return; }
  if (state.pubType === 'draft') { toast('Este flujo usa publicación directa. Elegí Reel (Feed).', 'error'); return; }

  const btn = document.getElementById('publish-btn');
  const status = document.getElementById('publish-status');
  btn.disabled = true;
  btn.innerHTML = '<span class="spinner"></span> Publicando...';
  status.className = 'publish-status loading';
  status.textContent = videoUrl ? 'Preparando publicación...' : 'Subiendo video a storage...';

  const accounts = state.accounts.filter(a => state.selectedAccounts.has(a.id));
  const results = [];

  try {
    if (!videoUrl) {
      videoUrl = await uploadVideoToStorage(state.selectedVideo, status);
      videoUrlInput.value = videoUrl;
    }

    for (const acc of accounts) {
      const payload = {
        videoUrl,
        caption,
        thumbOffset,
      };
      const data = await publishInstagramReel(acc, payload, status);
      results.push({ acc, data });

      state.history.push({
        id: `pub_${Date.now()}_${acc.id}`,
        type: 'publish',
        platform: acc.platform,
        account: acc.username,
        filename: videoUrl,
        status: 'published',
        date: new Date().toISOString(),
      });
    }

    saveHistory();
    status.className = 'publish-status success';
    status.textContent = `✓ Publicación enviada a ${results.length} cuenta(s)`;
    toast('Publicación enviada correctamente', 'success');
    setTimeout(() => { status.textContent = ''; }, 5000);
  } catch (error) {
    status.className = 'publish-status error';
    status.textContent = error.message;
    toast(error.message, 'error');
  } finally {
    btn.disabled = false;
    btn.innerHTML = '<span>◆</span> Publicar Reel';
  }
}

async function publishInstagramReel(account, payload, statusEl) {
  let containerId = null;

  for (let attempt = 1; attempt <= 6; attempt += 1) {
    statusEl.textContent = containerId
      ? `Instagram sigue procesando el video... intento ${attempt}/6`
      : `Creando publicación en ${account.username}...`;

    const response = await fetch('/api/instagram/publish', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        igUserId: account.igUserId || account.id,
        accessToken: account.token,
        videoUrl: payload.videoUrl,
        caption: payload.caption,
        thumbOffset: payload.thumbOffset,
        containerId,
      }),
    });
    const data = await response.json();

    if (response.status === 202 && data.pending && data.containerId) {
      containerId = data.containerId;
      await sleep(10000);
      continue;
    }

    if (!response.ok || !data.ok) {
      throw new Error(data.error || 'No se pudo publicar el Reel.');
    }

    return data;
  }

  throw new Error('Instagram sigue procesando el video. Probá publicar otra vez en unos minutos.');
}

async function uploadVideoToStorage(file, statusEl) {
  if (!file) throw new Error('Seleccioná un video primero.');

  statusEl.textContent = 'Verificando configuración de Blob...';
  const status = await fetch('/api/blob/status').then(res => res.json()).catch(() => null);
  if (!status?.configured) {
    throw new Error('Falta configurar BLOB_READ_WRITE_TOKEN en Vercel Blob.');
  }

  statusEl.textContent = 'Cargando cliente de subida...';
  const { upload } = await import('https://esm.sh/@vercel/blob@2.4.0/client');
  const pathname = `reels/${Date.now()}-${file.name.replace(/[^a-z0-9._-]/gi, '-')}`;
  const abortController = new AbortController();
  const timeout = setTimeout(() => abortController.abort(), 180000);
  let blob;

  try {
    statusEl.textContent = 'Solicitando token temporal de subida...';
    blob = await upload(pathname, file, {
      access: 'public',
      contentType: file.type || 'video/mp4',
      handleUploadUrl: '/api/blob/upload',
      multipart: true,
      clientPayload: JSON.stringify({ filename: file.name, size: file.size, type: file.type }),
      abortSignal: abortController.signal,
      onUploadProgress: ({ percentage }) => {
        const progress = Math.round(percentage);
        statusEl.textContent = progress >= 100
          ? 'Finalizando subida del video...'
          : `Subiendo video a storage... ${progress}%`;
      },
    });
  } catch (error) {
    if (abortController.signal.aborted) {
      throw new Error('La subida quedó trabada. Revisá que el Blob Store sea público y esté conectado al proyecto.');
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }

  if (!blob?.url) throw new Error('No se pudo obtener la URL pública del video.');
  statusEl.textContent = 'Video subido. Preparando publicación...';
  return blob.url;
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

function getErrorMessage(error, fallback = 'Ocurrió un error inesperado.') {
  if (error instanceof Error && error.message) return error.message;
  if (typeof error === 'string' && error.trim()) return error;
  return fallback;
}

// ═══════════════════════════════════════════════════════════
//  EDITOR
// ═══════════════════════════════════════════════════════════
function handleLegacyEditorUpload(event) {
  const file = Array.from(event.target.files).find(f => f.type.startsWith('video/'));
  if (!file) return;
  state.editorVideos = [file];
  renderLegacyEditorVideos();
}

function getBrowserVideoDuration(file) {
  return new Promise(resolve => {
    if (!file) {
      resolve(0);
      return;
    }

    const video = document.createElement('video');
    const url = URL.createObjectURL(file);
    let settled = false;

    const done = value => {
      if (settled) return;
      settled = true;
      URL.revokeObjectURL(url);
      resolve(Number.isFinite(value) ? value : 0);
    };

    video.preload = 'metadata';
    video.muted = true;
    video.onloadedmetadata = () => {
      if (Number.isFinite(video.duration) && video.duration > 0) {
        done(video.duration);
        return;
      }

      video.currentTime = 24 * 60 * 60;
    };
    video.ontimeupdate = () => done(video.duration);
    video.onerror = () => done(0);
    setTimeout(() => done(0), 2500);
    video.src = url;
  });
}

function waitForVideoEvent(video, eventName) {
  return new Promise((resolve, reject) => {
    const onEvent = () => {
      cleanup();
      resolve();
    };
    const onError = () => {
      cleanup();
      reject(new Error('No se pudo analizar el video de referencia.'));
    };
    const cleanup = () => {
      video.removeEventListener(eventName, onEvent);
      video.removeEventListener('error', onError);
    };

    video.addEventListener(eventName, onEvent, { once: true });
    video.addEventListener('error', onError, { once: true });
  });
}

function setVideoTime(video, time) {
  return new Promise(resolve => {
    const onSeeked = () => {
      video.removeEventListener('seeked', onSeeked);
      resolve();
    };

    video.addEventListener('seeked', onSeeked, { once: true });
    video.currentTime = Math.max(0, Math.min(time, Math.max(0, video.duration - 0.05)));
    setTimeout(() => {
      video.removeEventListener('seeked', onSeeked);
      resolve();
    }, 900);
  });
}

function analyzeFramePixels(imageData, width, height) {
  const data = imageData.data;
  let totalLuma = 0;
  let totalSat = 0;
  let totalSq = 0;
  const bandScores = [
    { key: 'top', score: 0, luma: 0, count: 0, y: 0.12 },
    { key: 'upper', score: 0, luma: 0, count: 0, y: 0.28 },
    { key: 'middle', score: 0, luma: 0, count: 0, y: 0.46 },
    { key: 'lower', score: 0, luma: 0, count: 0, y: 0.66 },
    { key: 'bottom', score: 0, luma: 0, count: 0, y: 0.82 },
  ];

  const getBand = y => {
    if (y < height * 0.2) return bandScores[0];
    if (y < height * 0.38) return bandScores[1];
    if (y < height * 0.58) return bandScores[2];
    if (y < height * 0.78) return bandScores[3];
    return bandScores[4];
  };

  for (let y = 1; y < height - 1; y += 2) {
    for (let x = 1; x < width - 1; x += 2) {
      const i = (y * width + x) * 4;
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      const luma = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
      const max = Math.max(r, g, b) / 255;
      const min = Math.min(r, g, b) / 255;
      const sat = max ? (max - min) / max : 0;
      const right = ((y * width + x + 1) * 4);
      const down = (((y + 1) * width + x) * 4);
      const rightLuma = (0.2126 * data[right] + 0.7152 * data[right + 1] + 0.0722 * data[right + 2]) / 255;
      const downLuma = (0.2126 * data[down] + 0.7152 * data[down + 1] + 0.0722 * data[down + 2]) / 255;
      const edge = Math.abs(luma - rightLuma) + Math.abs(luma - downLuma);
      const band = getBand(y);

      totalLuma += luma;
      totalSat += sat;
      totalSq += luma * luma;
      band.score += edge > 0.28 ? edge : 0;
      band.luma += luma;
      band.count++;
    }
  }

  const count = Math.max(1, Math.floor((width * height) / 4));
  const brightness = totalLuma / count;
  const saturation = totalSat / count;
  const variance = Math.max(0, totalSq / count - brightness * brightness);
  const bestBand = bandScores
    .map(band => ({
      ...band,
      avgLuma: band.count ? band.luma / band.count : 0.5,
      density: band.count ? band.score / band.count : 0,
    }))
    .sort((a, b) => b.density - a.density)[0];

  return {
    brightness,
    saturation,
    contrast: Math.sqrt(variance),
    band: bestBand,
  };
}

async function analyzeReferenceVisualTemplate(file, duration = 0) {
  if (!file) return {};

  const video = document.createElement('video');
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  const url = URL.createObjectURL(file);
  const width = 120;
  const height = 214;
  const frames = [];

  canvas.width = width;
  canvas.height = height;
  video.muted = true;
  video.playsInline = true;
  video.preload = 'auto';
  video.src = url;

  try {
    await waitForVideoEvent(video, 'loadedmetadata');
    const videoDuration = duration || video.duration || 0;
    const sampleCount = Math.min(7, Math.max(3, Math.floor(videoDuration || 4)));
    for (let i = 0; i < sampleCount; i++) {
      const pct = sampleCount === 1 ? 0.5 : (i + 0.5) / sampleCount;
      await setVideoTime(video, pct * Math.max(0.2, videoDuration));
      ctx.drawImage(video, 0, 0, width, height);
      frames.push(analyzeFramePixels(ctx.getImageData(0, 0, width, height), width, height));
    }
  } catch {
    URL.revokeObjectURL(url);
    return {};
  }

  URL.revokeObjectURL(url);

  if (frames.length === 0) return {};

  const avg = key => frames.reduce((sum, frame) => sum + Number(frame[key] || 0), 0) / frames.length;
  const bandMap = frames.reduce((acc, frame) => {
    const key = frame.band?.key || 'lower';
    acc[key] = acc[key] || { count: 0, density: 0, luma: 0, y: frame.band?.y || 0.66 };
    acc[key].count++;
    acc[key].density += frame.band?.density || 0;
    acc[key].luma += frame.band?.avgLuma || 0.5;
    return acc;
  }, {});
  const primaryBand = Object.entries(bandMap)
    .map(([key, value]) => ({
      key,
      count: value.count,
      density: value.density / value.count,
      luma: value.luma / value.count,
      y: value.y,
    }))
    .sort((a, b) => (b.count * b.density) - (a.count * a.density))[0];

  return {
    brightness: avg('brightness'),
    saturation: avg('saturation'),
    contrast: avg('contrast'),
    textBand: primaryBand || { key: 'lower', y: 0.66, luma: 0.45, density: 0 },
    hasLikelyOverlay: Boolean(primaryBand && primaryBand.density > 0.018),
  };
}

function renderLegacyEditorVideos() {
  const list = document.getElementById('editor-videos-list');
  if (state.editorVideos.length === 0) { list.innerHTML = ''; return; }

  list.innerHTML = state.editorVideos.map((f, i) => `
    <div class="editor-video-item">
      <div class="editor-video-thumb">▶</div>
      <div class="editor-video-info">
        <div class="editor-video-name">${f.name}</div>
        <div class="editor-video-size">${(f.size / 1024 / 1024).toFixed(1)} MB</div>
      </div>
      <button class="btn btn-ghost btn-sm" onclick="removeEditorVideo(${i})">✕</button>
    </div>
  `).join('');
}

function removeLegacyEditorVideo(i) {
  state.editorVideos.splice(i, 1);
  renderLegacyEditorVideos();
}

function ffmpegOutputArgs(output) {
  return [
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
    output,
  ];
}

function ffmpegRenderArgs(output, audioMap = '0:a?') {
  const args = [
    '-map', '[v]',
  ];

  if (audioMap) {
    args.push(
      '-map', audioMap,
      '-c:a', 'aac',
      '-b:a', '128k',
      '-shortest',
    );
  } else {
    args.push('-an');
  }

  return [
    ...args,
    '-c:v', 'libx264',
    '-preset', 'ultrafast',
    '-crf', '28',
    '-pix_fmt', 'yuv420p',
    '-movflags', 'faststart',
    output,
  ];
}

function ffmpegVideoFilterCommand(input, output, filter) {
  return [
    '-i', input,
    '-filter_complex', `[0:v]${filter}[v]`,
    ...ffmpegOutputArgs(output),
  ];
}

function ffmpegComplexCommand(input, output, filterGraph) {
  return [
    '-i', input,
    '-filter_complex', filterGraph,
    ...ffmpegOutputArgs(output),
  ];
}

function initEditor() {
  renderFormatTemplates();
  updateFormatCount();
  renderReferenceVideos();
  updateReferenceCount();
  updateEditorEngineStatus();
  updateImageGenerationControls();
}

function getActiveFormatTemplates() {
  return isGeminiEnabled() ? AUTOMATIC_FORMAT_TEMPLATES : LOCAL_VIDEO_TEMPLATES;
}

function getSelectedAutomaticFormatKeys() {
  const validKeys = new Set(AUTOMATIC_FORMAT_TEMPLATES.map(template => template.key));
  return [...state.selectedTemplates].filter(key => validKeys.has(key));
}

function getTemplatePreviewHtml(template) {
  const preview = template.preview || 'mock-story';
  const hook = escapeHtml(template.defaultHook || template.name);

  const previewByKey = {
    'mock-hook': `
      <div class="template-mock mock-hook">
        <span class="mock-text-top">${hook}</span>
        <span class="mock-cut">CUT</span>
        <span class="mock-reveal">REVEAL</span>
      </div>
    `,
    'mock-kinetic': `
      <div class="template-mock mock-kinetic">
        <span class="mock-word mock-w1">TEXTO</span>
        <span class="mock-word mock-w2">EN</span>
        <span class="mock-word mock-w3">RITMO</span>
      </div>
    `,
    'mock-split': `
      <div class="template-mock mock-split">
        <div class="mock-top-half">VIDEO</div>
        <div class="mock-bottom-half">OVERLAY</div>
      </div>
    `,
    'mock-minimal': `<div class="template-mock mock-minimal"><span class="mock-minimal-text">${hook}</span></div>`,
    'mock-before-after': `
      <div class="template-mock mock-before-after">
        <span class="mock-before">ANTES</span>
        <span class="mock-divider">/</span>
        <span class="mock-after">DESPUES</span>
      </div>
    `,
    'mock-slideshow': `
      <div class="template-mock mock-slideshow">
        <span class="mock-slide mock-s1">1</span>
        <span class="mock-slide mock-s2">2</span>
        <span class="mock-slide mock-s3">3</span>
      </div>
    `,
    'mock-countdown': `
      <div class="template-mock mock-countdown">
        <span class="mock-count">3</span>
        <span class="mock-count-label">COUNTDOWN</span>
      </div>
    `,
    'mock-zoom': `<div class="template-mock mock-zoom"><span class="mock-zoom-text">ZOOM</span></div>`,
    'mock-duet': `
      <div class="template-mock mock-duet">
        <div class="mock-duet-left">BASE</div>
        <div class="mock-duet-right">REACT</div>
      </div>
    `,
    'mock-trending': `
      <div class="template-mock mock-trending">
        <span class="mock-tf-text">POV</span>
        <span class="mock-tf-sub">${hook}</span>
      </div>
    `,
    'mock-glitch': `<div class="template-mock mock-glitch"><span class="mock-glitch-text">GLITCH</span></div>`,
    'mock-square': `<div class="template-mock mock-square"><div class="mock-square-inner">9:16</div></div>`,
    'mock-landscape': `<div class="template-mock mock-landscape"><span class="mock-landscape-text">TRAVEL</span></div>`,
    'mock-gradient-overlay': `<div class="template-mock mock-gradient-overlay"><span class="mock-grad-text">${hook}</span></div>`,
    'mock-story': `
      <div class="template-mock mock-story">
        <span class="mock-story-bar"></span>
        <span class="mock-story-icon">◧</span>
        <span class="mock-story-text">${hook}</span>
      </div>
    `,
  };

  return previewByKey[preview] || previewByKey['mock-story'];
}

function renderFormatTemplates() {
  const grid = document.getElementById('instagram-format-grid');
  if (!grid) return;

  const templates = getActiveFormatTemplates();
  const validKeys = new Set(templates.map(template => template.key));
  state.selectedTemplates = new Set([...state.selectedTemplates].filter(key => validKeys.has(key)));
  if (isGeminiEnabled() && state.selectedTemplates.size === 0) {
    state.selectedTemplates = new Set(AUTOMATIC_FORMAT_TEMPLATES.map(template => template.key));
  }

  grid.innerHTML = templates.map(template => {
    const selected = state.selectedTemplates.has(template.key);
    return `
      <button type="button" class="template-card ${selected ? 'selected' : ''}" onclick="toggleFormatTemplate('${template.key}')">
        <div class="template-preview">${getTemplatePreviewHtml(template)}</div>
        <div class="template-info">
          <div class="template-name">${escapeHtml(template.name)}</div>
          <div class="template-desc">${escapeHtml(template.desc)}</div>
          <div class="template-tags">
            ${template.tags.map(tag => `<span class="badge badge-inactive">${escapeHtml(tag)}</span>`).join('')}
          </div>
        </div>
        <div class="template-check">✓</div>
      </button>
    `;
  }).join('');
}

function toggleFormatTemplate(key) {
  if (state.selectedTemplates.has(key)) {
    state.selectedTemplates.delete(key);
  } else {
    state.selectedTemplates.add(key);
  }
  renderFormatTemplates();
  updateFormatCount();
}

function selectAllFormats() {
  state.selectedTemplates = new Set(getActiveFormatTemplates().map(template => template.key));
  renderFormatTemplates();
  updateFormatCount();
}

function clearFormats() {
  state.selectedTemplates.clear();
  renderFormatTemplates();
  updateFormatCount();
}

function getSelectedTemplates() {
  return LOCAL_VIDEO_TEMPLATES.filter(template => state.selectedTemplates.has(template.key));
}

function updateFormatCount() {
  const selected = state.selectedTemplates.size;
  const templates = getActiveFormatTemplates();
  const selectedEl = document.getElementById('selected-formats-count');
  const totalEl = document.getElementById('total-formats-count');
  const genCount = document.getElementById('gen-count');

  if (selectedEl) selectedEl.textContent = selected;
  if (totalEl) totalEl.textContent = templates.length;
  if (genCount) genCount.textContent = selected;
}

function updateEditorEngineStatus() {
  const hasGemini = Boolean(state.settings.geminiApiKey);
  const engine = document.getElementById('editor-engine');
  const note = document.getElementById('gemini-editor-note');

  if (engine) {
    engine.value = hasGemini
      ? `Gemini + FFmpeg.wasm (${state.settings.geminiModel || 'gemini-1.5-pro'})`
      : 'FFmpeg.wasm local';
  }

  if (note) {
    note.textContent = hasGemini
      ? 'Gemini transcribe, detecta hook/ideas/keywords y elige automaticamente los mejores formatos de la lista visible. Videos grandes se suben con Gemini Files API.'
      : 'Gemini se activa desde Configuración. Si no hay API key, ReelFlow usa el análisis local.';
  }

  renderFormatTemplates();
  updateFormatCount();
  updateImageGenerationControls();
}

function persistEditorImageSettings() {
  localStorage.setItem('rf_settings', JSON.stringify(state.settings));
  syncGeminiGlobals();
}

function updateImageGenerationControls() {
  const checkbox = document.getElementById('editor-generate-images');
  const note = document.getElementById('image-generation-note');
  const opacity = document.getElementById('image-overlay-opacity');
  const opacityValue = document.getElementById('image-overlay-opacity-value');
  const hasGemini = isGeminiEnabled();

  if (checkbox) {
    checkbox.checked = Boolean(state.settings.generateSegmentImages && hasGemini);
    checkbox.disabled = !hasGemini;
  }
  if (note) {
    note.textContent = hasGemini
      ? 'Usa Gemini imagen por idea y puede tener costo adicional por imagen generada.'
      : 'Requiere Gemini API Key. Usa costo adicional por imagen generada.';
  }
  if (opacity) {
    opacity.value = String(state.settings.imageOverlayOpacity || 0.55);
    opacity.disabled = !hasGemini;
  }
  if (opacityValue) {
    opacityValue.textContent = `${Math.round(Number(state.settings.imageOverlayOpacity || 0.55) * 100)}%`;
  }
}

function toggleEditorImageGeneration(value) {
  if (value && !isGeminiEnabled()) {
    toast('Configurá Gemini API Key antes de generar imágenes', 'error');
    state.settings.generateSegmentImages = false;
  } else {
    state.settings.generateSegmentImages = Boolean(value);
    if (value) toast('Generación de imágenes activada. Puede generar costo por imagen.', 'info');
  }
  persistEditorImageSettings();
  updateImageGenerationControls();
}

function updateImageOverlayOpacity(value) {
  state.settings.imageOverlayOpacity = clampNumber(value, 0.2, 0.9, 0.55);
  persistEditorImageSettings();
  updateImageGenerationControls();
}

function shouldGenerateSegmentImages() {
  return Boolean(isGeminiEnabled() && state.settings.generateSegmentImages);
}

function getReferenceTemplate(ref, index = 0) {
  const key = ref?.templateKey || LOCAL_VIDEO_TEMPLATES[index % LOCAL_VIDEO_TEMPLATES.length].key;
  return getTemplateByKey(key) || LOCAL_VIDEO_TEMPLATES[0];
}

function getReferenceEditProfile(template, referenceMeta = {}, index = 0) {
  const duration = Number(referenceMeta.duration || 0);
  const visual = referenceMeta.visual || {};
  const fastReference = duration > 0 && duration < 12;
  const mediumReference = duration >= 12 && duration < 25;
  const cadence = fastReference ? 0.9 : mediumReference ? 1.2 : 1.55;
  const driftX = 42 + (index % 4) * 8;
  const driftY = 24 + (index % 3) * 6;
  const contrast = Number(visual.contrast || 1);
  const saturation = Number(visual.saturation || 1);
  const brightness = Number(visual.brightness || 0.5);
  const contrastBoost = Math.max(1.1, Math.min(1.45, 1.08 + contrast * 0.55));
  const saturationBoost = Math.max(1.05, Math.min(1.55, 1.05 + saturation * 0.65));
  const gamma = brightness < 0.42 ? 1.08 : brightness > 0.62 ? 0.96 : 1.02;
  const grade = `eq=contrast=${contrastBoost.toFixed(2)}:saturation=${saturationBoost.toFixed(2)}:gamma=${gamma.toFixed(2)}`;

  const crop = (scaleWidth = 860, cadenceOffset = 0.7) =>
    `scale=${scaleWidth}:${Math.round(scaleWidth * 16 / 9)}:force_original_aspect_ratio=increase,crop=w=720:h=1280:x=(iw-ow)/2+${driftX}*sin(2*PI*t/${cadence}):y=(ih-oh)/2+${driftY}*sin(2*PI*t/${cadence + cadenceOffset})`;

  const profileByKey = {
    'ig-cinematic-hook': {
      name: 'cine vertical + barras + reveal',
      filter: `${crop(850)},fade=t=in:st=0:d=0.18,eq=contrast=1.28:saturation=0.96:gamma=0.97,vignette=PI/5,unsharp=5:5:0.8:5:5:0`,
    },
    'ig-bold-captions': {
      name: 'captions grandes + color viral',
      filter: `${crop(880, 0.45)},eq=contrast=1.24:saturation=1.34:gamma=${gamma.toFixed(2)},unsharp=5:5:1.15:5:5:0`,
    },
    'ig-luxury-reveal': {
      name: 'reveal premium + grano fino',
      filter: `${crop(830, 1.1)},fade=t=in:st=0:d=0.28,eq=contrast=1.16:saturation=0.92:gamma=1.03,vignette=PI/6,noise=alls=4:allf=t+u`,
    },
    'ig-viral-zoom': {
      name: 'zoom punch + flash cuts',
      filter: `${crop(940, 0.35)},eq=contrast=1.34:saturation=1.38,unsharp=5:5:1.25:5:5:0`,
    },
    'ig-clean-tutorial': {
      name: 'tutorial limpio + pasos',
      filter: `${crop(820, 0.9)},eq=contrast=1.08:saturation=1.08:gamma=1.02,unsharp=5:5:0.85:5:5:0`,
    },
    'ig-product-spotlight': {
      name: 'spotlight producto + viñeta',
      filter: `${crop(870, 0.6)},eq=contrast=1.22:saturation=1.18:gamma=0.98,vignette=PI/5,unsharp=5:5:1.1:5:5:0`,
    },
    'ig-story-pop': {
      name: 'story pop + movimiento social',
      filter: `${crop(845, 0.5)},eq=contrast=1.18:saturation=1.28:gamma=1.02,unsharp=5:5:0.95:5:5:0`,
    },
    'ig-documentary': {
      name: 'mini documental + blanco y negro',
      filter: `${crop(835, 1.2)},format=gray,eq=contrast=1.22:gamma=1.04,noise=alls=5:allf=t+u,vignette=PI/7`,
    },
    'ig-neon-glitch': {
      name: 'neon glitch + contraste nocturno',
      filter: `${crop(900, 0.35)},eq=contrast=1.42:saturation=1.55:gamma=0.92,unsharp=5:5:1.2:5:5:0`,
    },
    'ig-fashion-cut': {
      name: 'editorial fashion + cortes limpios',
      filter: `${crop(860, 0.75)},eq=contrast=1.18:saturation=1.05:gamma=0.98,vignette=PI/7,unsharp=5:5:0.9:5:5:0`,
    },
    'ig-food-closeup': {
      name: 'food closeup + color calido',
      filter: `${crop(910, 0.55)},eq=contrast=1.2:saturation=1.32:gamma_r=1.08:gamma=1.02,unsharp=5:5:1.25:5:5:0`,
    },
    'ig-travel-dream': {
      name: 'travel dream + camara suave',
      filter: `${crop(825, 1.4)},eq=contrast=1.1:saturation=1.24:gamma=1.05,unsharp=5:5:0.7:5:5:0`,
    },
    'ig-fitness-pulse': {
      name: 'fitness pulse + impacto alto',
      filter: `${crop(930, 0.3)},eq=contrast=1.36:saturation=1.22:gamma=0.96,unsharp=5:5:1.3:5:5:0`,
    },
    'ig-before-after': {
      name: 'antes/despues + divisor visual',
      filter: `${crop(850, 0.65)},${grade},unsharp=5:5:1.0:5:5:0`,
    },
    'ig-podcast-clips': {
      name: 'clip hablado + foco en texto',
      filter: `${crop(825, 1.1)},eq=contrast=1.12:saturation=1.05:gamma=1.02,unsharp=5:5:0.75:5:5:0`,
    },
    'ig-meme-reaction': {
      name: 'meme reaction + zoom corto',
      filter: `${crop(910, 0.4)},eq=contrast=1.28:saturation=1.35:gamma=1.0,unsharp=5:5:1.2:5:5:0`,
    },
    'ig-soft-minimal': {
      name: 'minimal suave + textura limpia',
      filter: `${crop(815, 1.3)},eq=contrast=1.05:saturation=0.94:gamma=1.08,unsharp=5:5:0.45:5:5:0`,
    },
    'ig-countdown-launch': {
      name: 'countdown launch + flash inicial',
      filter: `${crop(900, 0.45)},fade=t=in:st=0:d=0.12,eq=contrast=1.3:saturation=1.26,unsharp=5:5:1.15:5:5:0`,
    },
    'ig-ugc-review': {
      name: 'review UGC + marco social',
      filter: `${crop(845, 0.75)},eq=contrast=1.16:saturation=1.14:gamma=1.03,unsharp=5:5:0.9:5:5:0`,
    },
    'ig-night-cinema': {
      name: 'cine nocturno + grano + glow',
      filter: `${crop(875, 0.75)},eq=contrast=1.38:saturation=1.12:gamma=0.9,vignette=PI/4,noise=alls=6:allf=t+u,unsharp=5:5:0.95:5:5:0`,
    },
  };

  return profileByKey[template.key] || {
    name: 'reel dinamico Instagram',
    filter: `${crop(860, 0.9)},${grade},unsharp=5:5:1.0:5:5:0`,
  };
}

async function runFFmpegWithLogs(ffmpeg, task) {
  const logs = [];
  const onLog = ({ message }) => {
    if (message) logs.push(message);
  };

  ffmpeg.on('log', onLog);
  try {
    await task();
  } finally {
    ffmpeg.off('log', onLog);
  }

  return logs.join('\n');
}

async function execFFmpegChecked(ffmpeg, args, errorMessage = 'FFmpeg no pudo completar la edición.') {
  const result = await ffmpeg.exec(args, EDITOR_FFMPEG_EXEC_TIMEOUT_MS);
  if (result !== 0) throw new Error(errorMessage);
  return result;
}

function withTimeout(promise, timeoutMs, errorMessage) {
  if (!Number.isFinite(timeoutMs) || timeoutMs <= 0) return promise;

  let timeoutId = null;
  const timeoutPromise = new Promise((_, reject) => {
    timeoutId = setTimeout(() => reject(new Error(errorMessage)), timeoutMs);
  });

  return Promise.race([promise, timeoutPromise]).finally(() => {
    if (timeoutId) clearTimeout(timeoutId);
  });
}

async function probeDuration(ffmpeg, inputName, outputName) {
  await ffmpeg.ffprobe([
    '-v', 'error',
    '-show_entries', 'format=duration',
    '-of', 'default=noprint_wrappers=1:nokey=1',
    inputName,
    '-o', outputName,
  ]);

  const text = await ffmpeg.readFile(outputName, 'utf8');
  await ffmpeg.deleteFile(outputName).catch(() => {});
  const duration = Number.parseFloat(String(text).trim());
  return Number.isFinite(duration) ? duration : 0;
}

async function probeHasAudio(ffmpeg, inputName, outputName) {
  await ffmpeg.ffprobe([
    '-v', 'error',
    '-select_streams', 'a',
    '-show_entries', 'stream=codec_type',
    '-of', 'csv=p=0',
    inputName,
    '-o', outputName,
  ]);

  const text = await ffmpeg.readFile(outputName, 'utf8').catch(() => '');
  await ffmpeg.deleteFile(outputName).catch(() => {});
  return String(text).includes('audio');
}

function buildRhythmSegments(duration, referenceMeta = {}, index = 0) {
  if (!duration || duration < 3.5) return [{ start: 0, end: duration }];

  const refDuration = Number(referenceMeta.duration || 0);
  const cadence = refDuration > 0 && refDuration < 12 ? 1.8 : 2.35;
  const gap = 0.18 + (index % 3) * 0.04;
  const keep = Math.max(1.05, cadence - gap);
  const segments = [];
  let cursor = 0;

  while (cursor < duration) {
    const end = Math.min(duration, cursor + keep);
    if (end - cursor >= 0.35) segments.push({ start: cursor, end });
    cursor += cadence;
  }

  return segments.length > 1 ? segments : [{ start: 0, end: duration }];
}

function parseSceneTimes(logText) {
  const times = [];
  const regex = /pts_time:\s*([0-9.]+)/g;
  let match;

  while ((match = regex.exec(String(logText))) !== null) {
    const time = Number.parseFloat(match[1]);
    if (Number.isFinite(time) && time > 0.15) times.push(time);
  }

  return Array.from(new Set(times.map(time => Number(time.toFixed(2)))))
    .sort((a, b) => a - b)
    .slice(0, 30);
}

async function detectSceneTimes(ffmpeg, inputName) {
  const attempts = [0.24, 0.18, 0.12];

  for (const threshold of attempts) {
    const logText = await runFFmpegWithLogs(ffmpeg, () => execFFmpegChecked(ffmpeg, [
      '-i', inputName,
      '-vf', `select='gt(scene,${threshold})',showinfo`,
      '-an',
      '-f', 'null',
      '-',
    ], 'No se pudo analizar los cortes visuales de la referencia.'));
    const times = parseSceneTimes(logText);
    if (times.length > 0) return times;
  }

  return [];
}

function getReferenceBeatDurations(referenceMeta = {}) {
  if (Array.isArray(referenceMeta.geminiBeatDurations) && referenceMeta.geminiBeatDurations.length > 0) {
    return referenceMeta.geminiBeatDurations
      .map(value => Math.max(0.45, Math.min(2.8, Number(value) || 0)))
      .filter(value => value >= 0.45)
      .slice(0, 18);
  }

  const duration = Number(referenceMeta.duration || 0);
  const sceneTimes = (referenceMeta.sceneTimes || [])
    .filter(time => Number.isFinite(time) && time > 0 && (!duration || time < duration - 0.1))
    .sort((a, b) => a - b);

  const points = duration > 0
    ? [0, ...sceneTimes, duration]
    : [0, ...sceneTimes];

  const beats = [];
  for (let i = 1; i < points.length; i++) {
    const beat = points[i] - points[i - 1];
    if (beat >= 0.28) beats.push(Math.max(0.45, Math.min(2.6, beat)));
  }

  if (beats.length > 0) return beats.slice(0, 18);

  if (duration > 0 && duration < 10) return [0.9, 0.75, 1.05, 0.65];
  if (duration > 0 && duration < 25) return [1.25, 0.9, 1.4, 0.8];
  return [1.6, 1.15, 1.35, 0.95];
}

function buildReferenceDrivenSegments(duration, referenceMeta = {}, index = 0, sourceSegments = []) {
  if (!duration || duration < 1.2) return [{ start: 0, end: duration }];

  const usableSources = (sourceSegments.length ? sourceSegments : [{ start: 0, end: duration }])
    .filter(segment => segment.end - segment.start >= 0.35);
  if (usableSources.length === 0) return [{ start: 0, end: duration }];

  const beats = getReferenceBeatDurations(referenceMeta);
  const gap = 0.14 + (index % 3) * 0.05;
  const segments = [];
  let sourceIndex = 0;
  let cursor = usableSources[0].start;
  let beatIndex = 0;

  while (sourceIndex < usableSources.length && segments.length < 70) {
    const source = usableSources[sourceIndex];
    if (cursor < source.start) cursor = source.start;
    if (cursor >= source.end - 0.25) {
      sourceIndex++;
      if (sourceIndex < usableSources.length) cursor = usableSources[sourceIndex].start;
      continue;
    }

    const beat = beats[beatIndex % beats.length];
    const end = Math.min(source.end, cursor + beat);
    if (end - cursor >= 0.32) segments.push({ start: cursor, end });

    cursor = end + gap;
    beatIndex++;
  }

  return segments.length > 1 ? segments : [{ start: 0, end: duration }];
}

function buildTemplateDrivenSegments(duration, template = {}, referenceMeta = {}, index = 0) {
  if (!duration || duration < 3.5) return [{ start: 0, end: duration }];

  const referenceBeats = Array.isArray(referenceMeta.sceneTimes) && referenceMeta.sceneTimes.length > 0
    ? getReferenceBeatDurations(referenceMeta)
    : [];
  const beats = referenceBeats.length > 0 ? referenceBeats : (template.beats || [1.15, 0.9, 1.25, 0.8]);
  const gap = Math.min(0.18, Math.max(0.08, 0.1 + (index % 3) * 0.025));
  const segments = [];
  let cursor = 0;
  let beatIndex = 0;

  while (cursor < duration - 0.28 && segments.length < 80) {
    const beat = Math.max(0.45, Math.min(2.8, Number(beats[beatIndex % beats.length]) || 1));
    const end = Math.min(duration, cursor + beat);
    if (end - cursor >= 0.32) segments.push({ start: cursor, end });
    cursor = end + gap;
    beatIndex++;
  }

  return segments.length > 1 ? segments : [{ start: 0, end: duration }];
}

function getGeminiApiKey() {
  return String(state.settings.geminiApiKey || '').trim();
}

function getGeminiModel() {
  return String(state.settings.geminiModel || 'gemini-1.5-pro').trim();
}

function isGeminiEnabled() {
  return Boolean(getGeminiApiKey());
}

function syncGeminiGlobals() {
  window.GEMINI_API_KEY = getGeminiApiKey();
  window.GEMINI_MODEL = getGeminiModel();
  window.GEMINI_IMAGE_MODEL = state.settings.geminiImageModel || 'gemini-2.0-flash-preview-image-generation';
  window.IMAGE_OVERLAY_OPACITY = Number(state.settings.imageOverlayOpacity || 0.55);
}

function readFileAsBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const value = String(reader.result || '');
      resolve(value.includes(',') ? value.split(',').pop() : value);
    };
    reader.onerror = () => reject(new Error('No se pudo leer el video para Gemini.'));
    reader.readAsDataURL(file);
  });
}

function clampNumber(value, min, max, fallback) {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.max(min, Math.min(max, number));
}

function extractJsonObject(text) {
  const raw = String(text || '').trim();
  if (!raw) return null;

  try {
    return JSON.parse(raw);
  } catch {
    const match = raw.match(/\{[\s\S]*\}/);
    if (!match) return null;
    try {
      return JSON.parse(match[0]);
    } catch {
      return null;
    }
  }
}

function normalizeGeminiEditPlan(plan = {}) {
  const allowedKeys = new Set(LOCAL_VIDEO_TEMPLATES.map(template => template.key));
  const styleKey = allowedKeys.has(plan.styleKey) ? plan.styleKey : '';
  const beats = Array.isArray(plan.cutCadenceSeconds)
    ? plan.cutCadenceSeconds
        .map(value => clampNumber(value, 0.45, 2.8, 0))
        .filter(Boolean)
        .slice(0, 18)
    : [];

  return {
    styleKey,
    profileName: String(plan.editProfileName || plan.profileName || '').trim().slice(0, 80),
    hook: String(plan.hook || '').trim().slice(0, 70),
    sub: String(plan.sub || plan.subtitle || '').trim().slice(0, 80),
    pacing: ['fast', 'medium', 'slow'].includes(plan.pacing) ? plan.pacing : '',
    beats,
    recommendedDuration: clampNumber(plan.recommendedDurationSeconds, 4, 90, 0),
    notes: Array.isArray(plan.notes) ? plan.notes.map(note => String(note).slice(0, 90)).slice(0, 3) : [],
  };
}

function getGeminiPrompt(baseVideo, reference, referenceMeta = {}, textConfig = {}) {
  const templates = LOCAL_VIDEO_TEMPLATES.map(template => `${template.key}: ${template.name} (${template.desc})`).join('\n');
  return `
Actuá como un editor de Reels de Instagram. Analizá el video base y el video ejemplar para crear un plan de edición aplicable con FFmpeg.

Objetivo: que el video base se parezca al ejemplar en ritmo, tipo de recorte, energía visual, ubicación de textos y duración, sin inventar escenas nuevas.

Plantillas disponibles:
${templates}

Datos del video base:
- Nombre: ${baseVideo.name}
- Tamaño MB: ${(baseVideo.size / 1024 / 1024).toFixed(1)}

Datos del ejemplar:
- Nombre: ${reference.name}
- Duración estimada: ${Number(referenceMeta.duration || 0).toFixed(2)}s
- Cortes detectados localmente: ${(referenceMeta.sceneTimes || []).slice(0, 12).join(', ') || 'sin cortes claros'}
- Brillo: ${Number(referenceMeta.visual?.brightness || 0).toFixed(2)}
- Saturación: ${Number(referenceMeta.visual?.saturation || 0).toFixed(2)}
- Contraste: ${Number(referenceMeta.visual?.contrast || 0).toFixed(2)}
- Zona de texto probable: ${referenceMeta.visual?.textBand?.key || 'lower'}

Textos pedidos por el usuario:
- Hook: ${textConfig.hook || 'vacío'}
- Subtexto: ${textConfig.sub || 'vacío'}
- Usuario: ${textConfig.username || 'vacío'}

Devolvé SOLO JSON válido con esta forma:
{
  "styleKey": "una key exacta de las plantillas",
  "editProfileName": "nombre corto del look",
  "pacing": "fast|medium|slow",
  "cutCadenceSeconds": [0.8, 1.1, 0.7],
  "recommendedDurationSeconds": 18,
  "hook": "si el usuario no escribió hook, sugerí uno corto",
  "sub": "si el usuario no escribió subtexto, sugerí uno corto",
  "notes": ["máximo 3 notas cortas"]
}`.trim();
}

async function buildGeminiRequestParts(baseVideo, reference, referenceMeta, textConfig) {
  const parts = [{ text: getGeminiPrompt(baseVideo, reference, referenceMeta, textConfig) }];
  const totalVideoBytes = (baseVideo?.size || 0) + (reference?.file?.size || 0);

  if (totalVideoBytes > GEMINI_INLINE_VIDEO_MAX_BYTES) {
    parts.push({
      text: `No envío los videos completos porque pesan ${(totalVideoBytes / 1024 / 1024).toFixed(1)} MB. Usá los metadatos y el análisis local para devolver el mejor plan posible.`,
    });
    return parts;
  }

  if (baseVideo) {
    parts.push({ text: 'Video base del usuario:' });
    parts.push({
      inline_data: {
        mime_type: baseVideo.type || 'video/mp4',
        data: await readFileAsBase64(baseVideo),
      },
    });
  }

  if (reference?.file) {
    parts.push({ text: 'Video ejemplar de referencia:' });
    parts.push({
      inline_data: {
        mime_type: reference.file.type || 'video/mp4',
        data: await readFileAsBase64(reference.file),
      },
    });
  }

  return parts;
}

async function getGeminiEditPlan(baseVideo, reference, referenceMeta, textConfig) {
  if (!isGeminiEnabled()) return null;

  const model = getGeminiModel();
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`;
  const parts = await buildGeminiRequestParts(baseVideo, reference, referenceMeta, textConfig);
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-goog-api-key': getGeminiApiKey(),
    },
    body: JSON.stringify({
      contents: [{ role: 'user', parts }],
      generationConfig: {
        temperature: 0.35,
        responseMimeType: 'application/json',
      },
    }),
  });

  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    const message = payload?.error?.message || 'Gemini no pudo analizar la referencia.';
    throw new Error(message);
  }

  const text = payload?.candidates?.[0]?.content?.parts
    ?.map(part => part.text || '')
    .join('\n');
  const json = extractJsonObject(text);
  if (!json) throw new Error('Gemini devolvió una respuesta sin JSON de edición.');
  return normalizeGeminiEditPlan(json);
}

function applyGeminiPlanToReferenceMeta(referenceMeta = {}, geminiPlan = null) {
  if (!geminiPlan) return referenceMeta;
  return {
    ...referenceMeta,
    geminiBeatDurations: geminiPlan.beats,
    geminiPlan,
  };
}

function mergeTextConfigWithGemini(textConfig = {}, geminiPlan = null) {
  if (!geminiPlan) return textConfig;
  return {
    hook: textConfig.hook || geminiPlan.hook || '',
    sub: textConfig.sub || geminiPlan.sub || '',
    username: textConfig.username || '',
  };
}

function getEditorTextConfig() {
  return {
    hook: document.getElementById('global-hook')?.value?.trim() || '',
    sub: document.getElementById('global-sub')?.value?.trim() || '',
    username: document.getElementById('global-username')?.value?.trim() || '',
  };
}

function escapeDrawText(value) {
  return String(value || '')
    .replace(/\\/g, '\\\\')
    .replace(/:/g, '\\:')
    .replace(/'/g, "\\'")
    .replace(/%/g, '\\%')
    .replace(/\r?\n/g, ' ')
    .slice(0, 90);
}

function buildDrawTextFilter(text, y, fontSize, fontColor = 'white', borderColor = 'black') {
  if (!text) return '';
  return `drawtext=fontfile=${FFMPEG_FONT_FILE}:text='${escapeDrawText(text)}':x=(w-text_w)/2:y=${Math.round(y)}:fontsize=${fontSize}:fontcolor=${fontColor}:borderw=4:bordercolor=${borderColor}@0.75`;
}

function buildReferenceOverlayFilters(referenceMeta = {}, textConfig = {}) {
  const visual = referenceMeta.visual || {};
  const band = visual.textBand || { y: 0.68, luma: 0.35 };
  const anchorY = Math.max(120, Math.min(980, Math.round((band.y || 0.68) * 1280)));
  const brightBand = Number(band.luma || 0.5) > 0.52;
  const fontColor = brightBand ? 'black' : 'white';
  const borderColor = brightBand ? 'white' : 'black';
  const filters = [];

  if (textConfig.hook) {
    filters.push('drawbox=x=42:y=' + Math.max(40, anchorY - 34) + ':w=636:h=108:color=' + (brightBand ? 'white@0.58' : 'black@0.52') + ':t=fill');
    filters.push(buildDrawTextFilter(textConfig.hook, anchorY, 52, fontColor, borderColor));
  }

  if (textConfig.sub) {
    filters.push(buildDrawTextFilter(textConfig.sub, Math.min(1110, anchorY + 76), 34, fontColor, borderColor));
  }

  if (textConfig.username) {
    filters.push('drawbox=x=36:y=1128:w=300:h=54:color=black@0.35:t=fill');
    filters.push(`drawtext=fontfile=${FFMPEG_FONT_FILE}:text='${escapeDrawText(textConfig.username)}':x=58:y=1142:fontsize=28:fontcolor=white:borderw=2:bordercolor=black@0.7`);
  }

  return filters.filter(Boolean);
}

function getTemplateTextConfig(template, textConfig = {}) {
  return {
    hook: textConfig.hook || template.defaultHook || '',
    sub: textConfig.sub || template.defaultSub || '',
    username: textConfig.username || '',
  };
}

function buildTemplateOverlayFilters(template, referenceMeta = {}, textConfig = {}, index = 0) {
  const mergedText = getTemplateTextConfig(template, textConfig);
  const visual = referenceMeta.visual || {};
  const band = visual.textBand || {};
  const textY = Math.max(150, Math.min(890, Math.round((band.y || 0.24) * 1280)));
  const hook = mergedText.hook;
  const sub = mergedText.sub;
  const username = mergedText.username;
  const filters = [];
  const safeTop = 74;
  const bottom = 1086;

  const addCenteredText = (text, y, size, color = 'white', border = 'black', borderWidth = 4) => {
    if (!text) return;
    filters.push(`drawtext=fontfile=${FFMPEG_FONT_FILE}:text='${escapeDrawText(text)}':x=(w-text_w)/2:y=${Math.round(y)}:fontsize=${size}:fontcolor=${color}:borderw=${borderWidth}:bordercolor=${border}@0.75`);
  };

  const addUsername = () => {
    if (!username) return;
    filters.push('drawbox=x=42:y=1136:w=300:h=54:color=black@0.34:t=fill');
    filters.push(`drawtext=fontfile=${FFMPEG_FONT_FILE}:text='${escapeDrawText(username)}':x=62:y=1150:fontsize=28:fontcolor=white:borderw=2:bordercolor=black@0.7`);
  };

  switch (template.key) {
    case 'ig-cinematic-hook':
    case 'ig-night-cinema':
      filters.push('drawbox=x=0:y=0:w=720:h=88:color=black@0.78:t=fill');
      filters.push('drawbox=x=0:y=1192:w=720:h=88:color=black@0.78:t=fill');
      filters.push('drawbox=x=40:y=182:w=640:h=122:color=black@0.42:t=fill:enable=lt(t\\,5)');
      addCenteredText(hook, 210, 46);
      addCenteredText(sub, 1118, 30, 'white', 'black', 3);
      break;
    case 'ig-bold-captions':
    case 'ig-viral-zoom':
    case 'ig-fitness-pulse':
      filters.push('drawbox=x=30:y=' + Math.max(118, textY - 44) + ':w=660:h=132:color=black@0.48:t=fill');
      addCenteredText(hook, Math.max(145, textY - 8), 58, 'white', 'black');
      addCenteredText(sub, Math.max(228, textY + 66), 34, 'yellow', 'black', 3);
      break;
    case 'ig-luxury-reveal':
    case 'ig-fashion-cut':
    case 'ig-soft-minimal':
      filters.push('drawbox=x=34:y=34:w=652:h=1212:color=white@0.22:t=3');
      addCenteredText(hook, safeTop, 38, 'white', 'black', 3);
      addCenteredText(sub, bottom, 28, 'white', 'black', 2);
      break;
    case 'ig-clean-tutorial':
      filters.push('drawbox=x=42:y=96:w=104:h=52:color=white@0.9:t=fill');
      filters.push(`drawtext=fontfile=${FFMPEG_FONT_FILE}:text='TIP':x=72:y=108:fontsize=28:fontcolor=black:borderw=0`);
      addCenteredText(hook, 170, 44);
      addCenteredText(sub, 1050, 32);
      break;
    case 'ig-product-spotlight':
    case 'ig-food-closeup':
      filters.push('drawbox=x=52:y=928:w=616:h=142:color=black@0.46:t=fill');
      addCenteredText(hook, 956, 44);
      addCenteredText(sub, 1016, 30, 'white', 'black', 3);
      break;
    case 'ig-story-pop':
    case 'ig-ugc-review':
      filters.push('drawbox=x=52:y=42:w=616:h=6:color=white@0.85:t=fill');
      filters.push('drawbox=x=48:y=92:w=624:h=102:color=black@0.38:t=fill');
      addCenteredText(hook, 120, 42);
      addCenteredText(sub, 1018, 31);
      break;
    case 'ig-documentary':
    case 'ig-podcast-clips':
      filters.push('drawbox=x=34:y=862:w=652:h=172:color=black@0.62:t=fill');
      addCenteredText(hook, 898, 42);
      addCenteredText(sub, 958, 30, 'white', 'black', 2);
      break;
    case 'ig-neon-glitch':
    case 'ig-meme-reaction':
      filters.push('drawbox=x=26:y=120:w=668:h=124:color=black@0.44:t=fill');
      addCenteredText(hook, 150, 52, 'cyan', 'black');
      addCenteredText(sub, 214, 30, 'magenta', 'black', 3);
      break;
    case 'ig-travel-dream':
      filters.push('drawbox=x=0:y=874:w=720:h=214:color=black@0.3:t=fill');
      addCenteredText(hook, 920, 42);
      addCenteredText(sub, 980, 30);
      break;
    case 'ig-before-after':
      filters.push('drawbox=x=358:y=116:w=4:h=1000:color=white@0.75:t=fill');
      filters.push(`drawtext=fontfile=${FFMPEG_FONT_FILE}:text='ANTES':x=80:y=112:fontsize=30:fontcolor=white:borderw=3:bordercolor=black@0.7`);
      filters.push(`drawtext=fontfile=${FFMPEG_FONT_FILE}:text='DESPUES':x=430:y=112:fontsize=30:fontcolor=white:borderw=3:bordercolor=black@0.7`);
      addCenteredText(hook, 1050, 38);
      break;
    case 'ig-countdown-launch':
      filters.push(`drawtext=fontfile=${FFMPEG_FONT_FILE}:text='3':x=(w-text_w)/2:y=430:fontsize=180:fontcolor=white:borderw=8:bordercolor=black@0.65:enable=lt(t\\,0.75)`);
      filters.push(`drawtext=fontfile=${FFMPEG_FONT_FILE}:text='2':x=(w-text_w)/2:y=430:fontsize=180:fontcolor=white:borderw=8:bordercolor=black@0.65:enable=between(t\\,0.75\\,1.5)`);
      filters.push(`drawtext=fontfile=${FFMPEG_FONT_FILE}:text='1':x=(w-text_w)/2:y=430:fontsize=180:fontcolor=white:borderw=8:bordercolor=black@0.65:enable=between(t\\,1.5\\,2.25)`);
      addCenteredText(hook, 142, 42);
      addCenteredText(sub, 1050, 32);
      break;
    default:
      filters.push(...buildReferenceOverlayFilters(referenceMeta, mergedText));
  }

  addUsername();
  if (index % 2 === 1) filters.push('drawbox=x=0:y=0:w=720:h=1280:color=white@0.035:t=fill:enable=lt(mod(t\\,1.2)\\,0.08)');
  return filters.filter(Boolean);
}

function getTemplateAudioFilter(template, hasAudio) {
  if (!hasAudio) return '';

  const common = 'afade=t=in:st=0:d=0.08,alimiter=limit=0.92';
  const filterByType = {
    cinematic: `acompressor=threshold=0.13:ratio=2.2:attack=18:release=220,bass=g=3,treble=g=-1,${common}`,
    punch: `acompressor=threshold=0.17:ratio=3:attack=6:release=90,bass=g=4,treble=g=2,${common}`,
    warm: `acompressor=threshold=0.14:ratio=2:attack=14:release=180,bass=g=2,treble=g=-0.5,${common}`,
    clean: `acompressor=threshold=0.12:ratio=1.8:attack=10:release=160,treble=g=1,${common}`,
    bright: `acompressor=threshold=0.13:ratio=2:attack=8:release=140,treble=g=2.5,${common}`,
    documentary: `acompressor=threshold=0.1:ratio=2.4:attack=18:release=220,highpass=f=80,${common}`,
    neon: `acompressor=threshold=0.2:ratio=3.2:attack=4:release=80,bass=g=5,treble=g=3,${common}`,
    wide: `acompressor=threshold=0.13:ratio=2:attack=16:release=200,bass=g=2,treble=g=1,${common}`,
    voice: `highpass=f=90,acompressor=threshold=0.09:ratio=3:attack=8:release=180,treble=g=2,${common}`,
  };

  return filterByType[template.audio] || common;
}

function appendVideoFilters(baseFilter, extraFilters = [], segment = null) {
  const filters = [baseFilter, ...extraFilters].filter(Boolean);
  if (segment && segment.transition) {
    const duration = Math.max(0, segment.end - segment.start);
    const fadeDuration = Math.min(0.16, Math.max(0.06, duration * 0.12));
    filters.push(`fade=t=in:st=0:d=${fadeDuration.toFixed(2)}`);
    if (duration > fadeDuration * 3) {
      filters.push(`fade=t=out:st=${Math.max(0, duration - fadeDuration).toFixed(2)}:d=${fadeDuration.toFixed(2)}`);
    }
  }
  return filters.join(',');
}

function formatSeconds(value) {
  return Number(value || 0).toFixed(3);
}

function ffmpegSmartEditCommand(input, output, editPlan) {
  const profile = editPlan.profile;
  const segments = editPlan.segments || [];
  const overlayFilters = editPlan.overlayFilters || [];
  const audioFilter = editPlan.audioFilter || '';

  if (!editPlan.hasAudio) {
    if (segments.length > 1) {
      const chains = [];
      const concatInputs = [];

      segments.forEach((segment, index) => {
        const start = formatSeconds(segment.start);
        const end = formatSeconds(segment.end);
        const filter = appendVideoFilters(profile.filter, overlayFilters, { ...segment, transition: index > 0 });
        chains.push(`[0:v]trim=start=${start}:end=${end},setpts=PTS-STARTPTS,${filter}[v${index}]`);
        concatInputs.push(`[v${index}]`);
      });

      return [
        '-i', input,
        '-filter_complex', `${chains.join(';')};${concatInputs.join('')}concat=n=${segments.length}:v=1:a=0[v]`,
        ...ffmpegRenderArgs(output, null),
      ];
    }

    return [
      '-i', input,
      '-filter_complex', `[0:v]${appendVideoFilters(profile.filter, overlayFilters)}[v]`,
      ...ffmpegRenderArgs(output, null),
    ];
  }

  if (segments.length > 1) {
    const chains = [];
    const concatInputs = [];

    segments.forEach((segment, index) => {
      const start = formatSeconds(segment.start);
      const end = formatSeconds(segment.end);
      const filter = appendVideoFilters(profile.filter, overlayFilters, { ...segment, transition: index > 0 });
      chains.push(`[0:v]trim=start=${start}:end=${end},setpts=PTS-STARTPTS,${filter}[v${index}]`);
      chains.push(`[0:a]atrim=start=${start}:end=${end},asetpts=PTS-STARTPTS[a${index}]`);
      concatInputs.push(`[v${index}][a${index}]`);
    });

    const concat = `${chains.join(';')};${concatInputs.join('')}concat=n=${segments.length}:v=1:a=1[v][a]`;
    const audio = audioFilter ? `;[a]${audioFilter}[ao]` : '';

    return [
      '-i', input,
      '-filter_complex', `${concat}${audio}`,
      ...ffmpegRenderArgs(output, audioFilter ? '[ao]' : '[a]'),
    ];
  }

  const audioChain = audioFilter ? `[0:a]${audioFilter}[a]` : '[0:a]anull[a]';
  return [
    '-i', input,
    '-filter_complex', `[0:v]${appendVideoFilters(profile.filter, overlayFilters)}[v];${audioChain}`,
    ...ffmpegRenderArgs(output, '[a]'),
  ];
}

function handleReferenceUpload(event) {
  const files = Array.from(event.target.files).filter(f => f.type.startsWith('video/'));
  const remainingSlots = Math.max(0, 15 - state.referenceVideos.length);
  const accepted = files.slice(0, remainingSlots);

  if (accepted.length < files.length) {
    toast('Podés cargar hasta 15 videos de referencia', 'error');
  }

  accepted.forEach((file, offset) => {
    const index = state.referenceVideos.length + offset;
    const template = LOCAL_VIDEO_TEMPLATES[index % LOCAL_VIDEO_TEMPLATES.length];
    const id = `ref_${Date.now()}_${Math.random().toString(16).slice(2)}`;
    state.referenceVideos.push({
      id,
      file,
      name: file.name,
      size: file.size,
      previewUrl: URL.createObjectURL(file),
      templateKey: template.key,
    });
    state.selectedReferences.add(id);
  });

  event.target.value = '';
  renderReferenceVideos();
}

function renderReferenceVideos() {
  const grid = document.getElementById('reference-videos-grid');
  if (!grid) return;

  if (state.referenceVideos.length === 0) {
    grid.innerHTML = `<div class="empty-reference-state">Agregá videos de referencia para inspirar cortes, ritmo y estilo.</div>`;
    updateReferenceCount();
    return;
  }

  grid.innerHTML = state.referenceVideos.map((ref, i) => {
    const selected = state.selectedReferences.has(ref.id);
    return `
      <div class="reference-card ${selected ? 'selected' : ''}" data-reference-id="${ref.id}" onclick="toggleReferenceVideo('${ref.id}')">
        <div class="reference-preview">
          <video src="${ref.previewUrl}" muted playsinline preload="metadata"></video>
        </div>
        <div class="reference-info">
          <div class="reference-name">${escapeHtml(ref.name)}</div>
          <div class="reference-meta">${(ref.size / 1024 / 1024).toFixed(1)} MB · ritmo y estilo</div>
        </div>
        <button class="reference-remove" onclick="event.stopPropagation(); removeReferenceVideo('${ref.id}')" aria-label="Quitar referencia">×</button>
        <div class="template-check">✓</div>
      </div>
    `;
  }).join('');

  updateReferenceCount();
}

function toggleReferenceVideo(id) {
  if (state.selectedReferences.has(id)) {
    state.selectedReferences.delete(id);
  } else {
    state.selectedReferences.add(id);
  }
  renderReferenceVideos();
}

function removeReferenceVideo(id) {
  const ref = state.referenceVideos.find(item => item.id === id);
  if (ref?.previewUrl) URL.revokeObjectURL(ref.previewUrl);
  state.referenceVideos = state.referenceVideos.filter(item => item.id !== id);
  state.selectedReferences.delete(id);
  renderReferenceVideos();
}

function selectAllReferences() {
  state.referenceVideos.forEach(ref => state.selectedReferences.add(ref.id));
  renderReferenceVideos();
}

function clearReferences() {
  state.selectedReferences.clear();
  renderReferenceVideos();
}

function updateReferenceCount() {
  const selected = state.selectedReferences.size;
  const total = state.referenceVideos.length;
  const selectedEl = document.getElementById('selected-references-count');
  const totalEl = document.getElementById('total-references-count');

  if (selectedEl) selectedEl.textContent = selected;
  if (totalEl) totalEl.textContent = total;
  updateFormatCount();
}

function setRenderStatus(id, text, type = '') {
  const el = document.getElementById(id);
  if (!el) return;
  el.className = `result-meta ${type}`.trim();
  el.textContent = text;
}

function downloadGeneratedVideo(id) {
  const item = state.generatedVideos.find(video => video.id === id);
  if (!item) return;

  const link = document.createElement('a');
  link.href = item.url;
  link.download = item.file.name;
  document.body.appendChild(link);
  link.click();
  link.remove();
}

function useGeneratedForPublish(id) {
  const item = state.generatedVideos.find(video => video.id === id);
  if (!item) return;

  state.selectedVideo = item.file;
  const input = document.getElementById('video-input');
  if (input) input.value = '';

  navigateTo('publisher');
  const preview = document.getElementById('video-preview');
  if (preview) preview.src = item.url;
  document.getElementById('upload-zone').style.display = 'none';
  document.getElementById('video-preview-container').style.display = 'flex';
  document.getElementById('video-info').textContent = `${item.file.name} · ${(item.file.size / 1024 / 1024).toFixed(1)} MB`;
  document.getElementById('video-public-url').value = '';
  toast('Video listo para publicar', 'success');
}

async function loadFFmpeg(statusEl) {
  if (state.ffmpeg.loaded) return state.ffmpeg;
  if (state.ffmpeg.loading) {
    while (state.ffmpeg.loading) await sleep(250);
    return state.ffmpeg;
  }

  state.ffmpeg.loading = true;
  if (statusEl) statusEl.textContent = 'Cargando FFmpeg.wasm por primera vez...';

  try {
    const [{ FFmpeg }, { fetchFile, toBlobURL }] = await Promise.all([
      import('/vendor/ffmpeg/ffmpeg/index.js'),
      import('/vendor/ffmpeg/util/index.js'),
    ]);

    const ffmpeg = new FFmpeg();
    const baseURL = `https://cdn.jsdelivr.net/npm/@ffmpeg/core@${FFMPEG_CORE_VERSION}/dist/esm`;

    ffmpeg.on('progress', ({ progress }) => {
      if (!state.ffmpeg.activeStatusId) return;
      const pct = Math.max(0, Math.min(100, Math.round((progress || 0) * 100)));
      setRenderStatus(state.ffmpeg.activeStatusId, `Procesando... ${pct}%`);
    });

    await ffmpeg.load({
      classWorkerURL: '/vendor/ffmpeg/ffmpeg/worker.js',
      coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
      wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
    });

    state.ffmpeg.instance = ffmpeg;
    state.ffmpeg.fetchFile = fetchFile;
    state.ffmpeg.loaded = true;
    return state.ffmpeg;
  } finally {
    state.ffmpeg.loading = false;
  }
}

function getVariantUniqueRuntimeStatusEl() {
  return document.getElementById('variant-unique-runtime-status');
}

function updateVariantUniqueControls() {
  const button = document.getElementById('variant-unique-btn');
  const statusEl = getVariantUniqueRuntimeStatusEl();
  const hasVideo = Boolean(state.editorVideos?.length);
  const runtimeReady = Boolean(state.ffmpeg.loaded && state.ffmpeg.instance);
  const runtimeLoading = Boolean(state.ffmpeg.loading);

  if (button) {
    button.disabled = !hasVideo || runtimeLoading || !runtimeReady;
    button.textContent = runtimeLoading
      ? 'Preparando motor local...'
      : '⚡ Generar Variantes Únicas';
  }

  if (!statusEl) return;
  if (!hasVideo) {
    statusEl.textContent = 'Cargá un video base para preparar el motor local.';
    return;
  }
  if (runtimeLoading) {
    statusEl.textContent = 'Preparando motor local...';
    return;
  }
  if (runtimeReady) {
    statusEl.textContent = 'Motor local listo. Ya podés generar variantes.';
    return;
  }
  statusEl.textContent = 'Preparando motor local cuando cargues el video.';
}

async function ensureVariantUniqueRuntime(statusEl = getVariantUniqueRuntimeStatusEl()) {
  if (state.ffmpeg.loaded && state.ffmpeg.instance) {
    updateVariantUniqueControls();
    return state.ffmpeg;
  }

  if (state.ffmpeg.loading) {
    if (statusEl) statusEl.textContent = 'Preparando motor local...';
    while (state.ffmpeg.loading) await sleep(250);
    updateVariantUniqueControls();
    return state.ffmpeg;
  }

  if (statusEl) statusEl.textContent = 'Preparando motor local...';
  const runtime = await loadFFmpeg(statusEl);
  updateVariantUniqueControls();
  return runtime;
}

function resetEditorFFmpegRuntime() {
  if (state.ffmpeg.instance) {
    try {
      state.ffmpeg.instance.terminate();
    } catch {
      // Ignore teardown errors from a worker that is already gone.
    }
  }

  state.ffmpeg.instance = null;
  state.ffmpeg.fetchFile = null;
  state.ffmpeg.loaded = false;
  state.ffmpeg.loading = false;
  state.ffmpeg.fontLoaded = false;
}

async function execEditorFFmpegChecked(runtime, args, onProgress, errorMessage = 'FFmpeg no pudo completar la edición.') {
  const ffmpeg = runtime?.instance;
  if (!ffmpeg) throw new Error('FFmpeg no esta disponible.');

  let lastProgressAt = Date.now();
  let watchdogError = null;
  let finished = false;
  const onHeartbeat = () => {
    lastProgressAt = Date.now();
  };
  const onFfmpegProgress = ({ progress }) => {
    lastProgressAt = Date.now();
    if (!onProgress) return;
    const pct = 92 + (Math.max(0, Math.min(1, Number(progress) || 0)) * 6);
    onProgress(pct, 'Procesando con FFmpeg...');
  };

  const abortRuntime = reason => {
    if (watchdogError) return;
    watchdogError = new Error(reason);
    watchdogError.code = 'editor_ffmpeg_watchdog';
    try {
      ffmpeg.terminate();
    } catch {
      // Ignore errors while aborting a stalled worker.
    }
    resetEditorFFmpegRuntime();
  };

  const progressCheckInterval = Math.max(5000, Math.floor(EDITOR_FFMPEG_STALL_TIMEOUT_MS / 3));
  const stallTimer = setInterval(() => {
    if (finished || watchdogError) return;
    if (Date.now() - lastProgressAt >= EDITOR_FFMPEG_STALL_TIMEOUT_MS) {
      abortRuntime('FFmpeg se quedo sin avances y fue reiniciado.');
    }
  }, progressCheckInterval);

  const hardTimeout = setTimeout(() => {
    if (!finished && !watchdogError) {
      abortRuntime('FFmpeg tardo demasiado y fue reiniciado.');
    }
  }, EDITOR_FFMPEG_EXEC_TIMEOUT_MS);

  const cleanup = () => {
    if (finished) return;
    finished = true;
    clearInterval(stallTimer);
    clearTimeout(hardTimeout);
    ffmpeg.off?.('progress', onHeartbeat);
    ffmpeg.off?.('progress', onFfmpegProgress);
  };

  ffmpeg.on?.('progress', onHeartbeat);
  ffmpeg.on?.('progress', onFfmpegProgress);

  try {
    const result = await ffmpeg.exec(args);
    if (watchdogError) throw watchdogError;
    if (result !== 0) throw new Error(errorMessage);
    return result;
  } catch (error) {
    if (watchdogError) throw watchdogError;
    throw error;
  } finally {
    cleanup();
  }
}

async function ensureFFmpegFont(runtime) {
  if (state.ffmpeg.fontLoaded) return;

  const response = await fetch(FFMPEG_FONT_URL);
  if (!response.ok) throw new Error('No se pudo cargar la fuente para textos del editor.');
  const data = new Uint8Array(await response.arrayBuffer());
  await runtime.instance.writeFile(FFMPEG_FONT_FILE, data);
  state.ffmpeg.fontLoaded = true;
}

function getTemplateByKey(key) {
  return LOCAL_VIDEO_TEMPLATES.find(template => template.key === key);
}

function safeFilePart(value) {
  return String(value || 'video').replace(/\.[^.]+$/, '').replace(/[^a-z0-9._-]/gi, '-').slice(0, 80);
}

function renderPendingResult(template, reference, index, profile, editStats, geminiPlan = null) {
  const item = document.createElement('div');
  const id = `render_${Date.now()}_${index}`;
  const cutText = editStats?.mode === 'reference'
      ? `${Math.max(0, editStats.referenceCutCount || 0)} corte(s) del ejemplar`
    : editStats?.mode === 'rhythm'
      ? `${Math.max(0, editStats.rhythmCutCount || 0)} corte(s) de ritmo`
      : 'estilo visual';
  const referenceText = reference?.name
    ? `Referencia: ${escapeHtml(reference.name)}`
    : 'Sin referencia: ritmo propio del formato';
  item.className = 'result-item generating-item';
  item.id = id;
  item.innerHTML = `
    <div class="result-thumb">◧</div>
    <div class="result-info">
      <div class="result-name">${index + 1}. ${escapeHtml(template.name)}</div>
      <div class="result-meta" id="${id}_status">En cola...</div>
      <div class="result-meta">Edición: ${escapeHtml(profile.name)} · ${escapeHtml(cutText)}</div>
      <div class="result-meta">${geminiPlan ? `Gemini Omni: ${escapeHtml(geminiPlan.profileName || geminiPlan.pacing || 'plan aplicado')}` : referenceText}</div>
      <div class="result-actions" id="${id}_actions"></div>
    </div>
  `;
  document.getElementById('generated-results').appendChild(item);
  return id;
}

function renderCompletedResult(resultId, generated) {
  const thumb = document.querySelector(`#${resultId} .result-thumb`);
  const actions = document.getElementById(`${resultId}_actions`);
  if (thumb) {
    thumb.innerHTML = `<video src="${generated.url}" muted playsinline controls></video>`;
  }
  setRenderStatus(`${resultId}_status`, 'Listo para descargar', 'success');
  if (actions) {
    actions.innerHTML = `
      <button class="btn btn-outline btn-sm" onclick="downloadGeneratedVideo('${generated.id}')">↓ Descargar</button>
      <button class="btn btn-ghost btn-sm" onclick="useGeneratedForPublish('${generated.id}')">◆ Publicar</button>
    `;
  }
}

function renderAutomaticPendingResult(plan, index, total) {
  const item = document.createElement('div');
  const id = `auto_render_${Date.now()}_${index}`;
  item.className = 'result-item generating-item';
  item.id = id;
  item.innerHTML = `
    <div class="result-thumb">◧</div>
    <div class="result-info">
      <div class="result-name">${index + 1}. ${escapeHtml(plan.format.replaceAll('_', ' '))}</div>
      <div class="result-meta" id="${id}_status">Formato ${index + 1} de ${total} en cola...</div>
      <div class="result-meta">Plan IA: ${plan.timeline.length} acciones · ${Number(plan.duration || 0).toFixed(1)}s</div>
      <div class="result-actions" id="${id}_actions"></div>
    </div>
  `;
  document.getElementById('generated-results').appendChild(item);
  return id;
}

function renderAutomaticAnalysisSummary(engineResult) {
  const analysis = engineResult.analysis || {};
  const transcription = engineResult.transcription || {};
  const selectedFormats = engineResult.selectedFormats || [];
  const results = document.getElementById('generated-results');
  if (!results) return;

  const ideas = (analysis.ideas || []).slice(0, 4).map(idea => `
    <div class="ai-analysis-row">
      <strong>${Number(idea.start || 0).toFixed(1)}s-${Number(idea.end || 0).toFixed(1)}s</strong>
      <span>${escapeHtml(idea.text)}</span>
    </div>
  `).join('');

  results.insertAdjacentHTML('beforeend', `
    <div class="ai-analysis-card">
      <div class="ai-analysis-header">
        <div>
          <div class="result-name">Analisis Gemini listo</div>
          <div class="result-meta">${Math.max(0, transcription.words?.length || 0)} palabra(s) · ${Number(transcription.duration || 0).toFixed(1)}s · ${escapeHtml(analysis.content_type || 'sin tipo')}</div>
        </div>
        <span class="badge badge-active">${escapeHtml(analysis.engagement_trigger || 'auto')}</span>
      </div>
      <div class="ai-analysis-grid">
        <div>
          <span class="ai-analysis-label">Hook</span>
          <p>${escapeHtml(analysis.hook || 'Sin hook detectado')}</p>
        </div>
        <div>
          <span class="ai-analysis-label">Keywords</span>
          <p>${escapeHtml((analysis.keywords || []).join(', ') || 'Sin keywords')}</p>
        </div>
      </div>
      <div class="ai-analysis-formats">
        ${selectedFormats.map(format => `<span>${escapeHtml(format.replaceAll('_', ' '))}</span>`).join('')}
      </div>
      ${ideas ? `<div class="ai-analysis-ideas">${ideas}</div>` : ''}
    </div>
  `);
}

function getSegmentImageList(segmentImages = state.segmentImages) {
  return Object.entries(segmentImages || {}).flatMap(([format, images]) =>
    (images || []).map(image => ({ ...image, format: image.format || format }))
  );
}

function renderSegmentImagePreview(segmentImages = state.segmentImages) {
  const results = document.getElementById('generated-results');
  if (!results) return;

  const existing = document.getElementById('segment-image-preview');
  if (existing) existing.remove();

  const images = getSegmentImageList(segmentImages);
  const html = images.length
    ? `
      <div class="segment-image-preview-grid">
        ${images.map(image => `
          <div class="segment-image-card" id="segment-image-${escapeHtml(image.format)}-${image.ideaIndex}">
            <img src="${escapeHtml(image.imageUrl)}" alt="Imagen generada para ${escapeHtml(image.format)}" />
            <div class="segment-image-card-body">
              <div class="segment-image-card-title">${escapeHtml(image.format.replaceAll('_', ' '))}</div>
              <div class="segment-image-card-meta">${Number(image.second || 0).toFixed(1)}s · ${Number(image.duration || 0).toFixed(1)}s</div>
              <button class="btn btn-outline btn-sm" onclick="regenerateSegmentImage('${escapeHtml(image.format)}', ${Number(image.ideaIndex || 0)})">Regenerar imagen</button>
            </div>
          </div>
        `).join('')}
      </div>
    `
    : '<div class="segment-image-empty">No se generaron imágenes. El render seguirá solo con el video original y overlays de texto.</div>';

  results.insertAdjacentHTML('beforeend', `
    <div class="segment-image-preview" id="segment-image-preview">
      <div class="segment-image-preview-header">
        <div>
          <div class="result-name">Imagenes por segmento</div>
          <div class="result-meta">${images.length} imagen(es) listas para usar como capa visual.</div>
        </div>
        <span class="badge badge-pending">Preview</span>
      </div>
      ${html}
    </div>
  `);
}

async function regenerateSegmentImage(format, ideaIndex) {
  const engineResult = state.lastAutomaticEngineResult;
  const plan = engineResult?.plans?.find(item => item.format === format);
  const idea = engineResult?.analysis?.ideas?.[ideaIndex];
  if (!plan || !idea) {
    toast('No encontré el segmento para regenerar.', 'error');
    return;
  }

  const card = document.getElementById(`segment-image-${format}-${ideaIndex}`);
  const button = card?.querySelector('button');
  if (button) {
    button.disabled = true;
    button.textContent = 'Regenerando...';
  }

  try {
    const { generateSegmentImages } = await import('/src/engine/formatEngine.js');
    const partialAnalysis = {
      ...engineResult.analysis,
      ideas: [idea],
    };
    const images = await generateSegmentImages(partialAnalysis, plan, {
      apiKey: getGeminiApiKey(),
      imageModel: state.settings.geminiImageModel,
      imageOverlayOpacity: state.settings.imageOverlayOpacity,
      maxSegmentImages: 1,
    });
    if (!images[0]) throw new Error('Gemini no devolvió una imagen nueva.');

    const nextImage = {
      ...images[0],
      format,
      ideaIndex,
      second: state.segmentImages?.[format]?.find(image => image.ideaIndex === ideaIndex)?.second ?? images[0].second,
    };
    const currentImages = state.segmentImages[format] || [];
    const replaced = currentImages.some(image => image.ideaIndex === ideaIndex);
    state.segmentImages[format] = replaced
      ? currentImages.map(image => image.ideaIndex === ideaIndex ? nextImage : image)
      : [...currentImages, nextImage];
    renderSegmentImagePreview(state.segmentImages);
    toast('Imagen regenerada', 'success');
  } catch (error) {
    toast(getErrorMessage(error, 'No se pudo regenerar la imagen.'), 'error');
  } finally {
    const updatedButton = document.querySelector(`#segment-image-${format}-${ideaIndex} button`);
    if (updatedButton) {
      updatedButton.disabled = false;
      updatedButton.textContent = 'Regenerar imagen';
    }
  }
}

async function generateAutomaticFormats() {
  const btn = document.getElementById('generate-btn');
  const results = document.getElementById('generated-results');
  const statusEl = document.getElementById('editor-render-status');
  const baseVideo = state.editorVideos[0];
  const resultIds = new Map();
  const allowedFormats = getSelectedAutomaticFormatKeys();

  if (allowedFormats.length === 0) {
    throw new Error('Selecciona al menos un formato automatico.');
  }

  syncGeminiGlobals();
  const { analyzeAndPlan, generateImagesForAllPlans, renderFormatQueue } = await import('/src/engine/formatEngine.js');

  state.generatedVideos.forEach(video => URL.revokeObjectURL(video.url));
  state.generatedVideos = [];
  results.innerHTML = `<div class="render-status" id="editor-render-status">Analizando video con Gemini...</div>`;

  const updateLiveStatus = message => {
    const liveStatus = document.getElementById('editor-render-status');
    if (liveStatus) liveStatus.textContent = message;
  };

  const engineResult = await analyzeAndPlan(baseVideo, {
    apiKey: getGeminiApiKey(),
    model: getGeminiModel(),
    maxFormats: Math.min(8, allowedFormats.length),
    allowedFormats,
    onProgress: event => {
      if (event.message) updateLiveStatus(event.message);
    },
  });
  state.lastAutomaticEngineResult = engineResult;
  state.segmentImages = {};

  results.innerHTML = '';
  renderAutomaticAnalysisSummary(engineResult);

  if (shouldGenerateSegmentImages()) {
    results.insertAdjacentHTML('beforeend', `<div class="render-status" id="editor-render-status">Generando imágenes por segmento con Gemini...</div>`);
    state.segmentImages = await generateImagesForAllPlans(engineResult.plans, engineResult.analysis, {
      apiKey: getGeminiApiKey(),
      imageModel: state.settings.geminiImageModel,
      imageOverlayOpacity: state.settings.imageOverlayOpacity,
      maxSegmentImages: 10,
      imageConcurrency: 3,
      onProgress: event => {
        if (event.message) updateLiveStatus(event.message);
      },
      onImageError: event => {
        console.warn('Gemini image generation failed', event);
      },
    });
    const imageStatus = document.getElementById('editor-render-status');
    if (imageStatus) imageStatus.remove();
    renderSegmentImagePreview(state.segmentImages);
  }

  results.insertAdjacentHTML('beforeend', `<div class="render-status" id="editor-render-status">Cargando FFmpeg.wasm para renderizar...</div>`);
  const runtime = await loadFFmpeg(document.getElementById('editor-render-status'));

  const renders = await renderFormatQueue(baseVideo, engineResult.plans, {
    ffmpeg: runtime.instance,
    fetchFile: runtime.fetchFile,
    onProgress: event => {
      if (event.format && Number.isFinite(event.progress)) {
        const id = resultIds.get(event.format);
        if (id) setRenderStatus(`${id}_status`, `Procesando... ${event.progress}%`);
      }
    },
    onFormatStart: ({ plan, index, total }) => {
      if (document.getElementById('editor-render-status')) {
        document.getElementById('editor-render-status').remove();
      }
      const id = renderAutomaticPendingResult(plan, index, total);
      resultIds.set(plan.format, id);
      setRenderStatus(`${id}_status`, 'Renderizando con FFmpeg.wasm...');
    },
    onComplete: result => {
      const id = resultIds.get(result.format);
      const generated = {
        id: `gen_auto_${Date.now()}_${result.format}`,
        template: result.format,
        name: result.format.replaceAll('_', ' '),
        referenceId: '',
        url: result.url,
        file: result.file,
      };
      state.generatedVideos.push(generated);
      if (id) renderCompletedResult(id, generated);
    },
  }, state.segmentImages);

  engineResult.plans.forEach((plan, index) => {
    state.history.push({
      id: `fmt_auto_${Date.now()}_${index}`,
      type: 'format',
      template: plan.format,
      filename: baseVideo.name,
      referenceFilename: '',
      editProfile: `Auto IA: ${engineResult.analysis.content_type}/${engineResult.analysis.engagement_trigger}`,
      ai: getGeminiModel(),
      status: 'ready',
      date: new Date().toISOString(),
    });
  });

  saveHistory();
  btn.innerHTML = `<span>◧</span> Generar <span id="gen-count">${state.selectedTemplates.size}</span> formato(s)`;
  toast(`${renders.length} formato(s) automaticos generados`, 'success');
}

async function generateFormats() {
  if (state.editorVideos.length === 0) { toast('Subí tu video base', 'error'); return; }
  if (!isGeminiEnabled() && getSelectedTemplates().length === 0) {
    toast('Seleccioná al menos un formato de Instagram', 'error');
    return;
  }

  const btn = document.getElementById('generate-btn');
  btn.disabled = true;
  btn.innerHTML = `<span class="spinner"></span> Procesando formato(s)...`;

  document.getElementById('editor-step-4').style.display = 'block';
  const results = document.getElementById('generated-results');
  results.innerHTML = `<div class="render-status" id="editor-render-status">Preparando motor local...</div>`;
  const statusEl = document.getElementById('editor-render-status');

  if (isGeminiEnabled()) {
    try {
      await generateAutomaticFormats();
    } catch (error) {
      const message = getErrorMessage(error, 'No se pudo ejecutar el motor automatico.');
      results.innerHTML = `<div class="render-status error">${escapeHtml(message)}</div>`;
      toast(message, 'error');
    } finally {
      btn.disabled = false;
      btn.innerHTML = `<span>◧</span> Generar <span id="gen-count">${state.selectedTemplates.size}</span> formato(s)`;
    }
    return;
  }

  const selectedTemplates = getSelectedTemplates();
  const selectedReferences = state.referenceVideos.filter(ref => state.selectedReferences.has(ref.id));
  const referenceMetas = new Map();
  btn.innerHTML = `<span class="spinner"></span> Procesando ${selectedTemplates.length} formato(s)...`;

  try {
    const runtime = await loadFFmpeg(statusEl);
    const ffmpeg = runtime.instance;
    const baseVideo = state.editorVideos[0];
    const inputName = `input-${Date.now()}.${baseVideo.name.split('.').pop() || 'mp4'}`;
    statusEl.textContent = 'Cargando video en memoria local...';
    await ffmpeg.writeFile(inputName, await runtime.fetchFile(baseVideo));

    statusEl.textContent = 'Analizando duración y audio del video base...';
    const browserBaseDuration = await getBrowserVideoDuration(baseVideo).catch(() => 0);
    const probedBaseDuration = await probeDuration(ffmpeg, inputName, 'base-duration.txt').catch(() => 0);
    const baseDuration = Math.max(probedBaseDuration, browserBaseDuration);
    const hasAudio = await probeHasAudio(ffmpeg, inputName, 'base-audio.txt').catch(() => false);

    state.generatedVideos.forEach(video => URL.revokeObjectURL(video.url));
    state.generatedVideos = [];
    results.innerHTML = '';
    const baseTextConfig = getEditorTextConfig();

    for (let i = 0; i < selectedReferences.length; i++) {
      const reference = selectedReferences[i];
      const referenceInputName = `reference-${Date.now()}-${i}.${reference.name.split('.').pop() || 'mp4'}`;
      let referenceMeta = {};

      if (reference.file) {
        statusEl.textContent = `Analizando referencia opcional ${i + 1} de ${selectedReferences.length}...`;
        await ffmpeg.writeFile(referenceInputName, await runtime.fetchFile(reference.file));
        const browserReferenceDuration = await getBrowserVideoDuration(reference.file).catch(() => 0);
        const probedReferenceDuration = await probeDuration(ffmpeg, referenceInputName, `ref-duration-${i}.txt`).catch(() => 0);
        referenceMeta.duration = Math.max(probedReferenceDuration, browserReferenceDuration);
        referenceMeta.sceneTimes = await detectSceneTimes(ffmpeg, referenceInputName).catch(() => []);
        referenceMeta.visual = await analyzeReferenceVisualTemplate(reference.file, referenceMeta.duration).catch(() => ({}));
        await ffmpeg.deleteFile(referenceInputName).catch(() => {});
      }
      referenceMetas.set(reference.id, referenceMeta);
    }

    await ensureFFmpegFont(runtime);

    for (let i = 0; i < selectedTemplates.length; i++) {
      const template = selectedTemplates[i];
      const reference = selectedReferences.length > 0 ? selectedReferences[i % selectedReferences.length] : null;
      let referenceMeta = reference ? (referenceMetas.get(reference.id) || {}) : {};
      let geminiPlan = null;

      if (isGeminiEnabled()) {
        statusEl.textContent = reference
          ? `Gemini Omni ajustando ${template.name} con referencia ${i + 1} de ${selectedTemplates.length}...`
          : `Preparando ${template.name} sin referencia externa...`;
        try {
          if (reference) {
            geminiPlan = await getGeminiEditPlan(baseVideo, reference, referenceMeta, baseTextConfig);
            referenceMeta = applyGeminiPlanToReferenceMeta(referenceMeta, geminiPlan);
          }
        } catch (error) {
          toast(`Gemini falló en ${template.name}: ${getErrorMessage(error, 'seguimos con análisis local')}`, 'error');
        }
      }

      const profile = getReferenceEditProfile(template, referenceMeta, i);
      if (geminiPlan?.profileName) profile.name = geminiPlan.profileName;
      const textConfig = mergeTextConfigWithGemini(baseTextConfig, geminiPlan);
      const overlayFilters = buildTemplateOverlayFilters(template, referenceMeta, textConfig, i);
      const referenceSegments = reference
        ? buildReferenceDrivenSegments(baseDuration, referenceMeta, i, [{ start: 0, end: baseDuration }])
        : [];
      const rhythmSegments = buildTemplateDrivenSegments(baseDuration, template, referenceMeta, i);
      const useReferenceCuts = referenceSegments.length > 1;
      const segments = useReferenceCuts ? referenceSegments : rhythmSegments;
      const audioFilter = getTemplateAudioFilter(template, hasAudio);
      const editStats = {
        hasAudio,
        referenceCutCount: useReferenceCuts ? Math.max(0, referenceSegments.length - 1) : 0,
        rhythmCutCount: !useReferenceCuts && segments.length > 1 ? segments.length - 1 : 0,
        segmentCount: segments.length,
        mode: useReferenceCuts ? 'reference' : segments.length > 1 ? 'rhythm' : 'style',
      };
      const resultId = renderPendingResult(template, reference, i, profile, editStats, geminiPlan);
      const outputName = `${safeFilePart(baseVideo.name)}-${safeFilePart(template.key)}-instagram.mp4`;
      state.ffmpeg.activeStatusId = `${resultId}_status`;
      const cutLabel = editStats.mode === 'reference'
        ? `aplicando ${editStats.referenceCutCount} corte(s) del ejemplar`
        : editStats.mode === 'rhythm'
          ? `aplicando ${editStats.rhythmCutCount} corte(s) de ritmo`
          : 'aplicando estilo visual fuerte';
      setRenderStatus(state.ffmpeg.activeStatusId, `Editando formato ${i + 1} de ${selectedTemplates.length}: ${cutLabel}...`);

      const command = ffmpegSmartEditCommand(inputName, outputName, {
        profile,
        hasAudio,
        segments,
        overlayFilters,
        audioFilter,
      });
      await execFFmpegChecked(ffmpeg, command);
      const data = await ffmpeg.readFile(outputName);
      const blob = new Blob([data], { type: 'video/mp4' });
      const generated = {
        id: `gen_${Date.now()}_${i}`,
        template: template.key,
        name: template.name,
        referenceId: reference?.id || '',
        url: URL.createObjectURL(blob),
        file: new File([blob], outputName, { type: 'video/mp4' }),
      };
      state.generatedVideos.push(generated);
      renderCompletedResult(resultId, generated);

      state.history.push({
        id: `fmt_${Date.now()}_${i}`,
        type: 'format',
        template: template.key,
        filename: baseVideo.name,
        referenceFilename: reference?.name || '',
        editProfile: profile.name,
        ai: geminiPlan ? 'Gemini Omni' : 'Local',
        status: 'ready',
        date: new Date().toISOString(),
      });

      await ffmpeg.deleteFile(outputName).catch(() => {});
    }

    state.ffmpeg.activeStatusId = null;
    await ffmpeg.deleteFile(inputName).catch(() => {});

    saveHistory();
    toast(`${selectedTemplates.length} formato(s) de Instagram procesado(s) en tu navegador`, 'success');
  } catch (error) {
    state.ffmpeg.activeStatusId = null;
    const message = getErrorMessage(error, 'No se pudo preparar el editor.');
    results.innerHTML = `<div class="render-status error">${escapeHtml(message)}</div>`;
    toast(message, 'error');
  } finally {
    btn.disabled = false;
    btn.innerHTML = `<span>◧</span> Generar <span id="gen-count">${state.selectedTemplates.size}</span> formato(s)`;
  }
}

// ═══════════════════════════════════════════════════════════
//  EDITOR OVERHAUL
// ═══════════════════════════════════════════════════════════

function getEditorProject(projectId) {
  return state.editorProjects.find(project => project.id === projectId) || null;
}

function getEditorActiveCopy(project) {
  if (!project || !project.copies.length) return null;
  const index = Math.max(0, Math.min(project.activeCopyIndex || 0, project.copies.length - 1));
  return project.copies[index] || project.copies[0];
}

function getEditorCopyLabel(copy) {
  if (!copy) return 'copia';
  return copy.title?.trim() || `${copy.index}. copia${copy.index}`;
}

function getEditorBackgroundOptionById(backgroundId) {
  return EDITOR_BACKGROUND_OPTIONS.find(option => option.id === backgroundId) || EDITOR_BACKGROUND_OPTIONS[0];
}

function getEditorFontOptionByFamily(family) {
  return EDITOR_FONT_OPTIONS.find(option => option.family === family) || EDITOR_FONT_OPTIONS[0];
}

function getEditorCommittedTitle(copy) {
  return String(copy?.title || '').trim();
}

function getEditorTitlePosition(copy) {
  return {
    x: clampNumber(copy?.titlePositionX, 0, 100, 50),
    y: clampNumber(copy?.titlePositionY, 0, 100, 70),
  };
}

function getEditorTitlePreviewStyle(copy, background) {
  const alpha = Math.max(0, Math.min(100, Number(copy.opacity || 88))) / 100;
  if (!copy.showBackground) {
    return {
      background: 'transparent',
      color: '#ffffff',
    };
  }

  return {
    background: hexToRgba(copy.backgroundColor || background.backgroundColor || '#111827', alpha),
    color: isLightColor(copy.backgroundColor) ? '#111827' : '#ffffff',
  };
}

function getEditorTitleOverlayStyle(copy, background) {
  const position = getEditorTitlePosition(copy);
  const preview = getEditorTitlePreviewStyle(copy, background);
  const color = preview.color;
  return `
    left:${position.x}%;
    top:${position.y}%;
    background-color:${preview.background};
    color:${color};
    padding:${Number(copy.padding || 18)}px;
    font-size:${Number(copy.size || 54)}px;
    font-family:${copy.font};
    ${copy.showBackground ? '' : 'border:none;box-shadow:none;backdrop-filter:none;'}
  `;
}

function cloneEditorCopyConfig(copy, index = copy?.index || 1) {
  const base = EDITOR_DEFAULT_COPY();
  return {
    ...base,
    ...copy,
    index,
    id: copy?.id || `copy_${Date.now()}_${index}`,
    title: copy?.title || '',
    titleDraft: copy?.titleDraft ?? null,
    status: copy?.status || 'queued',
    progress: Number(copy?.progress || 0),
    detail: copy?.detail || '',
    output: copy?.output || null,
    hash: copy?.hash || null,
    audioSignature: copy?.audioSignature || null,
    attempts: Number(copy?.attempts || 0),
  };
}

function createEditorCopy(project, index, sourceCopy = null) {
  const source = sourceCopy || project?.copies?.[project.activeCopyIndex || 0] || null;
  const config = cloneEditorCopyConfig(source, index);
  return {
    ...config,
    id: `copy_${project.id}_${index}_${Date.now()}`,
    index,
    title: config.title || '',
    titleDraft: config.titleDraft ?? null,
    titlePositionX: Number.isFinite(Number(config.titlePositionX)) ? Number(config.titlePositionX) : 50,
    titlePositionY: Number.isFinite(Number(config.titlePositionY)) ? Number(config.titlePositionY) : 70,
    backgroundId: config.backgroundId || EDITOR_BACKGROUND_OPTIONS[0].id,
    backgroundColor: config.backgroundColor || '#111827',
    showBackground: config.showBackground !== false,
    size: Number(config.size || 54),
    opacity: Number(config.opacity || 88),
    padding: Number(config.padding || 18),
    durationMode: config.durationMode || 'all',
    rangeEnd: Number(config.rangeEnd || 10),
    status: 'queued',
    progress: 0,
    detail: '',
    output: null,
    hash: null,
    audioSignature: null,
    attempts: 0,
  };
}

function createEditorProject(file) {
  const previewUrl = URL.createObjectURL(file);
  const createdAt = new Date().toISOString();
  const project = {
    id: `project_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    file,
    previewUrl,
    name: file.name,
    size: file.size,
    createdAt,
    updatedAt: createdAt,
    duration: 0,
    width: 0,
    height: 0,
    activeCopyIndex: 0,
    previewMode: 'original',
    zip: null,
    copies: [],
  };
  project.copies = [createEditorCopy(project, 1)];
  return project;
}

function syncEditorProjectMetadata(project) {
  project.updatedAt = new Date().toISOString();
}

function ensureEditorCopyCount(project, targetCount) {
  const count = Math.max(1, Math.min(500, Number(targetCount) || 1));
  const current = project.copies.length;
  const source = project.copies[project.activeCopyIndex] || project.copies[0] || null;

  if (count > current) {
    for (let index = current + 1; index <= count; index += 1) {
      project.copies.push(createEditorCopy(project, index, source));
    }
  } else if (count < current) {
    project.copies.slice(count).forEach(copy => {
      if (copy?.output?.url) URL.revokeObjectURL(copy.output.url);
    });
    project.copies.length = count;
  }

  project.copies = project.copies.map((copy, index) => ({
    ...copy,
    index: index + 1,
    id: copy.id || `copy_${project.id}_${index + 1}`,
  }));

  if (project.activeCopyIndex >= project.copies.length) {
    project.activeCopyIndex = project.copies.length - 1;
  }
}

function renderEditorVideos() {
  const list = document.getElementById('editor-video-list');
  if (!list) return;

  if (!state.editorVideos.length) {
    list.innerHTML = `
      <div class="empty-state-small" style="grid-column:1/-1">
        <p>No hay video base cargado todavía.</p>
        <button class="btn btn-outline btn-sm" onclick="document.getElementById('editor-video-input').click()">Subir video</button>
      </div>
    `;
    return;
  }

  const file = state.editorVideos[0];
  list.innerHTML = `
    <div class="editor-video-item">
      <div class="editor-video-thumb">▶</div>
      <div class="editor-video-info">
        <div class="editor-video-name">${escapeHtml(file.name)}</div>
        <div class="editor-video-size">${formatBytes(file.size)}</div>
        <div class="editor-video-size">Video base listo para generar variantes únicas</div>
      </div>
      <button class="btn btn-ghost btn-sm" onclick="removeEditorVideo(0)">✕</button>
    </div>
  `;

  updateVariantUniqueControls();
}

function renderEditorHistory() {
  const summary = document.getElementById('editor-history-summary');
  const stats = document.getElementById('editor-history-stats');
  const tbody = document.getElementById('editor-history-tbody');

  const totals = {
    queued: 0,
    processing: 0,
    ready: 0,
    failed: 0,
    total: 0,
  };

  const rows = state.editorProjects.slice().reverse();
  state.editorProjects.forEach(project => {
    project.copies.forEach(copy => {
      totals.total += 1;
      totals[copy.status] = (totals[copy.status] || 0) + 1;
    });
  });

  if (stats) {
    stats.innerHTML = `
      <span class="badge badge-pending">Total ${totals.total}</span>
      <span class="badge badge-pending">En cola ${totals.queued}</span>
      <span class="badge badge-pending">Procesando ${totals.processing}</span>
      <span class="badge badge-active">Listos ${totals.ready}</span>
      <span class="badge badge-error">Fallidos ${totals.failed}</span>
    `;
  }

  if (summary) {
    summary.innerHTML = `
      <div class="editor-summary-box"><strong>${totals.queued}</strong><span>En cola</span></div>
      <div class="editor-summary-box"><strong>${totals.processing}</strong><span>Procesando</span></div>
      <div class="editor-summary-box"><strong>${totals.ready}</strong><span>Listos</span></div>
      <div class="editor-summary-box"><strong>${totals.failed}</strong><span>Fallidos</span></div>
    `;
  }

  if (!tbody) return;

  if (!rows.length) {
    tbody.innerHTML = `
      <tr class="empty-row">
        <td colspan="6">
          <div class="empty-state-small">
            <p>No hay historial de editor todavía.</p>
            <button class="btn btn-outline btn-sm" onclick="document.getElementById('editor-video-input').click()">Subir videos</button>
          </div>
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = rows.map(project => {
    const counts = project.copies.reduce((acc, copy) => {
      acc[copy.status] = (acc[copy.status] || 0) + 1;
      return acc;
    }, { queued: 0, processing: 0, ready: 0, failed: 0 });
    const progress = project.copies.length
      ? Math.round(((counts.ready + counts.failed) / project.copies.length) * 100)
      : 0;
    return `
      <tr>
        <td style="color:var(--text-1);font-weight:600">${escapeHtml(project.name)}</td>
        <td>${project.copies.length}</td>
        <td>
          <div class="editor-state-list">
            <span>En cola: ${counts.queued}</span>
            <span>Procesados: ${counts.processing}</span>
            <span>Listos: ${counts.ready}</span>
            <span>Fallidos: ${counts.failed}</span>
          </div>
        </td>
        <td>
          <div class="editor-progress">
            <div class="progress-bar"><div class="progress-fill" style="width:${progress}%"></div></div>
            <div class="editor-progress-label">${progress}%</div>
          </div>
        </td>
        <td>${formatDate(project.updatedAt || project.createdAt)}</td>
        <td>
          <div class="editor-history-actions">
            <button class="btn btn-outline btn-sm" onclick="downloadEditorProjectZip('${project.id}')">ZIP</button>
            <button class="btn btn-ghost btn-sm" onclick="deleteEditorProject('${project.id}')">🗑</button>
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

function updateEditorCounters() {
  renderEditorVideos();
  renderEditorHistory();
}

function handleEditorUpload(event) {
  const file = Array.from(event.target.files || []).find(item => item.type.startsWith('video/'));
  if (!file) return;

  state.editorVideos = [file];
  event.target.value = '';
  updateEditorCounters();
  void ensureVariantUniqueRuntime();
  toast('Video base cargado', 'success');
}

function removeEditorVideo(index) {
  if (index < 0 || index >= state.editorVideos.length) return;
  state.editorVideos.splice(index, 1);
  updateEditorCounters();
  updateVariantUniqueControls();
}

function removeEditorProject(projectId) {
  const project = getEditorProject(projectId);
  if (!project) return;

  if (project.previewUrl) URL.revokeObjectURL(project.previewUrl);
  if (project.zip?.url) URL.revokeObjectURL(project.zip.url);
  project.copies.forEach(copy => {
    if (copy.output?.url) URL.revokeObjectURL(copy.output.url);
    if (copy.overlayUrl) URL.revokeObjectURL(copy.overlayUrl);
  });
  state.editorProjects = state.editorProjects.filter(item => item.id !== projectId);

  if (state.editorModalProjectId === projectId) {
    closeModal();
    state.editorModalProjectId = null;
  }

  updateEditorCounters();
}

function clearEditorWorkspace() {
  if (!state.editorVideos.length && !state.editorProjects.length) {
    toast('No hay videos para vaciar', 'info');
    return;
  }

  if (!confirm('Esto vaciará el video base cargado. ¿Continuar?')) return;

  state.editorVideos = [];
  state.editorProjects.forEach(project => {
    if (project.previewUrl) URL.revokeObjectURL(project.previewUrl);
    if (project.zip?.url) URL.revokeObjectURL(project.zip.url);
    project.copies.forEach(copy => {
      if (copy.output?.url) URL.revokeObjectURL(copy.output.url);
      if (copy.overlayUrl) URL.revokeObjectURL(copy.overlayUrl);
    });
  });

  state.editorProjects = [];
  state.editorModalProjectId = null;
  state.editorModalCopyIndex = 0;
  state.editorPreviewMode = 'original';
  closeModal();
  updateEditorCounters();
  updateVariantUniqueControls();
  toast('Video base vaciado', 'success');
}

function openEditorProjectConfig(projectId) {
  const project = getEditorProject(projectId);
  if (!project) return;
  state.editorModalProjectId = projectId;
  if (state.editorModalCopyIndex >= project.copies.length) {
    state.editorModalCopyIndex = 0;
  }
  const activeCopy = getEditorActiveCopy(project);
  state.editorPreviewMode = activeCopy?.output ? 'generated' : 'original';
  renderEditorProjectModal(projectId);
}

function renderEditorProjectModal(projectId) {
  const project = getEditorProject(projectId);
  if (!project) return;

  ensureEditorCopyCount(project, project.copies.length || 1);
  const activeCopy = getEditorActiveCopy(project);
  const background = getEditorBackgroundOptionById(activeCopy.backgroundId);
  const font = getEditorFontOptionByFamily(activeCopy.font);
  const previewSrc = state.editorPreviewMode === 'generated' && activeCopy?.output?.url
    ? activeCopy.output.url
    : project.previewUrl;
  const draftTitle = String(activeCopy.titleDraft || '');
  const titleValue = draftTitle || activeCopy.title || '';
  const previewChipStyle = getEditorTitlePreviewStyle(activeCopy, background);
  const titleOverlayStyle = getEditorTitleOverlayStyle(activeCopy, background);
  const hasCommittedTitle = Boolean(getEditorCommittedTitle(activeCopy));
  const tabs = project.copies.map(copy => `
    <button class="editor-copy-tab ${copy.index - 1 === project.activeCopyIndex ? 'active' : ''}" onclick="selectEditorCopy('${project.id}', ${copy.index - 1})">
      ${copy.index}. copia${copy.index}
    </button>
  `).join('');

  openModal(`Configurar ${project.name}`, `
    <div class="editor-modal">
      <div class="editor-modal-preview">
        <div class="editor-modal-title">${escapeHtml(project.name)}</div>
        <div class="editor-config-preview editor-preview-stage">
          <video id="editor-modal-preview-video" src="${previewSrc}" muted playsinline controls></video>
          <div
            class="editor-preview-title-overlay ${hasCommittedTitle ? '' : 'is-empty'}"
            id="editor-modal-title-overlay"
            style="${titleOverlayStyle}"
            ${hasCommittedTitle ? `onpointerdown="startEditorTitleDrag(event, '${project.id}')"` : ''}
          >
            <span>${escapeHtml(getEditorCommittedTitle(activeCopy))}</span>
          </div>
        </div>
        <div class="editor-action-row">
          <button class="btn btn-outline btn-sm ${state.editorPreviewMode === 'original' ? 'active' : ''}" onclick="setEditorPreviewOriginal('${project.id}')">Preview original</button>
          <button class="btn btn-outline btn-sm" onclick="copyEditorConfigToAll('${project.id}')">Copiar config actual a todas</button>
          <button class="btn btn-outline btn-sm" onclick="resetEditorCurrentCopy('${project.id}')">Reset esta copia</button>
        </div>
        <div class="editor-scroll-note">Escribí el título y presioná Enter para aplicarlo al video. Después lo podés arrastrar en la vista previa.</div>
        <div class="editor-control-row">
          <label for="editor-copy-count">Cantidad de copias</label>
          <input type="number" id="editor-copy-count" class="form-input editor-input" min="1" max="500" value="${project.copies.length}" onchange="setEditorCopyCount('${project.id}', this.value)" />
        </div>
        <div class="editor-copy-tabs">${tabs}</div>
      </div>
      <div class="editor-config-area">
        <div class="editor-control-group">
          <label>TITULO DE ESTA COPIA</label>
          <input
            type="text"
            id="editor-copy-title"
            class="form-input editor-input"
            value="${escapeHtml(titleValue)}"
            placeholder="Ej: 25. copia25 🔥"
            oninput="updateEditorCopyDraft('${project.id}', this.value)"
            onkeydown="handleEditorTitleKeydown(event, '${project.id}')"
          />
        </div>

        <div class="editor-config-grid">
          <div class="editor-control-group">
            <label>Fuentes</label>
            <select class="form-input editor-select" id="editor-font-select" onchange="updateEditorCopyField('${project.id}', 'font', this.value)">
              ${EDITOR_FONT_OPTIONS.map(option => `<option value="${escapeHtml(option.family)}" ${option.family === activeCopy.font ? 'selected' : ''}>${escapeHtml(option.label)}</option>`).join('')}
            </select>
            <div class="editor-scroll-note">50 fuentes disponibles</div>
          </div>

          <div class="editor-control-group">
            <label>Estilos de fondo</label>
            <select class="form-input editor-select" id="editor-background-select" onchange="updateEditorCopyField('${project.id}', 'backgroundId', this.value)">
              ${EDITOR_BACKGROUND_OPTIONS.map(option => `<option value="${option.id}" ${option.id === activeCopy.backgroundId ? 'selected' : ''}>${escapeHtml(option.label)}</option>`).join('')}
            </select>
            <div class="editor-scroll-note">50 estilos de fondo listos</div>
          </div>
        </div>

        <div class="editor-control-group">
          <label>Combinaciones rápidas</label>
          <select class="form-input editor-select" id="editor-quick-combo" onchange="applyEditorQuickCombo('${project.id}', this.value)">
            <option value="">Elegir combinación</option>
            ${EDITOR_QUICK_COMBOS.map(option => `<option value="${option.id}">${escapeHtml(option.label)}</option>`).join('')}
          </select>
        </div>

        <div class="editor-control-group">
          <label>Color rápido del fondo</label>
          <div class="editor-bg-swatch">
            ${EDITOR_COLOR_OPTIONS.map(option => `
              <button type="button" class="editor-swatch-btn ${activeCopy.backgroundColor === option.value ? 'active' : ''}" style="background:${option.value}; color:${isLightColor(option.value) ? '#111827' : '#ffffff'}" onclick="updateEditorCopyField('${project.id}', 'backgroundColor', '${option.value}')">
                ${escapeHtml(option.label)}
              </button>
            `).join('')}
          </div>
        </div>

        <div class="editor-control-group">
          <label>¿Mostrar fondo?</label>
          <div class="editor-switch-row">
            <button type="button" class="btn btn-outline btn-sm ${activeCopy.showBackground ? 'active' : ''}" onclick="updateEditorCopyField('${project.id}', 'showBackground', true)">Mostrar</button>
            <button type="button" class="btn btn-outline btn-sm ${!activeCopy.showBackground ? 'active' : ''}" onclick="updateEditorCopyField('${project.id}', 'showBackground', false)">No mostrar</button>
          </div>
        </div>

        <div class="editor-control-group">
          <div class="editor-control-row">
            <label for="editor-size-range">Tamaño</label>
            <input type="range" id="editor-size-range" min="24" max="100" step="1" value="${Number(activeCopy.size || 54)}" oninput="updateEditorCopyField('${project.id}', 'size', this.value)" />
            <div class="range-meta"><span>Min</span><span>${Number(activeCopy.size || 54)} px</span><span>Max</span></div>
          </div>
        </div>

        <div class="editor-control-group">
          <div class="editor-control-row">
            <label for="editor-opacity-range">Opacidad de fondo</label>
            <input type="range" id="editor-opacity-range" min="0" max="100" step="1" value="${Number(activeCopy.opacity || 88)}" oninput="updateEditorCopyField('${project.id}', 'opacity', this.value)" />
            <div class="range-meta"><span>Invisible</span><span>${Number(activeCopy.opacity || 88)}%</span><span>Visible</span></div>
          </div>
        </div>

        <div class="editor-control-group">
          <div class="editor-control-row">
            <label for="editor-padding-range">Padding de fondo</label>
            <input type="range" id="editor-padding-range" min="6" max="42" step="1" value="${Number(activeCopy.padding || 18)}" oninput="updateEditorCopyField('${project.id}', 'padding', this.value)" />
            <div class="range-meta"><span>Min</span><span>${Number(activeCopy.padding || 18)} px</span><span>Max</span></div>
          </div>
        </div>

        <div class="editor-control-group">
          <label>Duración del video</label>
          <div class="editor-switch-row">
            <button type="button" class="btn btn-outline btn-sm ${activeCopy.durationMode === 'all' ? 'active' : ''}" onclick="updateEditorCopyField('${project.id}', 'durationMode', 'all')">Todo el video</button>
            <button type="button" class="btn btn-outline btn-sm ${activeCopy.durationMode === 'range' ? 'active' : ''}" onclick="updateEditorCopyField('${project.id}', 'durationMode', 'range')">Rango</button>
          </div>
          <div class="editor-control-row">
            <label for="editor-range-end">Hasta</label>
            <input type="range" id="editor-range-end" min="1" max="${Math.max(1, Math.round(project.duration || 30))}" step="1" value="${Math.max(1, Math.min(Math.round(project.duration || 30), Number(activeCopy.rangeEnd || 10)))}" ${activeCopy.durationMode === 'all' ? 'disabled' : ''} oninput="updateEditorCopyField('${project.id}', 'rangeEnd', this.value)" />
            <div class="range-meta"><span>0s</span><span>${Math.max(1, Math.min(Math.round(project.duration || 30), Number(activeCopy.rangeEnd || 10)))}s</span><span>${Math.round(project.duration || 30)}s</span></div>
          </div>
        </div>

        <div class="editor-control-group">
          <label>Vista previa de estilo</label>
          <div class="editor-title-preview ${activeCopy.showBackground ? '' : 'hidden-bg'}" id="editor-title-preview" style="background:${previewChipStyle.background};padding:${Number(activeCopy.padding || 18)}px;font-size:${Number(activeCopy.size || 54)}px;font-family:${activeCopy.font};">
            <span style="color:${previewChipStyle.color}">${escapeHtml(getEditorCommittedTitle(activeCopy))}</span>
          </div>
          <div class="editor-scroll-note">Fuente: ${escapeHtml(font.label)} · Fondo: ${escapeHtml(background.label)}</div>
        </div>

        <button class="btn btn-primary btn-lg btn-full" onclick="saveEditorProjectAndClose('${project.id}')">Guardar y volver</button>
      </div>
    </div>
  `);
}

function isLightColor(color) {
  const value = String(color || '').replace('#', '');
  if (value.length !== 6) return false;
  const r = parseInt(value.slice(0, 2), 16);
  const g = parseInt(value.slice(2, 4), 16);
  const b = parseInt(value.slice(4, 6), 16);
  const brightness = (r * 299 + g * 587 + b * 114) / 1000;
  return brightness >= 150;
}

function hexToRgba(color, alpha = 1) {
  const value = String(color || '').replace('#', '');
  if (value.length !== 6) return `rgba(17, 24, 39, ${alpha})`;
  const r = parseInt(value.slice(0, 2), 16);
  const g = parseInt(value.slice(2, 4), 16);
  const b = parseInt(value.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function updateEditorPreviewChip(projectId) {
  const project = getEditorProject(projectId);
  if (!project) return;
  const copy = getEditorActiveCopy(project);
  if (!copy) return;
  const bg = getEditorBackgroundOptionById(copy.backgroundId);
  const previewStyles = getEditorTitlePreviewStyle(copy, bg);
  const position = getEditorTitlePosition(copy);
  const chip = document.getElementById('editor-title-preview');
  const title = chip?.querySelector('span');
  if (chip) {
    chip.classList.toggle('hidden-bg', !copy.showBackground);
    chip.style.padding = `${Number(copy.padding || 18)}px`;
    chip.style.fontSize = `${Number(copy.size || 54)}px`;
    chip.style.fontFamily = copy.font;
    chip.style.background = previewStyles.background;
    if (title) {
      title.style.color = previewStyles.color;
      title.textContent = getEditorCommittedTitle(copy);
    }
  }
  const overlay = document.getElementById('editor-modal-title-overlay');
  const overlayTitle = overlay?.querySelector('span');
  if (overlay) {
    const hasCommittedTitle = Boolean(getEditorCommittedTitle(copy));
    overlay.classList.toggle('is-empty', !hasCommittedTitle);
    overlay.style.left = `${position.x}%`;
    overlay.style.top = `${position.y}%`;
    overlay.style.padding = `${Number(copy.padding || 18)}px`;
    overlay.style.fontSize = `${Number(copy.size || 54)}px`;
    overlay.style.fontFamily = copy.font;
    overlay.style.background = previewStyles.background;
    overlay.style.color = previewStyles.color;
    overlay.style.cursor = hasCommittedTitle ? 'grab' : 'default';
    overlay.style.pointerEvents = hasCommittedTitle ? 'auto' : 'none';
    if (overlayTitle) {
      overlayTitle.style.color = previewStyles.color;
      overlayTitle.textContent = getEditorCommittedTitle(copy);
    }
  }
  const previewVideo = document.getElementById('editor-modal-preview-video');
  if (previewVideo) {
    previewVideo.src = state.editorPreviewMode === 'generated' && copy.output?.url ? copy.output.url : project.previewUrl;
  }
}

function updateEditorCopyDraft(projectId, value) {
  const project = getEditorProject(projectId);
  if (!project) return;
  const copy = getEditorActiveCopy(project);
  if (!copy) return;
  copy.titleDraft = String(value ?? '');
  syncEditorProjectMetadata(project);
}

function commitEditorTitle(projectId) {
  const project = getEditorProject(projectId);
  if (!project) return;
  const copy = getEditorActiveCopy(project);
  if (!copy) return;
  const nextTitle = String(copy.titleDraft ?? copy.title ?? '').trim();
  copy.title = nextTitle;
  copy.titleDraft = null;
  syncEditorProjectMetadata(project);
  updateEditorPreviewChip(projectId);
  renderEditorProjectModal(projectId);
  updateEditorCounters();
}

function handleEditorTitleKeydown(event, projectId) {
  if (event.key !== 'Enter') return;
  event.preventDefault();
  commitEditorTitle(projectId);
}

function updateEditorTitlePosition(projectId, clientX, clientY) {
  const project = getEditorProject(projectId);
  if (!project) return;
  const copy = getEditorActiveCopy(project);
  if (!copy) return;
  const stage = document.getElementById('editor-modal-title-overlay')?.closest('.editor-preview-stage');
  if (!stage) return;

  const rect = stage.getBoundingClientRect();
  if (!rect.width || !rect.height) return;

  copy.titlePositionX = clampNumber(((clientX - rect.left) / rect.width) * 100, 0, 100, 50);
  copy.titlePositionY = clampNumber(((clientY - rect.top) / rect.height) * 100, 0, 100, 70);
  syncEditorProjectMetadata(project);
  updateEditorPreviewChip(projectId);
}

function startEditorTitleDrag(event, projectId) {
  const project = getEditorProject(projectId);
  const copy = getEditorActiveCopy(project);
  if (!project || !copy || !String(copy.title || '').trim()) return;

  event.preventDefault();
  state.editorTitleDrag = { projectId };
  updateEditorTitlePosition(projectId, event.clientX, event.clientY);

  const stop = () => stopEditorTitleDrag();
  const move = dragEvent => {
    if (!state.editorTitleDrag || state.editorTitleDrag.projectId !== projectId) return;
    updateEditorTitlePosition(projectId, dragEvent.clientX, dragEvent.clientY);
  };

  document.addEventListener('pointermove', move);
  document.addEventListener('pointerup', stop, { once: true });
  document.addEventListener('pointercancel', stop, { once: true });
  state.editorTitleDrag.cleanup = () => {
    document.removeEventListener('pointermove', move);
    document.removeEventListener('pointerup', stop);
    document.removeEventListener('pointercancel', stop);
  };
}

function stopEditorTitleDrag() {
  if (!state.editorTitleDrag) return;
  state.editorTitleDrag.cleanup?.();
  state.editorTitleDrag = null;
}

function selectEditorCopy(projectId, copyIndex) {
  const project = getEditorProject(projectId);
  if (!project) return;
  project.activeCopyIndex = Math.max(0, Math.min(project.copies.length - 1, Number(copyIndex) || 0));
  state.editorModalCopyIndex = project.activeCopyIndex;
  const copy = getEditorActiveCopy(project);
  state.editorPreviewMode = copy?.output?.url ? 'generated' : 'original';
  renderEditorProjectModal(projectId);
}

function setEditorCopyCount(projectId, value) {
  const project = getEditorProject(projectId);
  if (!project) return;
  ensureEditorCopyCount(project, value);
  syncEditorProjectMetadata(project);
  state.editorModalCopyIndex = project.activeCopyIndex;
  renderEditorProjectModal(projectId);
  updateEditorCounters();
}

function updateEditorCopyField(projectId, field, value) {
  const project = getEditorProject(projectId);
  if (!project) return;
  const copy = getEditorActiveCopy(project);
  if (!copy) return;

  let nextValue = value;
  if (['size', 'opacity', 'padding', 'rangeEnd'].includes(field)) {
    nextValue = Number(value);
  }
  if (field === 'showBackground') {
    nextValue = value === true || value === 'true';
  }
  copy[field] = nextValue;
  if (field === 'backgroundId') {
    const background = getEditorBackgroundOptionById(nextValue);
    copy.backgroundColor = background.backgroundColor;
  }
  if (field === 'title') {
    copy.titleDraft = null;
  }
  syncEditorProjectMetadata(project);
  updateEditorPreviewChip(projectId);
  updateEditorCounters();

  if (field === 'title') return;
  if (['size', 'opacity', 'padding', 'rangeEnd'].includes(field)) {
    const ranges = {
      size: 'editor-size-range',
      opacity: 'editor-opacity-range',
      padding: 'editor-padding-range',
      rangeEnd: 'editor-range-end',
    };
    const input = document.getElementById(ranges[field]);
    if (input) input.value = String(nextValue);
    const meta = input?.parentElement?.querySelector('.range-meta');
    if (meta) {
      const middle = meta.children?.[1];
      if (middle) {
        middle.textContent = field === 'opacity'
          ? `${Math.round(nextValue)}%`
          : field === 'size'
            ? `${Math.round(nextValue)} px`
            : `${Math.round(nextValue)}s`;
      }
    }
    return;
  }

  renderEditorProjectModal(projectId);
}

function applyEditorQuickCombo(projectId, comboId) {
  if (!comboId) return;
  const project = getEditorProject(projectId);
  if (!project) return;
  const copy = getEditorActiveCopy(project);
  const combo = EDITOR_QUICK_COMBOS.find(item => item.id === comboId);
  if (!copy || !combo) return;
  const comboIndex = Math.max(0, EDITOR_QUICK_COMBOS.findIndex(item => item.id === comboId));
  copy.font = combo.font;
  copy.backgroundColor = combo.backgroundColor || copy.backgroundColor;
  copy.backgroundId = EDITOR_BACKGROUND_OPTIONS[comboIndex % EDITOR_BACKGROUND_OPTIONS.length].id;
  copy.showBackground = true;
  copy.opacity = 92;
  copy.padding = 20;
  updateEditorPreviewChip(projectId);
  renderEditorProjectModal(projectId);
}

function copyEditorConfigToAll(projectId) {
  const project = getEditorProject(projectId);
  if (!project) return;
  const copy = getEditorActiveCopy(project);
  if (!copy) return;
  const title = getEditorCommittedTitle(copy);
  const background = getEditorBackgroundOptionById(copy.backgroundId);

  project.copies = project.copies.map(item => ({
    ...item,
    title,
    titleDraft: null,
    titlePositionX: copy.titlePositionX,
    titlePositionY: copy.titlePositionY,
    font: copy.font,
    backgroundId: copy.backgroundId,
    backgroundColor: copy.backgroundColor || background.backgroundColor,
    showBackground: copy.showBackground,
    size: copy.size,
    opacity: copy.opacity,
    padding: copy.padding,
    durationMode: copy.durationMode,
    rangeEnd: copy.rangeEnd,
  }));

  syncEditorProjectMetadata(project);
  renderEditorProjectModal(projectId);
  updateEditorCounters();
  toast('Configuración copiada a todas las variantes', 'success');
}

function resetEditorCurrentCopy(projectId) {
  const project = getEditorProject(projectId);
  if (!project) return;
  const copy = getEditorActiveCopy(project);
  if (!copy) return;
  const index = copy.index;
  project.copies[project.activeCopyIndex] = {
    ...createEditorCopy(project, index),
    index,
    id: copy.id,
    title: '',
  };
  syncEditorProjectMetadata(project);
  renderEditorProjectModal(projectId);
  updateEditorCounters();
}

function setEditorPreviewOriginal(projectId) {
  const project = getEditorProject(projectId);
  if (!project) return;
  state.editorPreviewMode = 'original';
  project.previewMode = 'original';
  updateEditorPreviewChip(projectId);
}

function saveEditorProjectAndClose(projectId) {
  const project = getEditorProject(projectId);
  if (project) {
    const copy = getEditorActiveCopy(project);
    if (copy) {
      copy.titleDraft = null;
    }
    syncEditorProjectMetadata(project);
    updateEditorCounters();
  }
  state.editorModalProjectId = null;
  closeModal();
  toast('Configuración guardada', 'success');
}

function deleteEditorProject(projectId) {
  removeEditorProject(projectId);
}

function downloadEditorProjectZip(projectId) {
  const project = getEditorProject(projectId);
  if (!project) return;
  if (project.zip?.blob) {
    const link = document.createElement('a');
    if (!project.zip.url) project.zip.url = URL.createObjectURL(project.zip.blob);
    link.href = project.zip.url;
    link.download = project.zip.name || `${safeFilePart(project.name)}.zip`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    return;
  }

  const files = project.copies
    .filter(copy => copy.status === 'ready' && copy.output?.blob)
    .map(copy => ({
      name: copy.output.file.name,
      blob: copy.output.blob,
    }));
  if (!files.length) {
    toast('Todavía no hay copias listas para zip', 'error');
    return;
  }

  buildZipBlob(files).then(zipBlob => {
    project.zip = {
      blob: zipBlob,
      name: `${safeFilePart(project.name)}.zip`,
      url: URL.createObjectURL(zipBlob),
    };
    const link = document.createElement('a');
    link.href = project.zip.url;
    link.download = project.zip.name;
    document.body.appendChild(link);
    link.click();
    link.remove();
  }).catch(error => {
    toast(getErrorMessage(error, 'No se pudo crear el zip'), 'error');
  });
}

async function buildEditorProjectZip(project) {
  const files = project.copies
    .filter(copy => copy.status === 'ready' && copy.output?.blob)
    .map(copy => ({
      name: copy.output.file.name,
      blob: copy.output.blob,
    }));

  if (!files.length) return null;
  const zipBlob = await buildZipBlob(files);
  if (project.zip?.url) URL.revokeObjectURL(project.zip.url);
  project.zip = {
    blob: zipBlob,
    name: `${safeFilePart(project.name)}.zip`,
    url: URL.createObjectURL(zipBlob),
  };
  return project.zip;
}

function clearEditorQueueState(project) {
  if (project.zip?.url) URL.revokeObjectURL(project.zip.url);
  project.zip = null;
  project.copies.forEach(copy => {
    if (copy.output?.url) URL.revokeObjectURL(copy.output.url);
    copy.output = null;
    copy.hash = null;
    copy.audioSignature = null;
    copy.status = 'queued';
    copy.progress = 0;
    copy.detail = '';
    copy.attempts = 0;
  });
}

function clampEditorProgress(value) {
  return Math.max(0, Math.min(100, Number(value) || 0));
}

function createEditorCopyProgressReporter(copy) {
  let lastRefreshAt = 0;
  let lastProgressBucket = -1;
  let lastDetail = '';

  return (progress, detail = '') => {
    const nextProgress = clampEditorProgress(progress);
    const nextDetail = String(detail || '');
    const bucket = Math.floor(nextProgress);
    const now = Date.now();
    const shouldRefresh =
      bucket !== lastProgressBucket ||
      nextDetail !== lastDetail ||
      now - lastRefreshAt >= 350 ||
      nextProgress === 0 ||
      nextProgress === 100;

    copy.progress = nextProgress;
    copy.detail = nextDetail;

    if (shouldRefresh) {
      lastRefreshAt = now;
      lastProgressBucket = bucket;
      lastDetail = nextDetail;
      refreshEditorUi();
    }
  };
}

function getEditorHistoryTotals() {
  const totals = { queued: 0, processing: 0, ready: 0, failed: 0, total: 0 };
  state.editorProjects.forEach(project => {
    project.copies.forEach(copy => {
      totals.total += 1;
      totals[copy.status] = (totals[copy.status] || 0) + 1;
    });
  });
  return totals;
}

function refreshEditorUi() {
  renderEditorVideos();
  renderEditorHistory();
}

async function getBrowserVideoMetadata(file) {
  return new Promise(resolve => {
    if (!file) {
      resolve({ duration: 0, width: 0, height: 0 });
      return;
    }

    const video = document.createElement('video');
    const url = URL.createObjectURL(file);
    let settled = false;

    const done = data => {
      if (settled) return;
      settled = true;
      URL.revokeObjectURL(url);
      resolve(data);
    };

    video.preload = 'metadata';
    video.onloadedmetadata = () => done({
      duration: Number.isFinite(video.duration) ? video.duration : 0,
      width: Number.isFinite(video.videoWidth) ? video.videoWidth : 0,
      height: Number.isFinite(video.videoHeight) ? video.videoHeight : 0,
    });
    video.onerror = () => done({ duration: 0, width: 0, height: 0 });
    setTimeout(() => done({ duration: 0, width: 0, height: 0 }), 2500);
    video.src = url;
  });
}

function loadVideoFrame(file, time = 0.5) {
  return new Promise(async (resolve, reject) => {
    const video = document.createElement('video');
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    const url = URL.createObjectURL(file);

    const cleanup = () => URL.revokeObjectURL(url);
    video.muted = true;
    video.playsInline = true;
    video.preload = 'auto';
    video.src = url;

    try {
      await waitForVideoEvent(video, 'loadedmetadata');
      const target = Math.max(0, Math.min(time, Math.max(0, (video.duration || 0) - 0.05)));
      await setVideoTime(video, target);
      const width = 32;
      const height = 32;
      canvas.width = width;
      canvas.height = height;
      ctx.drawImage(video, 0, 0, width, height);
      const image = ctx.getImageData(0, 0, width, height);
      cleanup();
      resolve(image);
    } catch (error) {
      cleanup();
      reject(error);
    }
  });
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

function hammingDistance(a, b) {
  const length = Math.min(a.length, b.length);
  let distance = 0;
  for (let index = 0; index < length; index += 1) {
    if (a[index] !== b[index]) distance += 1;
  }
  return distance + Math.abs(a.length - b.length);
}

async function computeAudioSignature(file) {
  const arrayBuffer = await file.arrayBuffer();
  const AudioCtx = window.AudioContext || window.webkitAudioContext;
  if (!AudioCtx) return [];
  const context = new AudioCtx();
  try {
    const buffer = await context.decodeAudioData(arrayBuffer.slice(0));
    const channel = buffer.getChannelData(0);
    const bands = 64;
    const step = Math.max(1, Math.floor(channel.length / bands));
    const signature = [];
    for (let i = 0; i < bands; i += 1) {
      let sum = 0;
      let count = 0;
      for (let j = 0; j < step; j += 1) {
        const sample = channel[i * step + j] || 0;
        sum += Math.abs(sample);
        count += 1;
      }
      signature.push(sum / Math.max(1, count));
    }
    return signature;
  } finally {
    context.close().catch(() => {});
  }
}

function getEditorRecorderMimeType() {
  if (typeof MediaRecorder === 'undefined') return '';
  const candidates = [
    'video/webm;codecs=vp9,opus',
    'video/webm;codecs=vp8,opus',
    'video/webm',
  ];
  return candidates.find(type => MediaRecorder.isTypeSupported(type)) || '';
}

async function loadCanvasDrawable(blob) {
  if (typeof createImageBitmap === 'function') {
    try {
      const bitmap = await createImageBitmap(blob);
      return {
        source: bitmap,
        width: bitmap.width,
        height: bitmap.height,
        close: () => bitmap.close(),
      };
    } catch {
      // Fallback to Image below.
    }
  }

  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(blob);
    const image = new Image();
    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve({
        source: image,
        width: image.naturalWidth || image.width || 0,
        height: image.naturalHeight || image.height || 0,
        close: () => {},
      });
    };
    image.onerror = error => {
      URL.revokeObjectURL(url);
      reject(error);
    };
    image.src = url;
  });
}

function getEditorCanvasSourceRect(videoWidth, videoHeight, plan) {
  const zoom = Math.max(0.1, Number(plan?.zoom || 1));
  const crop = Math.max(0.1, Number(plan?.crop || 1));
  const visibleScale = Math.max(0.1, Math.min(1, crop / zoom));
  const sourceWidth = Math.max(2, Math.round(videoWidth * visibleScale));
  const sourceHeight = Math.max(2, Math.round(videoHeight * visibleScale));
  return {
    sx: Math.max(0, Math.round((videoWidth - sourceWidth) / 2)),
    sy: Math.max(0, Math.round((videoHeight - sourceHeight) / 2)),
    sw: sourceWidth,
    sh: sourceHeight,
  };
}

function getEditorCanvasOverlayPosition(copy, overlayWidth, overlayHeight, width, height) {
  const position = getEditorTitlePosition(copy);
  const x = Math.round((width * position.x / 100) - (overlayWidth / 2));
  const y = Math.round((height * position.y / 100) - (overlayHeight / 2));
  return {
    x: Math.max(0, Math.min(width - overlayWidth, x)),
    y: Math.max(0, Math.min(height - overlayHeight, y)),
  };
}

async function composeEditorVariantVideo(project, copy, width, height, plan, hasAudio, onProgress) {
  const overlay = await buildEditorTitleOverlay(project, copy, width, height);
  const overlayDrawable = await loadCanvasDrawable(overlay.blob);
  const video = document.createElement('video');
  const videoUrl = URL.createObjectURL(project.file);
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d', { alpha: false });
  const frameRate = 30;
  const recorderMimeType = getEditorRecorderMimeType();
  let audioContext = null;
  let audioSource = null;
  let audioDestination = null;
  let playbackStarted = false;

  if (!ctx) {
    overlayDrawable.close?.();
    URL.revokeObjectURL(videoUrl);
    if (overlay.overlayUrl) URL.revokeObjectURL(overlay.overlayUrl);
    throw new Error('No se pudo crear el canvas del editor.');
  }

  canvas.width = width;
  canvas.height = height;

  video.src = videoUrl;
  video.muted = true;
  video.playsInline = true;
  video.preload = 'auto';
  video.playbackRate = Math.max(0.1, Number(plan.speed || 1));

  try {
    await waitForVideoEvent(video, 'loadedmetadata');
    await setVideoTime(video, 0);

    const duration = Number.isFinite(video.duration) && video.duration > 0
      ? video.duration
      : Math.max(1, Number(project.duration || 1));
    const playbackSeconds = duration / Math.max(0.1, Number(plan.speed || 1));
    const delaySeconds = Math.max(0, Number(plan.delayMs || 0) / 1000);
    const targetSeconds = Math.max(1, Number(plan.targetEnd || playbackSeconds));
    const recordSeconds = delaySeconds + Math.min(playbackSeconds, targetSeconds);
    const overlayPosition = getEditorCanvasOverlayPosition(copy, overlayDrawable.width, overlayDrawable.height, width, height);
    const sourceRect = getEditorCanvasSourceRect(video.videoWidth || width, video.videoHeight || height, plan);
    const brightness = Math.max(0.5, Math.min(1.5, 1 + Number(plan.brightness || 0)));
    const recordedTracks = [];

    const canvasStream = canvas.captureStream(frameRate);
    recordedTracks.push(...canvasStream.getVideoTracks());

    if (hasAudio) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        try {
          audioContext = new AudioCtx();
          audioSource = audioContext.createMediaElementSource(video);
          audioDestination = audioContext.createMediaStreamDestination();
          audioSource.connect(audioDestination);
          recordedTracks.push(...audioDestination.stream.getAudioTracks());
        } catch {
          recordedTracks.length = 0;
          recordedTracks.push(...canvasStream.getVideoTracks());
        }
      }
    }

    const captureStream = new MediaStream(recordedTracks);
    const recorder = new MediaRecorder(captureStream, recorderMimeType ? { mimeType: recorderMimeType } : undefined);
    const chunks = [];
    recorder.ondataavailable = event => {
      if (event.data.size) chunks.push(event.data);
    };
    const recorderStopped = new Promise(resolve => {
      recorder.onstop = resolve;
    });

    recorder.start();
    const startTime = performance.now();
    const frameDelay = 1000 / frameRate;
    let lastProgressBucket = -1;

    while ((performance.now() - startTime) / 1000 < recordSeconds) {
      const elapsedSeconds = (performance.now() - startTime) / 1000;
      if (onProgress) {
        const phaseProgress = recordSeconds > 0 ? Math.min(1, elapsedSeconds / recordSeconds) : 1;
        const progress = 15 + (phaseProgress * 70);
        const bucket = Math.floor(progress);
        if (bucket !== lastProgressBucket) {
          lastProgressBucket = bucket;
          onProgress(progress, playbackStarted ? 'Grabando el video...' : 'Preparando el video...');
        }
      }
      if (!playbackStarted && elapsedSeconds >= delaySeconds) {
        playbackStarted = true;
        audioContext?.resume?.().catch(() => {});
        await video.play().catch(() => {});
      }

      ctx.fillStyle = '#000000';
      ctx.fillRect(0, 0, width, height);
      ctx.save();
      ctx.filter = `brightness(${brightness})`;
      ctx.drawImage(
        video,
        sourceRect.sx,
        sourceRect.sy,
        sourceRect.sw,
        sourceRect.sh,
        0,
        0,
        width,
        height,
      );
      ctx.restore();

      ctx.drawImage(
        overlayDrawable.source,
        overlayPosition.x,
        overlayPosition.y,
      );

      await sleep(frameDelay);
    }

    if (!playbackStarted) {
      audioContext?.resume?.().catch(() => {});
      await video.play().catch(() => {});
    }

    recorder.stop();
    await recorderStopped;

    const blob = new Blob(chunks, { type: recorder.mimeType || 'video/webm' });
    onProgress?.(86, 'Terminando la grabación...');
    return {
      blob,
      mimeType: recorder.mimeType || 'video/webm',
      hasAudio: Boolean(audioDestination?.stream?.getAudioTracks?.().length),
    };
  } finally {
    if (playbackStarted) {
      video.pause();
    }
    audioSource?.disconnect?.();
    audioDestination?.disconnect?.();
    if (audioContext) await audioContext.close().catch(() => {});
    URL.revokeObjectURL(videoUrl);
    overlayDrawable.close?.();
    if (overlay.overlayUrl) URL.revokeObjectURL(overlay.overlayUrl);
  }
}

async function transcodeEditorRecording(runtime, recording, outputName, hasAudio, onProgress) {
  const inputName = `recording-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.webm`;
  onProgress?.(88, 'Preparando la transcodificación...');
  await runtime.instance.writeFile(inputName, await runtime.fetchFile(recording.blob));

  try {
    const args = ['-i', inputName];
    if (hasAudio && recording.hasAudio) {
      args.push(
        '-map', '0:v:0',
        '-map', '0:a:0?',
        '-c:a', 'aac',
        '-b:a', '128k',
      );
    } else {
      args.push('-map', '0:v:0', '-an');
    }

    args.push(
      '-c:v', 'libx264',
      '-preset', 'ultrafast',
      '-crf', '28',
      '-pix_fmt', 'yuv420p',
      '-movflags', 'faststart',
      '-shortest',
      outputName,
    );

    onProgress?.(92, 'Transcodificando con FFmpeg...');
    await execEditorFFmpegChecked(runtime, args, onProgress);
    onProgress?.(98, 'Verificando el archivo generado...');
    const data = await runtime.instance.readFile(outputName);
    const blob = new Blob([data], { type: 'video/mp4' });
    return {
      blob,
      file: new File([blob], outputName, { type: 'video/mp4' }),
      url: URL.createObjectURL(blob),
    };
  } finally {
    await runtime.instance.deleteFile(inputName).catch(() => {});
  }
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

function hashStringToSeed(value) {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function mulberry32(seed) {
  let t = seed >>> 0;
  return () => {
    t += 0x6D2B79F5;
    let x = t;
    x = Math.imul(x ^ (x >>> 15), x | 1);
    x ^= x + Math.imul(x ^ (x >>> 7), x | 61);
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  };
}

function createVariantPlan(project, copy, attempt = 0) {
  const seed = hashStringToSeed(`${project.id}:${copy.index}:${attempt}`);
  const rand = mulberry32(seed);
  const speed = 1 + rand() * 0.03;
  const zoom = 1 + rand() * 0.02;
  const crop = 0.97 + rand() * 0.03;
  const delayMs = 80 + Math.round(rand() * 70);
  const brightness = -0.02 + rand() * 0.02;
  const gamma = 0.98 + rand() * 0.02;
  const targetEnd = copy.durationMode === 'range'
    ? Math.max(1, Math.min(Math.round(project.duration || 30), Math.round(copy.rangeEnd || 10)))
    : Math.max(1, Math.round(project.duration || 30));

  return {
    seed,
    speed: Number(speed.toFixed(4)),
    zoom: Number(zoom.toFixed(4)),
    crop: Number(crop.toFixed(4)),
    delayMs,
    brightness: Number(brightness.toFixed(4)),
    gamma: Number(gamma.toFixed(4)),
    targetEnd,
  };
}

function applyVariantFilterToSize(width, height, plan) {
  const zoomW = Math.max(2, Math.round(width * plan.zoom));
  const zoomH = Math.max(2, Math.round(height * plan.zoom));
  const cropW = Math.max(2, Math.round(width * plan.crop));
  const cropH = Math.max(2, Math.round(height * plan.crop));
  return {
    zoomW: zoomW % 2 === 0 ? zoomW : zoomW + 1,
    zoomH: zoomH % 2 === 0 ? zoomH : zoomH + 1,
    cropW: cropW % 2 === 0 ? cropW : cropW + 1,
    cropH: cropH % 2 === 0 ? cropH : cropH + 1,
  };
}

function escapeFFmpegFilterExpression(value) {
  return String(value || '').replace(/\\/g, '\\\\').replace(/,/g, '\\,');
}

function getEditorFilterGraph(width, height, plan, copy, hasAudio) {
  const sizes = applyVariantFilterToSize(width, height, plan);
  const videoChain = [
    `tpad=start_duration=${(plan.delayMs / 1000).toFixed(3)}:start_mode=clone`,
    `scale=${sizes.zoomW}:${sizes.zoomH}`,
    `crop=${sizes.cropW}:${sizes.cropH}:(in_w-out_w)/2:(in_h-out_h)/2`,
    `scale=${width}:${height}`,
    `eq=brightness=${plan.brightness}:gamma=${plan.gamma}`,
    `setpts=PTS/${plan.speed}`,
  ].join(',');
  const overlayY = Math.max(24, Math.round(height * 0.70));
  const output = `[vbase][voverlay]overlay=x=(W-w)/2:y=${overlayY}-h/2:enable='between(t,0,${plan.targetEnd})'[vout]`;
  if (!hasAudio) {
    return {
      filterGraph: `[0:v]${videoChain}[vbase]`,
      outputLabel: 'vout',
      hasAudio: false,
      overlayFilter: output,
    };
  }

  const audioChain = [
    `adelay=${plan.delayMs}|${plan.delayMs}`,
    `atempo=${plan.speed}`,
    `atrim=0:${plan.targetEnd}`,
  ].join(',');
  return {
    filterGraph: `[0:v]${videoChain}[vbase];[1:v]format=rgba[voverlay];[0:a]${audioChain}[aout];${output}`,
    outputLabel: 'vout',
    hasAudio: true,
    overlayFilter: output,
  };
}

function parseEditorFilterCommand(inputName, overlayFileName, outputName, width, height, plan, copy, hasAudio) {
  const sizes = applyVariantFilterToSize(width, height, plan);
  const titlePosition = getEditorTitlePosition(copy);
  const videoChain = [
    `trim=0:${plan.targetEnd}`,
    'setpts=PTS-STARTPTS',
    `scale=${sizes.zoomW}:${sizes.zoomH}`,
    `crop=${sizes.cropW}:${sizes.cropH}:(in_w-out_w)/2:(in_h-out_h)/2`,
    `scale=${width}:${height}`,
    `eq=brightness=${plan.brightness}:gamma=${plan.gamma}`,
    `setpts=PTS/${plan.speed}`,
    `tpad=start_duration=${(plan.delayMs / 1000).toFixed(3)}:start_mode=clone`,
    'fps=30',
  ].join(',');
  const overlayX = escapeFFmpegFilterExpression(`max(0,min(W-w,(W*${(titlePosition.x / 100).toFixed(4)})-(w/2)))`);
  const overlayY = escapeFFmpegFilterExpression(`max(0,min(H-h,(H*${(titlePosition.y / 100).toFixed(4)})-(h/2)))`);
  const args = ['-i', inputName];
  const filterSegments = [];

  if (overlayFileName) {
    args.push('-loop', '1', '-i', overlayFileName);
    filterSegments.push(`[0:v]${videoChain}[vbase]`);
    filterSegments.push(`[1:v]format=rgba[voverlay]`);
    filterSegments.push(`[vbase][voverlay]overlay=x=${overlayX}:y=${overlayY}:enable='between(t,0,${plan.targetEnd})'[vout]`);
  } else {
    filterSegments.push(`[0:v]${videoChain}[vout]`);
  }

  if (hasAudio) {
    filterSegments.push(`[0:a]atrim=0:${plan.targetEnd},atempo=${plan.speed},adelay=${plan.delayMs}|${plan.delayMs},asetpts=N/SR/TB[aout]`);
  }

  args.push('-filter_complex', filterSegments.join(';'), '-map', '[vout]');

  if (hasAudio) {
    args.push('-map', '[aout]', '-c:a', 'aac', '-b:a', '128k');
  } else {
    args.push('-an');
  }

  args.push('-shortest', '-c:v', 'libx264', '-preset', 'ultrafast', '-crf', '28', '-pix_fmt', 'yuv420p', '-movflags', 'faststart', outputName);
  return args;
}

async function createEditorTitleOverlay(project, copy, width, height) {
  const committedTitle = getEditorCommittedTitle(copy);
  if (!committedTitle) return null;

  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  const fontSize = Math.max(24, Math.min(100, Number(copy.size || 54)));
  const padding = Math.max(6, Math.min(42, Number(copy.padding || 18)));
  const fontOption = getEditorFontOptionByFamily(copy.font);
  const maxWidth = Math.max(160, Math.round((width || 1080) * 0.72));
  const titleColor = copy.showBackground && isLightColor(copy.backgroundColor) ? '#111827' : '#ffffff';

  canvas.width = maxWidth;
  canvas.height = 400;
  ctx.font = `700 ${fontSize}px ${fontOption.family}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  const words = committedTitle.split(/\s+/).filter(Boolean);
  const lines = [];
  let line = '';
  words.forEach(word => {
    const test = line ? `${line} ${word}` : word;
    if (ctx.measureText(test).width > maxWidth - padding * 2 && line) {
      lines.push(line);
      line = word;
    } else {
      line = test;
    }
  });
  if (line) lines.push(line);
  const lineHeight = Math.round(fontSize * 1.18);
  const boxHeight = lines.length * lineHeight + padding * 2;
  const boxWidth = Math.min(maxWidth, Math.max(...lines.map(text => ctx.measureText(text).width)) + padding * 2);
  canvas.width = Math.ceil(boxWidth);
  canvas.height = Math.ceil(boxHeight);

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  if (copy.showBackground) {
    ctx.fillStyle = copy.backgroundColor || '#111827';
    ctx.globalAlpha = Math.max(0, Math.min(100, Number(copy.opacity || 88))) / 100;
    roundRect(ctx, 0, 0, canvas.width, canvas.height, Math.min(24, padding + 4));
    ctx.fill();
    ctx.globalAlpha = 1;
  }

  ctx.fillStyle = titleColor;
  ctx.shadowColor = 'rgba(0,0,0,0.35)';
  ctx.shadowBlur = 10;
  ctx.shadowOffsetY = 2;
  ctx.font = `700 ${fontSize}px ${fontOption.family}`;
  lines.forEach((text, index) => {
    const y = padding + (lineHeight / 2) + (index * lineHeight);
    ctx.fillText(text, canvas.width / 2, y);
  });
  ctx.shadowBlur = 0;
  ctx.shadowOffsetY = 0;

  return new Promise(resolve => {
    canvas.toBlob(blob => {
      if (!blob) {
        resolve(null);
        return;
      }
      const overlayUrl = URL.createObjectURL(blob);
      resolve({ blob, overlayUrl });
    }, 'image/png');
  });
}

function roundRect(ctx, x, y, width, height, radius) {
  const r = Math.min(radius, width / 2, height / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + width, y, x + width, y + height, r);
  ctx.arcTo(x + width, y + height, x, y + height, r);
  ctx.arcTo(x, y + height, x, y, r);
  ctx.arcTo(x, y, x + width, y, r);
  ctx.closePath();
}

async function buildEditorTitleOverlay(project, copy, width, height) {
  const overlay = await createEditorTitleOverlay(project, copy, width, height);
  return overlay;
}

// Rehydrate the source video after a runtime reset; the old in-memory FS is gone.
async function restoreEditorInputFile(ffmpegRuntime, inputName, sourceFile) {
  if (!ffmpegRuntime?.instance || !ffmpegRuntime.fetchFile || !sourceFile) return;
  await ffmpegRuntime.instance.writeFile(inputName, await ffmpegRuntime.fetchFile(sourceFile));
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

async function renderEditorProjectCopy(project, copy, ffmpegRuntime, inputName, sourceFile, width, height, hasAudio, previousAccepted) {
  const preferBrowserPipeline =
    typeof MediaRecorder !== 'undefined' &&
    typeof HTMLCanvasElement !== 'undefined' &&
    typeof document !== 'undefined';
  const maxAttempts = preferBrowserPipeline ? 4 : 8;
  let lastError = null;
  const outputName = `variant_${String(copy.index).padStart(3, '0')}.mp4`;
  const reportProgress = createEditorCopyProgressReporter(copy);
  const overlay = await buildEditorTitleOverlay(project, copy, width, height);
  const overlayName = overlay ? `editor-overlay-${project.id}-${copy.index}.png` : '';

  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const plan = createVariantPlan(project, copy, attempt);
    const editorStatusEl = document.getElementById('editor-generate-status') || document.body;
    let output = null;
    let overlayWritten = false;

    try {
      copy.status = 'processing';
      copy.detail = 'Preparando la copia...';
      reportProgress(15, 'Preparando la copia...');
      syncEditorProjectMetadata(project);
      refreshEditorUi();

      if (!preferBrowserPipeline && overlay?.blob) {
        await ffmpegRuntime.instance.writeFile(overlayName, await ffmpegRuntime.fetchFile(overlay.blob));
        overlayWritten = true;
      }

      let generated;
      if (preferBrowserPipeline) {
        reportProgress(40, 'Renderizando en el navegador...');
        const recording = await composeEditorVariantVideo(project, copy, width, height, plan, hasAudio, reportProgress);
        generated = await transcodeEditorRecording(ffmpegRuntime, recording, outputName, hasAudio, reportProgress);
      } else {
        reportProgress(40, 'Aplicando las transformaciones...');
        const args = parseEditorFilterCommand(inputName, overlayWritten ? overlayName : '', outputName, width, height, plan, copy, hasAudio);
        await execEditorFFmpegChecked(ffmpegRuntime, args, reportProgress);
        reportProgress(94, 'Analizando la variante...');
        const data = await ffmpegRuntime.instance.readFile(outputName);
        const blob = new Blob([data], { type: 'video/mp4' });
        generated = {
          blob,
          file: new File([blob], outputName, { type: 'video/mp4' }),
          url: URL.createObjectURL(blob),
        };
      }
      output = generated;
      const file = generated.file;
      const url = generated.url;
      const frame = await withTimeout(
        loadVideoFrame(file, 0.45),
        EDITOR_POSTPROCESS_TIMEOUT_MS,
        'No se pudo analizar el fotograma generado a tiempo.',
      ).catch(() => null);
      const hash = frame ? computePhashFromImageData(frame) : [];
      const audioSignature = hasAudio
        ? await withTimeout(
            computeAudioSignature(file),
            EDITOR_POSTPROCESS_TIMEOUT_MS,
            'No se pudo analizar el audio generado a tiempo.',
          ).catch(() => [])
        : [];
      const signature = { hash, audioSignature };

      if (!estimateSimilarity(signature, previousAccepted)) {
        lastError = new Error('La variante resultó demasiado parecida. Reintentando con otro seed.');
        await ffmpegRuntime.instance.deleteFile(outputName).catch(() => {});
        if (url) URL.revokeObjectURL(url);
        continue;
      }

      copy.status = 'ready';
      reportProgress(100, 'Listo');
      copy.attempts = attempt + 1;
      copy.output = generated;
      copy.hash = hash;
      copy.audioSignature = audioSignature;
      syncEditorProjectMetadata(project);
      return copy.output;
    } catch (error) {
      lastError = error;
      if (output?.url) URL.revokeObjectURL(output.url);
      if (error?.code === 'editor_ffmpeg_watchdog' || !ffmpegRuntime?.instance) {
        resetEditorFFmpegRuntime();
        ffmpegRuntime = await loadFFmpeg(editorStatusEl);
        await restoreEditorInputFile(ffmpegRuntime, inputName, sourceFile);
      }
      copy.status = 'processing';
      reportProgress(Math.max(copy.progress, 25), 'Reintentando la copia...');
      await ffmpegRuntime.instance?.deleteFile(outputName).catch(() => {});
    } finally {
      await ffmpegRuntime.instance?.deleteFile(outputName).catch(() => {});
      if (overlayWritten) {
        await ffmpegRuntime.instance?.deleteFile(overlayName).catch(() => {});
      }
    }
  }

  copy.status = 'failed';
  copy.detail = '';
  copy.progress = 0;
  copy.attempts = maxAttempts;
  syncEditorProjectMetadata(project);
  throw lastError || new Error('No se pudo generar la variante.');
}

async function generateAllEditorVideos() {
  if (!state.editorProjects.length) {
    toast('Subí uno o más videos primero', 'error');
    return;
  }
  if (state.editorQueueRunning) return;

  const button = document.getElementById('editor-generate-all-btn');
  state.editorQueueRunning = true;
  if (button) {
    button.disabled = true;
    button.innerHTML = '<span class="spinner"></span> Generando...';
  }

  try {
    const runtime = await loadFFmpeg(document.getElementById('editor-generate-status') || document.body);
    for (const project of state.editorProjects) {
      const inputName = 'input.mp4';
      try {
        ensureEditorCopyCount(project, project.copies.length || 1);
        const metadata = project.duration && project.width && project.height
          ? { duration: project.duration, width: project.width, height: project.height }
          : await getBrowserVideoMetadata(project.file);
        project.duration = metadata.duration || project.duration || 1;
        project.width = metadata.width || project.width || 1080;
        project.height = metadata.height || project.height || 1920;
        await runtime.instance.writeFile(inputName, await runtime.fetchFile(project.file));
        const hasAudio = await probeHasAudio(runtime.instance, inputName, `probe-${project.id}.txt`).catch(() => false);
        const previousAccepted = [];
        clearEditorQueueState(project);
        syncEditorProjectMetadata(project);
        refreshEditorUi();
        state.ffmpeg.activeStatusId = 'editor-generate-status';

        for (const copy of project.copies) {
          try {
            copy.status = 'queued';
            copy.progress = 10;
            refreshEditorUi();
            const statusNote = document.getElementById('editor-generate-status');
            if (statusNote) statusNote.textContent = `Procesando ${project.name} · copia ${copy.index} de ${project.copies.length}...`;
            const output = await renderEditorProjectCopy(project, copy, runtime, inputName, project.file, project.width, project.height, hasAudio, previousAccepted);
            previousAccepted.push({
              hash: copy.hash,
              audioSignature: copy.audioSignature,
              output,
            });
          } catch (error) {
            copy.status = 'failed';
            copy.progress = 0;
            copy.error = getErrorMessage(error, 'No se pudo procesar esta copia.');
            syncEditorProjectMetadata(project);
          }
          refreshEditorUi();
        }

        await buildEditorProjectZip(project);
        syncEditorProjectMetadata(project);
        refreshEditorUi();
      } finally {
        await runtime.instance.deleteFile(inputName).catch(() => {});
      }
    }

    toast('Generación finalizada', 'success');
  } catch (error) {
    toast(getErrorMessage(error, 'No se pudo ejecutar la cola de generación.'), 'error');
  } finally {
    state.editorQueueRunning = false;
    state.ffmpeg.activeStatusId = null;
    if (button) {
      button.disabled = false;
      button.textContent = 'Generar todo';
    }
    const statusNote = document.getElementById('editor-generate-status');
    if (statusNote && !state.editorQueueRunning) {
      statusNote.textContent = 'Generación finalizada';
    }
    refreshEditorUi();
  }
}

function removeEditorProjectOutput(copy) {
  if (copy.output?.url) URL.revokeObjectURL(copy.output.url);
  copy.output = null;
  copy.hash = null;
  copy.audioSignature = null;
}

async function buildZipBlob(files) {
  const encoder = new TextEncoder();
  const localParts = [];
  const centralParts = [];
  let offset = 0;

  for (const file of files) {
    const data = new Uint8Array(await file.blob.arrayBuffer());
    const nameBytes = encoder.encode(file.name);
    const crc = crc32(data);
    const localHeader = new ArrayBuffer(30);
    const localView = new DataView(localHeader);
    localView.setUint32(0, 0x04034b50, true);
    localView.setUint16(4, 20, true);
    localView.setUint16(6, 0, true);
    localView.setUint16(8, 0, true);
    localView.setUint16(10, 0, true);
    localView.setUint16(12, 0, true);
    localView.setUint32(14, crc, true);
    localView.setUint32(18, data.length, true);
    localView.setUint32(22, data.length, true);
    localView.setUint16(26, nameBytes.length, true);
    localView.setUint16(28, 0, true);
    localParts.push(new Uint8Array(localHeader), nameBytes, data);

    const centralHeader = new ArrayBuffer(46);
    const centralView = new DataView(centralHeader);
    centralView.setUint32(0, 0x02014b50, true);
    centralView.setUint16(4, 20, true);
    centralView.setUint16(6, 20, true);
    centralView.setUint16(8, 0, true);
    centralView.setUint16(10, 0, true);
    centralView.setUint16(12, 0, true);
    centralView.setUint16(14, 0, true);
    centralView.setUint32(16, crc, true);
    centralView.setUint32(20, data.length, true);
    centralView.setUint32(24, data.length, true);
    centralView.setUint16(28, nameBytes.length, true);
    centralView.setUint16(30, 0, true);
    centralView.setUint16(32, 0, true);
    centralView.setUint16(34, 0, true);
    centralView.setUint16(36, 0, true);
    centralView.setUint32(38, 0, true);
    centralView.setUint32(42, offset, true);
    centralParts.push(new Uint8Array(centralHeader), nameBytes);

    offset += 30 + nameBytes.length + data.length;
  }

  const centralSize = centralParts.reduce((sum, part) => sum + part.length, 0);
  const centralOffset = localParts.reduce((sum, part) => sum + part.length, 0);
  const endRecord = new ArrayBuffer(22);
  const endView = new DataView(endRecord);
  endView.setUint32(0, 0x06054b50, true);
  endView.setUint16(4, 0, true);
  endView.setUint16(6, 0, true);
  endView.setUint16(8, files.length, true);
  endView.setUint16(10, files.length, true);
  endView.setUint32(12, centralSize, true);
  endView.setUint32(16, centralOffset, true);
  endView.setUint16(20, 0, true);

  return new Blob([...localParts, ...centralParts, new Uint8Array(endRecord)], { type: 'application/zip' });
}

function crc32(bytes) {
  const table = crc32.table || (crc32.table = Array.from({ length: 256 }, (_, index) => {
    let c = index;
    for (let bit = 0; bit < 8; bit += 1) {
      c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1;
    }
    return c >>> 0;
  }));
  let crc = 0 ^ -1;
  for (let index = 0; index < bytes.length; index += 1) {
    crc = (crc >>> 8) ^ table[(crc ^ bytes[index]) & 0xFF];
  }
  return (crc ^ -1) >>> 0;
}

// ═══════════════════════════════════════════════════════════
//  HISTORY
// ═══════════════════════════════════════════════════════════
function renderHistory() {
  const tbody = document.getElementById('history-tbody');
  const filter = document.getElementById('history-filter').value;

  let items = state.history;
  if (filter === 'instagram') items = items.filter(h => h.platform === 'ig');
  if (filter === 'draft')     items = items.filter(h => h.status === 'draft');

  if (items.length === 0) {
    tbody.innerHTML = `<tr class="empty-row"><td colspan="6"><div class="empty-state-small"><p>No hay registros.</p><button class="btn btn-outline btn-sm" onclick="navigateTo('publisher')">Crear publicación →</button></div></td></tr>`;
    return;
  }

  const statusMap = {
    published: '<span class="badge badge-active">Publicado</span>',
    pending:   '<span class="badge badge-pending">En proceso</span>',
    draft:     '<span class="badge badge-pending">Borrador</span>',
    ready:     '<span class="badge badge-active">Listo</span>',
    'ready-for-analysis': '<span class="badge badge-pending">Referencia</span>',
    error:     '<span class="badge badge-error">Error</span>',
  };
  const typeMap = {
    publish: 'Reel',
    format:  'Edición',
  };
  const platformMap = {
    ig: 'Instagram',
  };

  tbody.innerHTML = items.slice().reverse().map(h => `
    <tr>
      <td style="color:var(--text-1);font-weight:500">${h.filename || h.template || '—'}</td>
      <td>${platformMap[h.platform] || '—'}</td>
      <td>${typeMap[h.type] || h.type}</td>
      <td>${statusMap[h.status] || h.status}</td>
      <td>${formatDate(h.date)}</td>
      <td>
        <button class="btn btn-ghost btn-sm" onclick="deleteHistoryItem('${h.id}')">✕</button>
      </td>
    </tr>
  `).join('');
}

function deleteHistoryItem(id) {
  state.history = state.history.filter(h => h.id !== id);
  saveHistory();
  renderHistory();
}

document.getElementById('history-filter').addEventListener('change', renderHistory);

// ═══════════════════════════════════════════════════════════
//  SETTINGS
// ═══════════════════════════════════════════════════════════
function renderSettings() {
  if (state.settings.backendUrl) document.getElementById('backend-url').value = state.settings.backendUrl;

  // Tokens list
  const list = document.getElementById('tokens-list');
  if (state.accounts.length === 0) {
    list.innerHTML = `<div class="empty-state-small"><p>No hay tokens guardados.</p></div>`;
  } else {
    list.innerHTML = state.accounts.map(acc => `
      <div class="token-item">
        <div>
          <div class="token-platform">📸 Instagram · ${acc.username}</div>
          <div class="token-expiry">Expira: ${formatDate(acc.expiresAt)}</div>
        </div>
        <span class="badge badge-active">Válido</span>
      </div>
    `).join('');
  }

  // Backend status check
  checkBackend();
}

async function checkBackend() {
  const el = document.getElementById('backend-status');
  try {
    const res = await fetch(`${state.settings.backendUrl}/health`, { signal: AbortSignal.timeout(3000) });
    if (res.ok) {
      el.className = 'badge badge-active';
      el.textContent = 'Conectado';
    } else throw new Error();
  } catch {
    el.className = 'badge badge-error';
    el.textContent = 'Sin conexión';
  }
}

// ═══════════════════════════════════════════════════════════
//  DRAG & DROP
// ═══════════════════════════════════════════════════════════
function setupDragDrop(zoneId, inputId, handler) {
  const zone = document.getElementById(zoneId);
  if (!zone) return;

  zone.addEventListener('dragover', e => {
    e.preventDefault();
    zone.classList.add('drag-over');
  });
  zone.addEventListener('dragleave', () => zone.classList.remove('drag-over'));
  zone.addEventListener('drop', e => {
    e.preventDefault();
    zone.classList.remove('drag-over');
    const files = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith('video/'));
    if (files.length) handler({ target: { files } });
  });
}

function setupTypedFileDrop(zoneId, handler, acceptsFile) {
  const zone = document.getElementById(zoneId);
  if (!zone) return;

  zone.addEventListener('dragover', e => {
    e.preventDefault();
    zone.classList.add('drag-over');
  });
  zone.addEventListener('dragleave', () => zone.classList.remove('drag-over'));
  zone.addEventListener('drop', e => {
    e.preventDefault();
    zone.classList.remove('drag-over');
    const files = Array.from(e.dataTransfer.files).filter(acceptsFile);
    if (files.length) handler({ target: { files } });
  });
}

setupDragDrop('upload-zone', 'video-input', handleVideoUpload);

function setupInstagramOAuthFields() {
  const callbackInput = document.getElementById('ig-callback');
  const scopesInput = document.getElementById('ig-scopes');
  const appIdInput = document.getElementById('ig-app-id');

  if (callbackInput) callbackInput.value = getInstagramCallbackUrl();
  if (scopesInput) scopesInput.value = INSTAGRAM_SCOPES;
  if (appIdInput) appIdInput.value = localStorage.getItem('rf_ig_app_id') || INSTAGRAM_APP_ID;
}

// ═══════════════════════════════════════════════════════════
//  INIT
// ═══════════════════════════════════════════════════════════
function init() {
  syncGeminiGlobals();
  setupInstagramOAuthFields();

  state.accounts = state.accounts.filter(account => account.platform === 'ig');
  state.history = state.history.filter(item => item?.platform !== 'ai');
  state.selectedAccounts = new Set([...state.selectedAccounts].filter(id => state.accounts.some(account => account.id === id)));
  saveAccounts();
  saveHistory();

  // Restore accounts
  renderIGAccounts();
  renderEditorVideos();

  // Initial page
  navigateTo('dashboard');
}

async function startVariantUniqueGeneration() {
  const videoFile = state.editorVideos?.[0];
  if (!videoFile) {
    toast('Cargá un video en el editor primero', 'error');
    return;
  }

  const variantCount = parseInt(document.getElementById('variant-unique-count')?.value || '10', 10);
  if (!Number.isFinite(variantCount) || variantCount < 1 || variantCount > 100) {
    toast('Las variantes deben ser entre 1 y 100', 'error');
    return;
  }

  const runtimeStatus = getVariantUniqueRuntimeStatusEl();
  const btnGenerate = document.getElementById('variant-unique-btn');
  const progressContainer = document.getElementById('variant-unique-progress');
  const progressBar = document.getElementById('variant-unique-progress-bar');
  const progressText = document.getElementById('variant-unique-progress-text');
  const successMessage = document.getElementById('variant-unique-success');

  if (btnGenerate) btnGenerate.disabled = true;
  if (progressContainer) progressContainer.style.display = 'block';
  if (successMessage) successMessage.style.display = 'none';
  if (progressBar) progressBar.style.width = '0%';
  if (progressText) progressText.textContent = 'Preparando...';

  if (runtimeStatus) runtimeStatus.textContent = 'Preparando motor local...';

  const inputFileName = 'variant-input.mp4';
  let ffmpeg = null;
  const variants = [];
  const manifestEntries = [];
  const previousAccepted = [];
  const maxAttemptsPerVariant = 8;
  let hasAudio = false;

  try {
    const ffmpegRuntime = await ensureVariantUniqueRuntime(runtimeStatus);
    ffmpeg = ffmpegRuntime.instance || ffmpegRuntime;
    const { VariantTransformer } = await import('/src/engine/variantTransformer.js');
    const metadata = await getBrowserVideoMetadata(videoFile);
    const targetFrame = metadata.width && metadata.height
      ? { width: metadata.width, height: metadata.height }
      : null;
    const inputBuffer = await videoFile.arrayBuffer();
    await ffmpeg.writeFile(inputFileName, new Uint8Array(inputBuffer));
    hasAudio = await probeHasAudio(ffmpeg, inputFileName, `variant-unique-audio-${Date.now()}.txt`).catch(() => false);

    for (let i = 1; i <= variantCount; i += 1) {
      const variantNum = String(i).padStart(3, '0');
      const outputFileName = `variant-${variantNum}.mp4`;
      let acceptedVariant = null;
      let acceptedTransforms = null;
      let acceptedSignature = null;

      for (let attempt = 0; attempt < maxAttemptsPerVariant; attempt += 1) {
        const transforms = VariantTransformer.generateRandomTransforms(i, attempt);
        const ffmpegArgs = VariantTransformer.buildFFmpegCommand(
          inputFileName,
          outputFileName,
          transforms,
          hasAudio,
          targetFrame,
        );

        if (progressText) {
          progressText.textContent = `Variante ${i}/${variantCount} (${transforms.speed.toFixed(2)}x)`;
        }

        await execEditorFFmpegChecked(
          ffmpegRuntime,
          ffmpegArgs,
          pct => {
            const overallPct = ((i - 1 + (pct / 100)) / variantCount) * 100;
            if (progressBar) progressBar.style.width = `${Math.min(overallPct, 95)}%`;
            if (progressText) {
              progressText.textContent = `Variante ${i}/${variantCount} (${transforms.speed.toFixed(2)}x)`;
            }
          },
          `Error procesando variante ${variantNum}`,
        );

        const outputData = await ffmpeg.readFile(outputFileName);
        const blob = new Blob([outputData], { type: 'video/mp4' });
        const outputFile = new File([blob], outputFileName, { type: 'video/mp4' });
        const frame = await loadVideoFrame(outputFile, 0.45).catch(() => null);
        const hash = frame ? computePhashFromImageData(frame) : [];
        const audioSignature = hasAudio
          ? await computeAudioSignature(outputFile).catch(() => [])
          : [];
        const signature = { hash, audioSignature };

        if (!estimateSimilarity(signature, previousAccepted)) {
          await ffmpeg.deleteFile(outputFileName).catch(() => {});
          continue;
        }

        acceptedVariant = { name: outputFileName, blob };
        acceptedTransforms = transforms;
        acceptedSignature = signature;
        previousAccepted.push(signature);
        variants.push(acceptedVariant);
        manifestEntries.push({
          filename: outputFileName,
          size_mb: (blob.size / 1024 / 1024).toFixed(2),
          transforms: acceptedTransforms,
          phash: hash,
          audio_signature: audioSignature,
          attempts: attempt + 1,
          unique_check_passed: true,
        });
        await ffmpeg.deleteFile(outputFileName).catch(() => {});
        break;
      }

      if (!acceptedVariant || !acceptedTransforms || !acceptedSignature) {
        throw new Error(`No se pudo generar la variante ${variantNum} sin duplicados.`);
      }
    }

    if (progressBar) progressBar.style.width = '95%';
    if (progressText) progressText.textContent = 'Empaquetando ZIP...';

    const manifestJson = JSON.stringify({
      generated_at: new Date().toISOString(),
      original_file: videoFile.name,
      total_variants: variants.length,
      variants: manifestEntries,
    }, null, 2);

    const finalZip = await variantBuildZipWithManifest(variants, manifestJson);
    variantDownloadZip(finalZip, 'variantes-unicas.zip');

    if (progressContainer) progressContainer.style.display = 'none';
    if (progressBar) progressBar.style.width = '0%';
    if (successMessage) successMessage.style.display = 'block';

    toast(`✓ ${variants.length} variantes generadas y descargadas`, 'success');
  } catch (error) {
    const errorMsg = error?.message || 'Error desconocido';
    toast(`Error: ${errorMsg}`, 'error');
  } finally {
    if (ffmpeg) {
      await ffmpeg.deleteFile(inputFileName).catch(() => {});
    }
    if (btnGenerate) btnGenerate.disabled = false;
    state.ffmpeg.activeStatusId = null;
    updateVariantUniqueControls();
  }
}

async function variantBuildZipWithManifest(videoFiles, manifestJson) {
  const manifestFile = {
    name: 'manifest.json',
    blob: new Blob([manifestJson], { type: 'application/json' }),
  };

  try {
    const { default: JSZip } = await import('https://cdn.jsdelivr.net/npm/jszip@3.10.1/+esm');
    const zip = new JSZip();
    for (const file of [...videoFiles, manifestFile]) {
      zip.file(file.name, file.blob);
    }
    return zip.generateAsync({ type: 'blob' });
  } catch {
    return buildZipBlob([...videoFiles, manifestFile]);
  }
}

function variantDownloadZip(blob, filename) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.style.display = 'none';

  document.body.appendChild(link);
  link.click();

  setTimeout(() => {
    link.remove();
    URL.revokeObjectURL(url);
  }, 100);
}

init();
