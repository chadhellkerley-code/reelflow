import { generateGeminiContent } from './geminiClient.js';

const DEFAULT_GEMINI_MODEL = 'gemini-1.5-pro';
const DEFAULT_GEMINI_FALLBACK_MODELS = ['gemini-2.5-flash-lite', 'gemini-2.0-flash', 'gemini-1.5-flash'];
const INLINE_VIDEO_MAX_BYTES = 18 * 1024 * 1024;
const GEMINI_FILES_BASE_URL = 'https://generativelanguage.googleapis.com/v1beta';

// Reads a File/Blob and returns its base64 payload without the data URL prefix.
export function readVideoAsBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result || '');
      resolve(result.includes(',') ? result.split(',').pop() : result);
    };
    reader.onerror = () => reject(new Error('No se pudo leer el video para Gemini.'));
    reader.readAsDataURL(file);
  });
}

// Extracts a JSON object from Gemini text, even if a model adds accidental wrapping text.
export function parseGeminiJson(text, errorMessage = 'Gemini devolvio una respuesta sin JSON valido.') {
  const raw = String(text || '').trim();
  if (!raw) throw new Error(errorMessage);

  try {
    return JSON.parse(raw);
  } catch {
    const match = raw.match(/\{[\s\S]*\}/);
    if (!match) throw new Error(errorMessage);
    return JSON.parse(match[0]);
  }
}

// Normalizes Gemini transcription output to the exact shape used by the format engine.
export function normalizeTranscription(payload) {
  const words = Array.isArray(payload?.words)
    ? payload.words.map(item => ({
        word: String(item.word || '').trim(),
        start: Number(item.start),
        end: Number(item.end),
      })).filter(item => item.word && Number.isFinite(item.start) && Number.isFinite(item.end) && item.end >= item.start)
    : [];

  const fullText = String(payload?.full_text || words.map(item => item.word).join(' ')).trim();
  const duration = Number(payload?.duration || words.at(-1)?.end || 0);

  if (!fullText && words.length === 0) {
    throw new Error('Gemini no pudo transcribir audio reconocible.');
  }

  return {
    words,
    full_text: fullText,
    duration: Number.isFinite(duration) ? Number(duration.toFixed(2)) : 0,
  };
}

// Uploads larger media through Gemini Files API and returns a file_data part.
export async function uploadVideoToGeminiFile(videoFile, apiKey, options = {}) {
  options.onProgress?.({ step: 'upload', message: 'Subiendo video grande a Gemini Files API...' });
  const mimeType = videoFile.type || 'video/mp4';
  const startResponse = await fetch(`${GEMINI_FILES_BASE_URL.replace('/v1beta', '')}/upload/v1beta/files?key=${encodeURIComponent(apiKey)}`, {
    method: 'POST',
    headers: {
      'X-Goog-Upload-Protocol': 'resumable',
      'X-Goog-Upload-Command': 'start',
      'X-Goog-Upload-Header-Content-Length': String(videoFile.size),
      'X-Goog-Upload-Header-Content-Type': mimeType,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      file: { display_name: videoFile.name || 'video' },
    }),
  });

  if (!startResponse.ok) {
    const error = await startResponse.json().catch(() => null);
    throw new Error(error?.error?.message || 'Gemini no pudo iniciar la subida del video.');
  }

  const uploadUrl = startResponse.headers.get('x-goog-upload-url');
  if (!uploadUrl) {
    throw new Error('Gemini no devolvio la URL de subida. Revisa CORS o la API key.');
  }

  const uploadResponse = await fetch(uploadUrl, {
    method: 'POST',
    headers: {
      'X-Goog-Upload-Offset': '0',
      'X-Goog-Upload-Command': 'upload, finalize',
      'x-goog-api-key': apiKey,
    },
    body: videoFile,
  });
  const uploadPayload = await uploadResponse.json().catch(() => null);
  if (!uploadResponse.ok || !uploadPayload?.file?.uri) {
    throw new Error(uploadPayload?.error?.message || 'Gemini no pudo finalizar la subida del video.');
  }

  const file = await waitForGeminiFile(uploadPayload.file, apiKey, options);
  return {
    file_data: {
      mime_type: file.mimeType || mimeType,
      file_uri: file.uri,
    },
  };
}

