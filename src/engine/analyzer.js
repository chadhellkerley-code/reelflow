import { parseGeminiJson } from './transcriber.js';

const DEFAULT_GEMINI_MODEL = 'gemini-1.5-pro';
const CONTENT_TYPES = new Set(['list', 'story', 'advice', 'controversial', 'educational']);
const ENGAGEMENT_TRIGGERS = new Set(['comment', 'share', 'save', 'follow']);

// Returns a finite number constrained to a time range.
function clampNumber(value, min, max, fallback = min) {
  const number = Number(value);
  return Number.isFinite(number) ? Math.max(min, Math.min(max, number)) : fallback;
}

// Normalizes Gemini content analysis to the schema consumed by format selection.
export function normalizeAnalysis(payload, transcription) {
  const duration = Number(transcription?.duration || payload?.duration || 0);
  const ideas = Array.isArray(payload?.ideas)
    ? payload.ideas.map((idea, index) => ({
        text: String(idea.text || idea.summary || `Idea ${index + 1}`).trim(),
        start: clampNumber(idea.start, 0, duration, 0),
        end: clampNumber(idea.end, 0, duration || Number.MAX_SAFE_INTEGER, duration),
      })).filter(idea => idea.text && idea.end > idea.start)
    : [];

  const emphasisMoments = Array.isArray(payload?.emphasis_moments)
    ? payload.emphasis_moments.map(moment => ({
        second: clampNumber(moment.second ?? moment.start, 0, duration, 0),
        end: clampNumber(moment.end ?? Number(moment.second ?? moment.start) + 0.35, 0, duration || Number.MAX_SAFE_INTEGER, 0.35),
        reason: String(moment.reason || 'emphasis').trim(),
      })).filter(moment => moment.end > moment.second)
    : [];

  const cta = typeof payload?.cta === 'string'
    ? payload.cta.trim()
    : String(payload?.cta?.text || '').trim();
  const contentType = CONTENT_TYPES.has(payload?.content_type) ? payload.content_type : 'educational';
  const engagementTrigger = ENGAGEMENT_TRIGGERS.has(payload?.engagement_trigger)
    ? payload.engagement_trigger
    : 'save';

  return {
    ...transcription,
    transcription,
    hook: String(payload?.hook || '').trim(),
    ideas,
    keywords: Array.isArray(payload?.keywords)
      ? payload.keywords.map(item => String(item).trim()).filter(Boolean).slice(0, 10)
      : [],
    emphasis_moments: emphasisMoments,
    cta,
    content_type: contentType,
    engagement_trigger: engagementTrigger,
    engagement_question: String(payload?.engagement_question || '').trim(),
  };
}

// Sends the transcription to Gemini and returns structured content analysis.
export async function analyzeTranscript(transcription, options = {}) {
  if (!transcription?.full_text) throw new Error('Falta una transcripcion valida para analizar.');

  const apiKey = String(options.apiKey || window.GEMINI_API_KEY || '').trim();
  const model = String(options.model || window.GEMINI_MODEL || DEFAULT_GEMINI_MODEL).trim();
  if (!apiKey) throw new Error('Falta configurar window.GEMINI_API_KEY.');

  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`;
  const prompt = `
Analiza esta transcripcion de un video corto para Instagram Reels/TikTok.
Detecta estructura, intencion y momentos de edicion.
Devolve SOLO JSON puro, sin markdown ni texto adicional.

Transcripcion:
${JSON.stringify(transcription)}

Formato exacto:
{
  "hook": "frase impactante de los primeros 1-3 segundos",
  "ideas": [
    { "text": "idea principal", "start": 2.1, "end": 8.4 }
  ],
  "keywords": ["palabra1", "palabra2"],
  "emphasis_moments": [
    { "second": 4.2, "end": 4.7, "reason": "sube el enfasis" }
  ],
  "cta": "llamado a la accion si existe",
  "content_type": "list|story|advice|controversial|educational",
  "engagement_trigger": "comment|share|save|follow",
  "engagement_question": "pregunta corta para invitar comentarios"
}`.trim();

  options.onProgress?.({ step: 'analysis', message: 'Analizando estructura con Gemini...' });
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-goog-api-key': apiKey,
    },
    body: JSON.stringify({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.2,
        responseMimeType: 'application/json',
      },
    }),
  });

  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(payload?.error?.message || 'Gemini no pudo analizar la transcripcion.');
  }

  const text = payload?.candidates?.[0]?.content?.parts?.map(part => part.text || '').join('\n');
  return normalizeAnalysis(parseGeminiJson(text), transcription);
}
