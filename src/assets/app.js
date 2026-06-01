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
  selectedTemplates: new Set(['hook-reveal']),
  selectedAccounts: new Set(),
  pubType: 'reel',
  scheduleType: 'now',
};

const PUBLIC_ORIGIN = 'https://reelflow-topaz.vercel.app';
const INSTAGRAM_APP_ID = '1428803625601557';
const INSTAGRAM_SCOPES = 'instagram_business_basic,instagram_business_content_publish';

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
  state.settings.creatomateKey = document.getElementById('settings-creatomate').value;
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
  const key    = document.getElementById('tt-client-key').value.trim();
  const secret = document.getElementById('tt-client-secret').value.trim();

  if (!key || !secret) { toast('Completá el Client Key y Client Secret', 'error'); return; }

  localStorage.setItem('rf_tt_creds', JSON.stringify({ key, secret }));

  openModal('Conectar TikTok', `
    <p style="color:var(--text-2);font-size:14px;margin-bottom:20px">
      En producción, esto abrirá el popup de autorización de TikTok.<br><br>
      Para pruebas, ingresá los datos manualmente:
    </p>
    <div class="form-group">
      <label>Nombre de usuario</label>
      <input type="text" class="form-input" id="modal-tt-user" placeholder="@tuusuario" />
    </div>
    <div class="form-group">
      <label>Access Token</label>
      <input type="text" class="form-input" id="modal-tt-token" placeholder="act.xxx..." />
    </div>
    <button class="btn btn-primary btn-full" style="margin-top:8px" onclick="saveTikTokAccount()">
      Guardar cuenta
    </button>
  `);
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
  if (state.pubType === 'draft') { toast('Instagram no permite crear drafts por API en este flujo', 'error'); return; }

  const btn = document.getElementById('publish-btn');
  const status = document.getElementById('publish-status');
  btn.disabled = true;
  btn.innerHTML = '<span class="spinner"></span> Publicando...';
  status.className = 'publish-status loading';
  status.textContent = videoUrl ? 'Creando contenedor de Instagram...' : 'Subiendo video a storage...';

  const accounts = state.accounts.filter(a => state.selectedAccounts.has(a.id) && a.platform === 'ig');
  const results = [];

  try {
    if (!videoUrl) {
      videoUrl = await uploadVideoToStorage(state.selectedVideo, status);
      videoUrlInput.value = videoUrl;
    }

    for (const acc of accounts) {
      status.textContent = `Publicando en ${acc.username}...`;
      const response = await fetch('/api/instagram/publish', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          igUserId: acc.igUserId || acc.id,
          accessToken: acc.token,
          videoUrl,
          caption,
          thumbOffset,
        }),
      });
      const data = await response.json();
      if (!response.ok || !data.ok) throw new Error(data.error || 'No se pudo publicar el Reel.');
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
    status.textContent = `✓ Publicado en ${results.length} cuenta(s)`;
    toast('Reel publicado correctamente', 'success');
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

