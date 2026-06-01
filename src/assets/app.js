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
  referenceVideos: [],
  selectedReferences: new Set(),
  generatedVideos: [],
  selectedAccounts: new Set(),
  pubType: 'reel',
  scheduleType: 'now',
  ffmpeg: {
    instance: null,
    fetchFile: null,
    loaded: false,
    loading: false,
    activeStatusId: null,
  },
};

const PUBLIC_ORIGIN = 'https://reelflow-topaz.vercel.app';
const INSTAGRAM_APP_ID = '1428803625601557';
const INSTAGRAM_SCOPES = 'instagram_business_basic,instagram_business_content_publish';
const TIKTOK_CLIENT_KEY = 'sbaw89mga3yconmz26';
const TIKTOK_SCOPES = 'user.info.basic,video.publish';
const FFMPEG_CORE_VERSION = '0.12.10';

const LOCAL_VIDEO_TEMPLATES = [
  {
    key: 'vertical-crop',
    name: 'Reels 9:16',
    desc: 'Recorte vertical centrado para Instagram y TikTok',
    tags: ['9:16', 'Reels'],
    preview: 'mock-story',
    command: (input, output) => ffmpegVideoFilterCommand(input, output, 'scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920'),
  },
  {
    key: 'vertical-fit',
    name: '9:16 sin recorte',
    desc: 'Ajusta el video completo con fondo negro',
    tags: ['9:16', 'Fit'],
    preview: 'mock-square',
    command: (input, output) => ffmpegVideoFilterCommand(input, output, 'scale=1080:1920:force_original_aspect_ratio=decrease,pad=1080:1920:(ow-iw)/2:(oh-ih)/2:black'),
  },
  {
    key: 'blur-bg',
    name: 'Blur Background',
    desc: 'Fondo desenfocado con el video encima',
    tags: ['9:16', 'Blur'],
    preview: 'mock-gradient-overlay',
    command: (input, output) => ffmpegComplexCommand(input, output, '[0:v]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,boxblur=18:1[bg];[0:v]scale=1080:1920:force_original_aspect_ratio=decrease[fg];[bg][fg]overlay=(W-w)/2:(H-h)/2[v]'),
  },
  {
    key: 'square-crop',
    name: 'Cuadrado 1:1',
    desc: 'Recorte cuadrado para feed',
    tags: ['1:1', 'Feed'],
    preview: 'mock-square',
    command: (input, output) => ffmpegVideoFilterCommand(input, output, 'scale=1080:1080:force_original_aspect_ratio=increase,crop=1080:1080'),
  },
  {
    key: 'square-fit',
    name: '1:1 con margen',
    desc: 'Video completo dentro de lienzo cuadrado',
    tags: ['1:1', 'Fit'],
    preview: 'mock-minimal',
    command: (input, output) => ffmpegVideoFilterCommand(input, output, 'scale=1080:1080:force_original_aspect_ratio=decrease,pad=1080:1080:(ow-iw)/2:(oh-ih)/2:black'),
  },
  {
    key: 'landscape',
    name: 'Horizontal 16:9',
    desc: 'Versión horizontal para YouTube o X',
    tags: ['16:9', 'Wide'],
    preview: 'mock-landscape',
    command: (input, output) => ffmpegVideoFilterCommand(input, output, 'scale=1920:1080:force_original_aspect_ratio=increase,crop=1920:1080'),
  },
  {
    key: 'white-frame',
    name: 'Marco Blanco',
    desc: 'Formato vertical con borde limpio',
    tags: ['9:16', 'Clean'],
    preview: 'mock-story',
    command: (input, output) => ffmpegVideoFilterCommand(input, output, 'scale=1000:1778:force_original_aspect_ratio=decrease,pad=1080:1920:(ow-iw)/2:(oh-ih)/2:white'),
  },
  {
    key: 'zoom-punch',
    name: 'Zoom Punch',
    desc: 'Zoom fijo para más impacto visual',
    tags: ['9:16', 'Impacto'],
    preview: 'mock-zoom',
    command: (input, output) => ffmpegVideoFilterCommand(input, output, 'scale=1188:2112:force_original_aspect_ratio=increase,crop=1080:1920'),
  },
  {
    key: 'mirror',
    name: 'Mirror',
    desc: 'Invierte horizontalmente el video',
    tags: ['9:16', 'Flip'],
    preview: 'mock-duet',
    command: (input, output) => ffmpegVideoFilterCommand(input, output, 'scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,hflip'),
  },
  {
    key: 'split-mirror',
    name: 'Split Mirror',
    desc: 'Dos mitades simétricas estilo reacción',
    tags: ['9:16', 'Split'],
    preview: 'mock-split',
    command: (input, output) => ffmpegComplexCommand(input, output, '[0:v]scale=540:1920:force_original_aspect_ratio=increase,crop=540:1920[left];[0:v]hflip,scale=540:1920:force_original_aspect_ratio=increase,crop=540:1920[right];[left][right]hstack=inputs=2[v]'),
  },
  {
    key: 'black-white',
    name: 'B/N',
    desc: 'Blanco y negro con recorte vertical',
    tags: ['9:16', 'B/N'],
    preview: 'mock-minimal',
    command: (input, output) => ffmpegVideoFilterCommand(input, output, 'scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,format=gray'),
  },
  {
    key: 'punchy-color',
    name: 'Color Punch',
    desc: 'Más contraste y saturación',
    tags: ['Color', 'Viral'],
    preview: 'mock-gradient-overlay',
    command: (input, output) => ffmpegVideoFilterCommand(input, output, 'scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,eq=contrast=1.18:saturation=1.18'),
  },
  {
    key: 'warm',
    name: 'Warm',
    desc: 'Look cálido para lifestyle',
    tags: ['Color', 'Warm'],
    preview: 'mock-trending',
    command: (input, output) => ffmpegVideoFilterCommand(input, output, 'scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,eq=saturation=1.1:gamma_r=1.08'),
  },
  {
    key: 'sharpen',
    name: 'Sharpen',
    desc: 'Más nitidez para clips comprimidos',
    tags: ['HD', 'Nitidez'],
    preview: 'mock-hook',
    command: (input, output) => ffmpegVideoFilterCommand(input, output, 'scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,unsharp=5:5:1.0:5:5:0.0'),
  },
  {
    key: 'fade-in',
    name: 'Fade In',
    desc: 'Entrada suave desde negro',
    tags: ['Intro', '9:16'],
    preview: 'mock-countdown',
    command: (input, output) => ffmpegVideoFilterCommand(input, output, 'scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,fade=t=in:st=0:d=0.6'),
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
  editor:    'Editor de Formatos',
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
  state.settings.backendUrl    = document.getElementById('backend-url').value;
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
        <div class="activity-icon">${h.platform === 'ig' ? '▶' : '◆'}</div>
        <div class="activity-text">${h.type === 'format' ? 'Formatos generados' : 'Reel publicado'} · ${h.account || ''}</div>
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
  renderReferenceVideos();
  updateReferenceCount();
}

function getReferenceTemplate(ref, index = 0) {
  const key = ref?.templateKey || LOCAL_VIDEO_TEMPLATES[index % LOCAL_VIDEO_TEMPLATES.length].key;
  return getTemplateByKey(key) || LOCAL_VIDEO_TEMPLATES[0];
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
    grid.innerHTML = `<div class="empty-reference-state">Agregá videos de referencia para crear modelos de edición.</div>`;
    updateReferenceCount();
    return;
  }

  grid.innerHTML = state.referenceVideos.map((ref, i) => {
    const selected = state.selectedReferences.has(ref.id);
    const template = getReferenceTemplate(ref, i);
    return `
      <div class="reference-card ${selected ? 'selected' : ''}" data-reference-id="${ref.id}" onclick="toggleReferenceVideo('${ref.id}')">
        <div class="reference-preview">
          <video src="${ref.previewUrl}" muted playsinline preload="metadata"></video>
        </div>
        <div class="reference-info">
          <div class="reference-name">${escapeHtml(ref.name)}</div>
          <div class="reference-meta">${(ref.size / 1024 / 1024).toFixed(1)} MB · ${escapeHtml(template.name)}</div>
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
  const genCount = document.getElementById('gen-count');

  if (selectedEl) selectedEl.textContent = selected;
  if (totalEl) totalEl.textContent = total;
  if (genCount) genCount.textContent = selected;
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

function getTemplateByKey(key) {
  return LOCAL_VIDEO_TEMPLATES.find(template => template.key === key);
}

function safeFilePart(value) {
  return String(value || 'video').replace(/\.[^.]+$/, '').replace(/[^a-z0-9._-]/gi, '-').slice(0, 80);
}

function renderPendingResult(reference, template, index) {
  const item = document.createElement('div');
  const id = `render_${Date.now()}_${index}`;
  item.className = 'result-item generating-item';
  item.id = id;
  item.innerHTML = `
    <div class="result-thumb">◧</div>
    <div class="result-info">
      <div class="result-name">Ref ${index + 1}: ${escapeHtml(reference.name)}</div>
      <div class="result-meta" id="${id}_status">En cola...</div>
      <div class="result-meta">Receta local: ${escapeHtml(template.name)}</div>
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

async function generateFormats() {
  if (state.editorVideos.length === 0) { toast('Subí tu video base', 'error'); return; }
  if (state.selectedReferences.size === 0) { toast('Seleccioná al menos un video de referencia', 'error'); return; }

  const btn = document.getElementById('generate-btn');
  const selectedReferences = state.referenceVideos.filter(ref => state.selectedReferences.has(ref.id));
  btn.disabled = true;
  btn.innerHTML = `<span class="spinner"></span> Procesando ${selectedReferences.length} referencia(s)...`;

  document.getElementById('editor-step-4').style.display = 'block';
  const results = document.getElementById('generated-results');
  results.innerHTML = `<div class="render-status" id="editor-render-status">Preparando motor local...</div>`;
  const statusEl = document.getElementById('editor-render-status');

  try {
    const runtime = await loadFFmpeg(statusEl);
    const ffmpeg = runtime.instance;
    const baseVideo = state.editorVideos[0];
    const inputName = `input-${Date.now()}.${baseVideo.name.split('.').pop() || 'mp4'}`;
    statusEl.textContent = 'Cargando video en memoria local...';
    await ffmpeg.writeFile(inputName, await runtime.fetchFile(baseVideo));

    state.generatedVideos.forEach(video => URL.revokeObjectURL(video.url));
    state.generatedVideos = [];
    results.innerHTML = '';

    for (let i = 0; i < selectedReferences.length; i++) {
      const reference = selectedReferences[i];
      const referenceIndex = state.referenceVideos.findIndex(ref => ref.id === reference.id);
      const template = getReferenceTemplate(reference, referenceIndex >= 0 ? referenceIndex : i);
      const resultId = renderPendingResult(reference, template, i);
      const outputName = `${safeFilePart(baseVideo.name)}-${safeFilePart(reference.name)}.mp4`;
      state.ffmpeg.activeStatusId = `${resultId}_status`;
      setRenderStatus(state.ffmpeg.activeStatusId, `Procesando referencia ${i + 1} de ${selectedReferences.length}...`);

      await ffmpeg.exec(template.command(inputName, outputName));
      const data = await ffmpeg.readFile(outputName);
      const blob = new Blob([data], { type: 'video/mp4' });
      const generated = {
        id: `gen_${Date.now()}_${i}`,
        template: template.key,
        name: reference.name,
        referenceId: reference.id,
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
        referenceFilename: reference.name,
        status: 'ready',
        date: new Date().toISOString(),
      });

      await ffmpeg.deleteFile(outputName).catch(() => {});
    }

    state.ffmpeg.activeStatusId = null;
    await ffmpeg.deleteFile(inputName).catch(() => {});

    saveHistory();
    toast(`${selectedReferences.length} referencia(s) procesada(s) en tu navegador`, 'success');
  } catch (error) {
    state.ffmpeg.activeStatusId = null;
    const message = getErrorMessage(error, 'No se pudo preparar el editor.');
    results.innerHTML = `<div class="render-status error">${escapeHtml(message)}</div>`;
    toast(message, 'error');
  } finally {
    btn.disabled = false;
    btn.innerHTML = `<span>◧</span> Generar <span id="gen-count">${state.selectedReferences.size}</span> modelo(s)`;
  }
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
    format:  'Formato',
  };

  tbody.innerHTML = items.slice().reverse().map(h => `
    <tr>
      <td style="color:var(--text-1);font-weight:500">${h.filename || h.template || '—'}</td>
      <td>${h.platform === 'ig' ? '📸 Instagram' : h.platform === 'tt' ? '🎵 TikTok' : '—'}</td>
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
  if (state.settings.backendUrl)    document.getElementById('backend-url').value = state.settings.backendUrl;

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

setupDragDrop('upload-zone', 'video-input', handleVideoUpload);
setupDragDrop('editor-upload-zone', 'editor-video-input', handleEditorUpload);
setupDragDrop('reference-upload-zone', 'reference-video-input', handleReferenceUpload);

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

// ═══════════════════════════════════════════════════════════
//  INIT
// ═══════════════════════════════════════════════════════════
function init() {
  setupInstagramOAuthFields();
  setupTikTokOAuthFields();

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