// Waits until Gemini finishes processing an uploaded video file.
export async function waitForGeminiFile(file, apiKey, options = {}) {
  if (!file?.name) return file;
  let current = file;

  for (let attempt = 0; attempt < 30; attempt += 1) {
    if (!current.state || current.state === 'ACTIVE') return current;
    if (current.state === 'FAILED') throw new Error('Gemini no pudo procesar el video subido.');

    options.onProgress?.({
      step: 'upload',
      message: `Gemini esta procesando el video... ${attempt + 1}/30`,
    });
    await new Promise(resolve => setTimeout(resolve, 2000));

    const response = await fetch(`${GEMINI_FILES_BASE_URL}/${current.name}?key=${encodeURIComponent(apiKey)}`);
    const payload = await response.json().catch(() => null);
    if (!response.ok) {
      throw new Error(payload?.error?.message || 'No se pudo consultar el estado del archivo en Gemini.');
    }
    current = payload;
  }

  throw new Error('Gemini tardo demasiado en procesar el video subido. Proba de nuevo en unos minutos.');
}

// Builds the Gemini media part, using inline data for small files and Files API for large files.
export async function buildGeminiVideoPart(videoFile, apiKey, options = {}) {
  if (videoFile.size <= INLINE_VIDEO_MAX_BYTES) {
    options.onProgress?.({ step: 'transcription', message: 'Leyendo video para Gemini...' });
    return {
      inline_data: {
        mime_type: videoFile.type || 'video/mp4',
        data: await readVideoAsBase64(videoFile),
      },
    };
  }

  return uploadVideoToGeminiFile(videoFile, apiKey, options);
}

// Sends the uploaded video to Gemini and returns word-level transcription with timestamps.
export async function transcribeVideo(videoFile, options = {}) {
  if (!videoFile) throw new Error('Selecciona un video para transcribir.');

  const apiKey = String(options.apiKey || window.GEMINI_API_KEY || '').trim();
  const model = String(options.model || window.GEMINI_MODEL || DEFAULT_GEMINI_MODEL).trim();
  if (!apiKey) throw new Error('Falta configurar window.GEMINI_API_KEY.');

  const prompt = `
Transcribe el audio de este video con timestamps exactos por palabra.
Devolve SOLO JSON puro, sin markdown ni texto adicional.
Formato exacto:
{
  "words": [
    { "word": "Hola", "start": 0.2, "end": 0.6 }
  ],
  "full_text": "Texto completo",
  "duration": 45.3
}`.trim();

  const videoPart = await buildGeminiVideoPart(videoFile, apiKey, options);

  options.onProgress?.({ step: 'transcription', message: 'Transcribiendo audio con Gemini...' });
  const { payload } = await generateGeminiContent({
    apiKey,
    model,
    fallbackModels: options.fallbackModels || options.geminiFallbackModels || window.GEMINI_FALLBACK_MODELS || DEFAULT_GEMINI_FALLBACK_MODELS,
    retries: options.geminiRetries ?? 2,
    onProgress: options.onProgress,
    step: 'transcription',
    purpose: 'Transcripcion Gemini',
    body: {
      contents: [{
        role: 'user',
        parts: [
          { text: prompt },
          videoPart,
        ],
      }],
      generationConfig: {
        temperature: 0.1,
        responseMimeType: 'application/json',
      },
    },
  });

  const text = payload?.candidates?.[0]?.content?.parts?.map(part => part.text || '').join('\n');
  return normalizeTranscription(parseGeminiJson(text));
}
