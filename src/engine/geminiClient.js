const GEMINI_BASE_URL = 'https://generativelanguage.googleapis.com/v1beta';
const DEFAULT_RETRY_COUNT = 2;
const DEFAULT_RETRY_DELAY_MS = 900;

const TRANSIENT_ERROR_PATTERNS = [
  /high demand/i,
  /overloaded/i,
  /temporar/i,
  /try again/i,
  /unavailable/i,
  /resource exhausted/i,
  /rate limit/i,
  /quota exceeded/i,
  /too many requests/i,
];

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function uniqueValues(values) {
  return Array.from(new Set(values.map(value => String(value || '').trim()).filter(Boolean)));
}

export function normalizeGeminiModels(primaryModel, fallbackModels = []) {
  const configuredFallbacks = Array.isArray(fallbackModels)
    ? fallbackModels
    : String(fallbackModels || '').split(',');
  return uniqueValues([primaryModel, ...configuredFallbacks]);
}

export function isRetryableGeminiError(status, message = '') {
  if ([408, 409, 429, 500, 502, 503, 504].includes(Number(status))) return true;
  return TRANSIENT_ERROR_PATTERNS.some(pattern => pattern.test(String(message || '')));
}

function getPayloadMessage(payload, fallback) {
  return payload?.error?.message || payload?.error?.status || fallback;
}

function getRetryDelayMs(response, attempt) {
  const retryAfter = Number(response?.headers?.get?.('retry-after') || 0);
  if (Number.isFinite(retryAfter) && retryAfter > 0) return retryAfter * 1000;
  return DEFAULT_RETRY_DELAY_MS * (attempt + 1);
}

export async function generateGeminiContent({
  apiKey,
  model,
  fallbackModels = [],
  body,
  retries = DEFAULT_RETRY_COUNT,
  onProgress,
  step = 'gemini',
  purpose = 'Gemini',
}) {
  const models = normalizeGeminiModels(model, fallbackModels);
  if (!apiKey) throw new Error('Falta configurar GEMINI_API_KEY.');
  if (models.length === 0) throw new Error('Falta configurar el modelo de Gemini.');

  let lastError = null;

  for (let modelIndex = 0; modelIndex < models.length; modelIndex += 1) {
    const activeModel = models[modelIndex];
    const endpoint = `${GEMINI_BASE_URL}/models/${encodeURIComponent(activeModel)}:generateContent`;

    for (let attempt = 0; attempt <= retries; attempt += 1) {
      if (modelIndex > 0 || attempt > 0) {
        onProgress?.({
          step,
          model: activeModel,
          message: `${purpose}: reintentando con ${activeModel}...`,
        });
      }

      let response;
      let payload;
      try {
        response = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-goog-api-key': apiKey,
          },
          body: JSON.stringify(body),
        });
        payload = await response.json().catch(() => null);
      } catch (error) {
        lastError = error;
        if (attempt < retries) {
          await sleep(DEFAULT_RETRY_DELAY_MS * (attempt + 1));
          continue;
        }
        break;
      }

      if (response.ok) return { payload, model: activeModel };

      const message = getPayloadMessage(payload, `${purpose} no pudo completar la solicitud.`);
      lastError = new Error(message);
      const retryable = isRetryableGeminiError(response.status, message);
      if (!retryable) throw lastError;

      if (attempt < retries) {
        await sleep(getRetryDelayMs(response, attempt));
        continue;
      }

      break;
    }
  }

  throw lastError || new Error(`${purpose} no pudo completar la solicitud.`);
}
