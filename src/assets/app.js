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
  aiVideoPhoto: null,
  aiVideoPhotoUrl: '',
  aiVoiceSample: null,
  editorVideos: [],
  referenceVideos: [],
  selectedReferences: new Set(),
  selectedTemplates: new Set(['ig-cinematic-hook']),
  generatedVideos: [],
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
  openaiApiKey: '',
  openaiVideoModel: 'sora-2',
  openaiTtsModel: 'gpt-4o-mini-tts',
  openaiVoiceId: '',
  lipSyncProvider: 'sync-labs',
  lipSyncApiKey: '',
  lipSyncEndpoint: '',
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

function getPublicOrigin() {
  return window.location.origin && window.location.origin !== 'null'
    ? window.location.origin
    : PUBLIC_ORIGIN;
}

function getInstagramCallbackUrl() {
  return `${getPublicOrigin()}/auth/instagram/callback`;
}

function getTikTokCallbackUrl() {
  return `${getPublicOrigin()}/auth/tiktok/callback`;
}

// ── Navigation ─────────────────────────────────────────────
const pages = {
  dashboard: 'Dashboard',
  accounts:  'Cuentas',
  publisher: 'Publicar',
  editor:    'Editor de Videos',
  'ai-video': 'Crear video IA',
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
  if (page === 'editor')    initEditor();
  if (page === 'ai-video')  renderAiVideoStatus();
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
  document.getElementById('modal-overlay').classList.add('open');
}