async function uploadVideoToStorage(file, statusEl) {
  if (!file) throw new Error('Seleccioná un video primero.');

  const status = await fetch('/api/blob/status').then(res => res.json()).catch(() => null);
  if (!status?.configured) {
    throw new Error('Falta configurar BLOB_READ_WRITE_TOKEN en Vercel Blob.');
  }

  const { upload } = await import('https://esm.sh/@vercel/blob@2.4.0/client');
  const pathname = `reels/${Date.now()}-${file.name.replace(/[^a-z0-9._-]/gi, '-')}`;
  const blob = await upload(pathname, file, {
    access: 'public',
    contentType: file.type || 'video/mp4',
    handleUploadUrl: '/api/blob/upload',
    multipart: true,
    onUploadProgress: ({ percentage }) => {
      const progress = Math.round(percentage);
      statusEl.textContent = progress >= 100
        ? 'Finalizando subida del video...'
        : `Subiendo video a storage... ${progress}%`;
    },
  });

  if (!blob?.url) throw new Error('No se pudo obtener la URL pública del video.');
  statusEl.textContent = 'Video subido. Preparando publicación en Instagram...';
  return blob.url;
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

// ═══════════════════════════════════════════════════════════
//  EDITOR
// ═══════════════════════════════════════════════════════════
function handleEditorUpload(event) {
  const files = Array.from(event.target.files);
  state.editorVideos = [...state.editorVideos, ...files];
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

function toggleTemplate(el) {
  const key = el.dataset.template;
  if (state.selectedTemplates.has(key)) {
    state.selectedTemplates.delete(key);
    el.classList.remove('selected');
  } else {
    if (state.selectedTemplates.size >= 15) { toast('Máximo 15 formatos', 'error'); return; }
    state.selectedTemplates.add(key);
    el.classList.add('selected');
  }
  updateTemplateCount();
}

function selectAllTemplates() {
  document.querySelectorAll('.template-card').forEach(el => {
    state.selectedTemplates.add(el.dataset.template);
    el.classList.add('selected');
  });
  updateTemplateCount();
}

function clearTemplates() {
  state.selectedTemplates.clear();
  document.querySelectorAll('.template-card').forEach(el => el.classList.remove('selected'));
  updateTemplateCount();
}

function updateTemplateCount() {
  const c = state.selectedTemplates.size;
  document.getElementById('selected-templates-count').textContent = c;
  document.getElementById('gen-count').textContent = c;
}

async function generateFormats() {
  if (state.editorVideos.length === 0) { toast('Subí al menos un video', 'error'); return; }
  if (state.selectedTemplates.size === 0) { toast('Seleccioná al menos un formato', 'error'); return; }

  const btn = document.getElementById('generate-btn');
  btn.disabled = true;
  btn.innerHTML = `<span class="spinner"></span> Generando ${state.selectedTemplates.size} formato(s)...`;

  // Show results step
  document.getElementById('editor-step-4').style.display = 'block';
  const results = document.getElementById('generated-results');
  results.innerHTML = '';

  const templates = Array.from(state.selectedTemplates);
  const templateNames = {
    'hook-reveal':           'Hook + Reveal',
    'kinetic-subs':          'Subtítulos Cinéticos',
    'split-screen':          'Split Screen',
    'minimal-text':          'Texto Minimalista',
    'before-after':          'Before / After',
    'slideshow':             'Slideshow Viral',
    'countdown':             'Countdown / Lista',
    'zoom-text':             'Zoom + Texto Bold',
    'duet-style':            'Estilo Duet',
    'trending-font':         'POV / Trending Font',
    'glitch-transition':     'Glitch Transition',
    'square-format':         'Formato Cuadrado',
    'landscape':             'Formato Landscape',
    'text-overlay-gradient': 'Overlay Gradiente',
    'story-style':           'Estilo Story',
  };

  // Simulate rendering one by one (Creatomate API call per template)
  for (let i = 0; i < templates.length; i++) {
    const key  = templates[i];
    const name = templateNames[key] || key;

    await sleep(600 + Math.random() * 400);

    const item = document.createElement('div');
    item.className = 'result-item generating-item';
    item.style.animationDelay = `${i * 0.05}s`;
    item.innerHTML = `
      <div class="result-thumb">◧</div>
      <div class="result-info">
        <div class="result-name">${name}</div>
        <div class="result-actions">
          <button class="btn btn-outline btn-sm" onclick="toast('Descarga lista cuando el backend esté activo','success')">↓ Descargar</button>
          <button class="btn btn-ghost btn-sm" onclick="toast('Publicar desde el backend','success')">◆ Publicar</button>
        </div>
      </div>
    `;
    results.appendChild(item);

    // Log to history
    state.history.push({
      id: `fmt_${Date.now()}_${i}`,
      type: 'format',
      template: key,
      filename: state.editorVideos[0].name,
      status: 'ready',
      date: new Date().toISOString(),
    });
  }

  saveHistory();

  btn.disabled = false;
  btn.innerHTML = `<span>◧</span> Generar <span id="gen-count">${state.selectedTemplates.size}</span> formato(s)`;
  toast(`${templates.length} formato(s) generado(s)`, 'success');
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
    draft:     '<span class="badge badge-pending">Borrador</span>',
    ready:     '<span class="badge badge-active">Listo</span>',
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
  if (state.settings.creatomateKey) document.getElementById('settings-creatomate').value = state.settings.creatomateKey;

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
  setupInstagramOAuthFields();

  // Restore accounts
  renderIGAccounts();
  renderTTAccounts();

  // Initial page
  navigateTo('dashboard');

  // Update template count
  updateTemplateCount();

  console.log('%c ReelFlow v1.0 ', 'background:#7c6dfa;color:white;padding:4px 8px;border-radius:4px;font-family:monospace;font-weight:bold');
  console.log('Frontend scaffold listo. Conectá el backend en:', state.settings.backendUrl);
}

init();
