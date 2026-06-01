const DEFAULT_GEMINI_MODEL = 'gemini-1.5-pro';
const INLINE_VIDEO_MAX_BYTES = 18 * 1024 * 1024;

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

// Sends the uploaded video to Gemini and returns word-level transcription with timestamps.
export async function transcribeVideo(videoFile, options = {}) {
  if (!videoFile) throw new Error('Selecciona un video para transcribir.');

  const apiKey = String(options.apiKey || window.GEMINI_API_KEY || '').trim();
  const model = String(options.model || window.GEMINI_MODEL || DEFAULT_GEMINI_MODEL).trim();
  if (!apiKey) throw new Error('Falta configurar window.GEMINI_API_KEY.');
  if (videoFile.size > INLINE_VIDEO_MAX_BYTES) {
    throw new Error('El video supera el limite para enviarlo directo a Gemini desde el navegador. Usa un clip menor a 18 MB.');
  }

  options.onProgress?.({ step: 'transcription', message: 'Leyendo video para Gemini...' });
  const data = await readVideoAsBase64(videoFile);
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`;
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

  options.onProgress?.({ step: 'transcription', message: 'Transcribiendo audio con Gemini...' });
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-goog-api-key': apiKey,
    },
    body: JSON.stringify({
      contents: [{
        role: 'user',
        parts: [
          { text: prompt },
          {
            inline_data: {
              mime_type: videoFile.type || 'video/mp4',
              data,
            },
          },
        ],
      }],
      generationConfig: {
        temperature: 0.1,
        responseMimeType: 'application/json',
      },
    }),
  });

  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(payload?.error?.message || 'Gemini no pudo transcribir el video.');
  }

  const text = payload?.candidates?.[0]?.content?.parts?.map(part => part.text || '').join('\n');
  return normalizeTranscription(parseGeminiJson(text));
}