function closeModal() {
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
  state.settings.geminiApiKey = document.getElementById('gemini-api-key')?.value?.trim() || '';
  state.settings.geminiModel = document.getElementById('gemini-model')?.value?.trim() || 'gemini-1.5-pro';
  state.settings.openaiApiKey = document.getElementById('openai-api-key')?.value?.trim() || '';
  state.settings.openaiVideoModel = document.getElementById('openai-video-model')?.value?.trim() || 'sora-2';
  state.settings.openaiTtsModel = document.getElementById('openai-tts-model')?.value?.trim() || 'gpt-4o-mini-tts';
  state.settings.openaiVoiceId = document.getElementById('openai-voice-id')?.value?.trim() || '';
  state.settings.lipSyncProvider = document.getElementById('lipsync-provider')?.value || 'sync-labs';
  state.settings.lipSyncApiKey = document.getElementById('lipsync-api-key')?.value?.trim() || '';
  state.settings.lipSyncEndpoint = document.getElementById('lipsync-endpoint')?.value?.trim() || '';
  localStorage.setItem('rf_settings', JSON.stringify(state.settings));
  syncGeminiGlobals();
  updateEditorEngineStatus();
  renderAiVideoStatus();
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
        <span style="margin-left:auto;font-size:11px;color:var(--text-muted)">${acc.platform === 'ig' ? 'Instagram' : 'TikTok'}</span>
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
        <div class="activity-icon">${h.platform === 'ig' ? '▶' : h.platform === 'ai' ? '▣' : '◆'}</div>
        <div class="activity-text">${h.type === 'format' ? 'Ediciones generadas' : h.type === 'ai-video' ? 'Borrador de video IA' : 'Reel publicado'} · ${h.account || h.filename || ''}</div>
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
    <span class="badge badge-active" style="font-size:10px">${acc.platform === 'ig' ? '📸' : '🎵'} ${acc.username}</span>
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

function connectTikTok() {
  const key = document.getElementById('tt-client-key').value.trim();

  if (!key) { toast('Completá el TikTok Client Key', 'error'); return; }

  const oauthState = crypto.randomUUID ? crypto.randomUUID() : String(Date.now());
  const callbackUrl = getTikTokCallbackUrl();
  const authUrl = new URL('https://www.tiktok.com/v2/auth/authorize/');

  authUrl.searchParams.set('client_key', key);
  authUrl.searchParams.set('scope', TIKTOK_SCOPES);
  authUrl.searchParams.set('response_type', 'code');
  authUrl.searchParams.set('redirect_uri', callbackUrl);
  authUrl.searchParams.set('state', oauthState);
  authUrl.searchParams.set('disable_auto_auth', '1');

  localStorage.setItem('rf_tt_client_key', key);
  localStorage.setItem('rf_tt_oauth_state', oauthState);
  localStorage.setItem('rf_tt_callback_url', callbackUrl);

  window.location.href = authUrl.toString();
}

function saveTikTokAccount() {
  const username = document.getElementById('modal-tt-user').value.trim();
  const token    = document.getElementById('modal-tt-token').value.trim();

  if (!username || !token) { toast('Completá todos los campos', 'error'); return; }

  const expiry = new Date();
  expiry.setDate(expiry.getDate() + 1); // TikTok: 24h, con refresh

  const account = {
    id:       `tt_${Date.now()}`,
    platform: 'tt',
    username,
    token,
    expiresAt: expiry.toISOString(),
    connectedAt: new Date().toISOString(),
  };

  state.accounts.push(account);
  saveAccounts();
  closeModal();
  renderTTAccounts();
  renderConnectedBadges();
  toast(`Cuenta @${username} conectada`, 'success');

  document.getElementById('tt-status').innerHTML = `<span class="badge badge-active">Conectado</span>`;
  document.getElementById('platform-tiktok').classList.add('connected');
}

function removeAccount(id) {
  state.accounts = state.accounts.filter(a => a.id !== id);
  saveAccounts();
  renderIGAccounts();
  renderTTAccounts();
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

function renderTTAccounts() {
  const list = document.getElementById('tt-accounts-list');
  const ttAccounts = state.accounts.filter(a => a.platform === 'tt');
  if (ttAccounts.length === 0) { list.innerHTML = ''; return; }

  list.innerHTML = ttAccounts.map(acc => `
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

  document.getElementById('tt-status').innerHTML = `<span class="badge badge-active">${ttAccounts.length} cuenta(s)</span>`;
  document.getElementById('platform-tiktok').classList.add('connected');
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
        <div class="account-item-meta">${acc.platform === 'ig' ? 'Instagram' : 'TikTok'}</div>
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
        privacyLevel: document.getElementById('tiktok-privacy')?.value || 'SELF_ONLY',
      };
      const data = acc.platform === 'tt'
        ? await publishTikTokReel(acc, payload, status)
        : await publishInstagramReel(acc, payload, status);
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

async function publishTikTokReel(account, payload, statusEl) {
  const grantedScopes = String(account.scope || '');
  if (!grantedScopes.includes('video.publish')) {
    throw new Error(`Reconectá ${account.username} con el permiso video.publish antes de publicar en TikTok.`);
  }

  statusEl.textContent = `Publicando automáticamente en ${account.username}...`;

  const response = await fetch('/api/tiktok/publish', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      accessToken: account.token,
      videoUrl: payload.videoUrl,
      caption: payload.caption,
      thumbOffset: payload.thumbOffset,
      privacyLevel: payload.privacyLevel,
    }),
  });
  const data = await response.json();

  if (!response.ok || !data.ok) {
    throw new Error(data.error || 'No se pudo publicar en TikTok.');
  }

  return data;
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
function handleEditorUpload(event) {
  const file = Array.from(event.target.files).find(f => f.type.startsWith('video/'));
  if (!file) return;
  state.editorVideos = [file];
  renderEditorVideos();
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

function renderEditorVideos() {
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

function removeEditorVideo(i) {
  state.editorVideos.splice(i, 1);
  renderEditorVideos();
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

  const validKeys = new Set(LOCAL_VIDEO_TEMPLATES.map(template => template.key));
  state.selectedTemplates = new Set([...state.selectedTemplates].filter(key => validKeys.has(key)));

  grid.innerHTML = LOCAL_VIDEO_TEMPLATES.map(template => {
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
  state.selectedTemplates = new Set(LOCAL_VIDEO_TEMPLATES.map(template => template.key));
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
  const selectedEl = document.getElementById('selected-formats-count');
  const totalEl = document.getElementById('total-formats-count');
  const genCount = document.getElementById('gen-count');

  if (selectedEl) selectedEl.textContent = selected;
  if (totalEl) totalEl.textContent = LOCAL_VIDEO_TEMPLATES.length;
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
      ? 'Gemini analiza transcripcion, estructura y formatos automaticos antes de renderizar localmente.'
      : 'Gemini se activa desde Configuración. Si no hay API key, ReelFlow usa el análisis local.';
  }
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
  const result = await ffmpeg.exec(args);
  if (result !== 0) throw new Error(errorMessage);
  return result;
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
Actuá como un editor de Reels/TikTok. Analizá el video base y el video ejemplar para crear un plan de edición aplicable con FFmpeg.

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
  statusEl.textContent = 'Cargando FFmpeg.wasm por primera vez...';

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

async function generateAutomaticFormats() {
  const btn = document.getElementById('generate-btn');
  const results = document.getElementById('generated-results');
  const statusEl = document.getElementById('editor-render-status');
  const baseVideo = state.editorVideos[0];
  const resultIds = new Map();

  syncGeminiGlobals();
  const runtime = await loadFFmpeg(statusEl);
  const { runFormatEngine } = await import('/src/engine/formatEngine.js');

  state.generatedVideos.forEach(video => URL.revokeObjectURL(video.url));
  state.generatedVideos = [];
  results.innerHTML = `<div class="render-status" id="editor-render-status">Analizando video con Gemini...</div>`;

  const engineResult = await runFormatEngine(baseVideo, {
    apiKey: getGeminiApiKey(),
    model: getGeminiModel(),
    render: true,
    maxFormats: Math.min(8, Math.max(1, state.selectedTemplates.size || 3)),
    ffmpeg: runtime.instance,
    fetchFile: runtime.fetchFile,
    onProgress: event => {
      if (event.message) {
        const liveStatus = document.getElementById('editor-render-status');
        if (liveStatus) liveStatus.textContent = event.message;
      }
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
  });

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
  toast(`${engineResult.renders.length} formato(s) automaticos generados`, 'success');
}

async function generateFormats() {
  if (state.editorVideos.length === 0) { toast('Subí tu video base', 'error'); return; }
  const selectedTemplates = getSelectedTemplates();
  if (selectedTemplates.length === 0) { toast('Seleccioná al menos un formato de Instagram', 'error'); return; }

  const btn = document.getElementById('generate-btn');
  const selectedReferences = state.referenceVideos.filter(ref => state.selectedReferences.has(ref.id));
  const referenceMetas = new Map();
  btn.disabled = true;
  btn.innerHTML = `<span class="spinner"></span> Procesando ${selectedTemplates.length} formato(s)...`;

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
//  AI VIDEO CREATOR
// ═══════════════════════════════════════════════════════════
function handleAiPhotoUpload(event) {
  const file = event.target.files?.[0];
  if (!file) return;

  if (!file.type.startsWith('image/')) {
    toast('Subí una imagen válida', 'error');
    return;
  }

  if (state.aiVideoPhotoUrl) URL.revokeObjectURL(state.aiVideoPhotoUrl);
  state.aiVideoPhoto = file;
  state.aiVideoPhotoUrl = URL.createObjectURL(file);
  renderAiPhotoPreview();
  renderAiVideoStatus();
}

function renderAiPhotoPreview() {
  const container = document.getElementById('ai-photo-preview');
  if (!container || !state.aiVideoPhoto) return;

  container.innerHTML = `
    <div class="ai-asset-card">
      <img src="${state.aiVideoPhotoUrl}" alt="Foto de referencia" />
      <div class="ai-asset-info">
        <strong>${escapeHtml(state.aiVideoPhoto.name)}</strong>
        <span>${formatBytes(state.aiVideoPhoto.size)}</span>
      </div>
      <button class="btn btn-ghost btn-sm" onclick="clearAiPhoto()">Quitar</button>
    </div>
  `;
}

function clearAiPhoto() {
  if (state.aiVideoPhotoUrl) URL.revokeObjectURL(state.aiVideoPhotoUrl);
  state.aiVideoPhoto = null;
  state.aiVideoPhotoUrl = '';
  const input = document.getElementById('ai-photo-input');
  const preview = document.getElementById('ai-photo-preview');
  if (input) input.value = '';
  if (preview) preview.innerHTML = '';
  renderAiVideoStatus();
}

function handleAiVoiceSampleUpload(event) {
  const file = event.target.files?.[0];
  if (!file) return;

  if (!file.type.startsWith('audio/') && !file.type.startsWith('video/')) {
    toast('Subí un audio o video válido', 'error');
    return;
  }

  state.aiVoiceSample = file;
  const preview = document.getElementById('ai-voice-preview');
  if (preview) {
    preview.innerHTML = `
      <div class="ai-asset-card compact">
        <div class="ai-asset-icon">◍</div>
        <div class="ai-asset-info">
          <strong>${escapeHtml(file.name)}</strong>
          <span>${formatBytes(file.size)} · ${escapeHtml(file.type || 'archivo de voz')}</span>
        </div>
        <button class="btn btn-ghost btn-sm" onclick="clearAiVoiceSample()">Quitar</button>
      </div>
    `;
  }
  renderAiVideoStatus();
}

function clearAiVoiceSample() {
  state.aiVoiceSample = null;
  const input = document.getElementById('ai-voice-sample-input');
  const preview = document.getElementById('ai-voice-preview');
  if (input) input.value = '';
  if (preview) preview.innerHTML = '';
  renderAiVideoStatus();
}

function getAiInputValue(id) {
  return document.getElementById(id)?.value?.trim() || '';
}

function getAiVideoBrief() {
  return {
    idea: getAiInputValue('ai-video-idea'),
    dialogue: getAiInputValue('ai-video-dialogue'),
    people: getAiInputValue('ai-video-people'),
    location: getAiInputValue('ai-video-location'),
    clothing: getAiInputValue('ai-video-clothing'),
    action: getAiInputValue('ai-video-action'),
    topic: getAiInputValue('ai-video-topic'),
    cta: getAiInputValue('ai-video-cta'),
    ratio: getAiInputValue('ai-video-ratio') || 'vertical 9:16',
    duration: getAiInputValue('ai-video-duration') || '8 segundos',
    quality: getAiInputValue('ai-video-quality') || 'look 4K, nitido, cinematico, piel natural',
    camera: getAiInputValue('ai-video-camera'),
    voiceMode: getAiInputValue('ai-voice-mode') || 'configured',
    voiceTone: getAiInputValue('ai-voice-tone') || 'natural vendedor',
  };
}

function buildAiVideoPrompt() {
  const brief = getAiVideoBrief();
  if (!brief.idea && !brief.dialogue) {
    toast('Completá la idea principal o el texto que debe decir', 'error');
    return '';
  }

  const voiceInstruction = {
    configured: state.settings.openaiVoiceId
      ? `Usar Voice ID personalizada "${state.settings.openaiVoiceId}" con tono ${brief.voiceTone}.`
      : `Usar una voz personalizada autorizada con tono ${brief.voiceTone}. Falta configurar Voice ID.`,
    sample: state.aiVoiceSample
      ? `Crear o usar voz personalizada a partir de la muestra adjunta "${state.aiVoiceSample.name}", solo si existe consentimiento del propietario. Tono ${brief.voiceTone}.`
      : `Crear o usar voz personalizada con muestra autorizada. Falta adjuntar audio/video de referencia. Tono ${brief.voiceTone}.`,
    neutral: `Usar una voz IA predeterminada, clara y natural, con tono ${brief.voiceTone}.`,
  }[brief.voiceMode] || `Usar voz natural con tono ${brief.voiceTone}.`;

  const prompt = [
    `Crear un video ${brief.ratio} de ${brief.duration} usando la imagen de referencia como base visual.`,
    '',
    'Objetivo del video:',
    brief.idea || 'No especificado.',
    '',
    'Personas / personaje:',
    brief.people || 'Usar el sujeto principal de la foto de referencia.',
    '',
    'Escena y estilo:',
    `Lugar: ${brief.location || 'fondo limpio y realista.'}`,
    `Vestimenta: ${brief.clothing || 'coherente con la foto y el contexto.'}`,
    `Accion: ${brief.action || 'hablar a camara con gestos naturales.'}`,
    `Camara: ${brief.camera || 'plano medio, mirada a camara, movimiento suave.'}`,
    `Calidad: ${brief.quality}. Evitar deformaciones de rostro, manos, dientes o texto ilegible.`,
    '',
    'Guion / dialogo:',
    brief.dialogue || `Hablar sobre ${brief.topic || 'el tema principal'} de forma clara, breve y convincente.`,
    '',
    'Tema central:',
    brief.topic || 'No especificado.',
    '',
    'Llamado a la accion:',
    brief.cta || 'Cerrar con una invitacion clara a comentar, escribir por DM o seguir la cuenta.',
    '',
    'Voz:',
    voiceInstruction,
    '',
    'Lip-sync:',
    `Sincronizar labios con el audio final usando ${state.settings.lipSyncProvider || 'proveedor de lip-sync'} y conservar expresiones naturales.`,
    '',
    'Postproduccion:',
    'Agregar subtitulos legibles, ritmo dinamico, audio limpio, color natural, nitidez alta y export MP4 listo para reels.',
  ].join('\n');

  const output = document.getElementById('ai-video-prompt-output');
  if (output) output.value = prompt;
  renderAiVideoStatus();
  toast('Prompt avanzado generado', 'success');
  return prompt;
}

function copyAiVideoPrompt() {
  const output = document.getElementById('ai-video-prompt-output');
  if (!output?.value) {
    toast('Primero generá el prompt', 'error');
    return;
  }
  navigator.clipboard.writeText(output.value).then(() => toast('Prompt copiado', 'success'));
}

function saveAiVideoDraft() {
  const prompt = document.getElementById('ai-video-prompt-output')?.value || buildAiVideoPrompt();
  if (!prompt) return;

  state.history.push({
    id: 'ai_' + Date.now(),
    type: 'ai-video',
    platform: 'ai',
    status: 'draft',
    filename: state.aiVideoPhoto?.name || 'Video IA',
    prompt,
    date: new Date().toISOString(),
  });
  saveHistory();
  renderDashboard();
  toast('Borrador de video IA guardado', 'success');
}

function renderAiVideoStatus() {
  const status = document.getElementById('ai-video-status');
  if (!status) return;

  const voiceMode = getAiInputValue('ai-voice-mode') || 'configured';
  const checks = [
    state.aiVideoPhoto ? 'foto lista' : 'falta foto',
    state.settings.openaiApiKey ? 'OpenAI configurado' : 'falta OpenAI API key',
    state.settings.openaiVoiceId || state.aiVoiceSample || voiceMode === 'neutral' ? 'voz lista' : 'falta voz o Voice ID',
    state.settings.lipSyncApiKey || state.settings.lipSyncEndpoint ? 'lip-sync configurado' : 'falta lip-sync',
  ];

  const ready = state.aiVideoPhoto
    && state.settings.openaiApiKey
    && (state.settings.openaiVoiceId || state.aiVoiceSample || voiceMode === 'neutral')
    && (state.settings.lipSyncApiKey || state.settings.lipSyncEndpoint);

  status.className = `ai-editor-note ${ready ? 'success' : ''}`;
  status.textContent = ready
    ? `Pipeline listo: ${checks.join(' · ')}. El backend puede generar guion, voz, lip-sync y render final.`
    : `Estado: ${checks.join(' · ')}.`;
}

// ═══════════════════════════════════════════════════════════
//  HISTORY
// ═══════════════════════════════════════════════════════════
function renderHistory() {
  const tbody = document.getElementById('history-tbody');
  const filter = document.getElementById('history-filter').value;

  let items = state.history;
  if (filter === 'instagram') items = items.filter(h => h.platform === 'ig');
  if (filter === 'tiktok')    items = items.filter(h => h.platform === 'tt');
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
    'ai-video': 'Video IA',
  };
  const platformMap = {
    ig: 'Instagram',
    tt: 'TikTok',
    ai: 'Crear IA',
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
  const geminiKeyInput = document.getElementById('gemini-api-key');
  const geminiModelInput = document.getElementById('gemini-model');
  if (geminiKeyInput) geminiKeyInput.value = state.settings.geminiApiKey || '';
  if (geminiModelInput) geminiModelInput.value = state.settings.geminiModel || 'gemini-1.5-pro';
  const openaiKeyInput = document.getElementById('openai-api-key');
  const openaiVideoModelInput = document.getElementById('openai-video-model');
  const openaiTtsModelInput = document.getElementById('openai-tts-model');
  const openaiVoiceInput = document.getElementById('openai-voice-id');
  const lipSyncProviderInput = document.getElementById('lipsync-provider');
  const lipSyncKeyInput = document.getElementById('lipsync-api-key');
  const lipSyncEndpointInput = document.getElementById('lipsync-endpoint');
  if (openaiKeyInput) openaiKeyInput.value = state.settings.openaiApiKey || '';
  if (openaiVideoModelInput) openaiVideoModelInput.value = state.settings.openaiVideoModel || 'sora-2';
  if (openaiTtsModelInput) openaiTtsModelInput.value = state.settings.openaiTtsModel || 'gpt-4o-mini-tts';
  if (openaiVoiceInput) openaiVoiceInput.value = state.settings.openaiVoiceId || '';
  if (lipSyncProviderInput) lipSyncProviderInput.value = state.settings.lipSyncProvider || 'sync-labs';
  if (lipSyncKeyInput) lipSyncKeyInput.value = state.settings.lipSyncApiKey || '';
  if (lipSyncEndpointInput) lipSyncEndpointInput.value = state.settings.lipSyncEndpoint || '';
  updateEditorEngineStatus();
  renderAiVideoStatus();

  // Tokens list
  const list = document.getElementById('tokens-list');
  if (state.accounts.length === 0) {
    list.innerHTML = `<div class="empty-state-small"><p>No hay tokens guardados.</p></div>`;
  } else {
    list.innerHTML = state.accounts.map(acc => `
      <div class="token-item">
        <div>
          <div class="token-platform">${acc.platform === 'ig' ? '📸 Instagram' : '🎵 TikTok'} · ${acc.username}</div>
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
setupDragDrop('editor-upload-zone', 'editor-video-input', handleEditorUpload);
setupDragDrop('reference-upload-zone', 'reference-video-input', handleReferenceUpload);
setupTypedFileDrop('ai-photo-upload-zone', handleAiPhotoUpload, file => file.type.startsWith('image/'));
setupTypedFileDrop('ai-voice-upload-zone', handleAiVoiceSampleUpload, file => file.type.startsWith('audio/') || file.type.startsWith('video/'));

function setupInstagramOAuthFields() {
  const callbackInput = document.getElementById('ig-callback');
  const scopesInput = document.getElementById('ig-scopes');
  const appIdInput = document.getElementById('ig-app-id');

  if (callbackInput) callbackInput.value = getInstagramCallbackUrl();
  if (scopesInput) scopesInput.value = INSTAGRAM_SCOPES;
  if (appIdInput) appIdInput.value = localStorage.getItem('rf_ig_app_id') || INSTAGRAM_APP_ID;
}

function setupTikTokOAuthFields() {
  const callbackInput = document.getElementById('tt-callback');
  const scopesInput = document.getElementById('tt-scopes');
  const clientKeyInput = document.getElementById('tt-client-key');

  if (callbackInput) callbackInput.value = getTikTokCallbackUrl();
  if (scopesInput) scopesInput.value = TIKTOK_SCOPES;
  if (clientKeyInput) clientKeyInput.value = localStorage.getItem('rf_tt_client_key') || TIKTOK_CLIENT_KEY;
}

function setupAiVideoCreatorEvents() {
  const voiceMode = document.getElementById('ai-voice-mode');
  if (voiceMode) voiceMode.addEventListener('change', renderAiVideoStatus);
}

// ═══════════════════════════════════════════════════════════
//  INIT
// ═══════════════════════════════════════════════════════════
function init() {
  syncGeminiGlobals();
  setupInstagramOAuthFields();
  setupTikTokOAuthFields();
  setupAiVideoCreatorEvents();

  // Restore accounts
  renderIGAccounts();
  renderTTAccounts();

  // Initial page
  navigateTo('dashboard');

  // Update editor counters
  updateReferenceCount();

  console.log('%c ReelFlow v1.0 ', 'background:#7c6dfa;color:white;padding:4px 8px;border-radius:4px;font-family:monospace;font-weight:bold');
  console.log('Frontend scaffold listo. Conectá el backend en:', state.settings.backendUrl);
}

init();
