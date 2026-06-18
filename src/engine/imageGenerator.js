import * as countdownList from '../formats/countdown_list.js';
import * as documentaryCuts from '../formats/documentary_cuts.js';
import * as engagementCloser from '../formats/engagement_closer.js';
import * as hookReveal from '../formats/hook_reveal.js';
import * as kineticSubtitles from '../formats/kinetic_subtitles.js';
import * as minimalText from '../formats/minimal_text.js';
import * as povStyle from '../formats/pov_style.js';
import * as splitContext from '../formats/split_context.js';
import { generateGeminiContent } from './geminiClient.js';
import { clamp, getIdeas, roundTime } from '../formats/_helpers.js';

const DEFAULT_IMAGE_MODEL = 'gemini-2.5-flash-image';
const DEFAULT_IMAGE_FALLBACK_MODELS = ['gemini-2.0-flash-preview-image-generation'];
const DEFAULT_MAX_IMAGES = 10;
const DEFAULT_CONCURRENCY = 3;

const FORMAT_MODULES = {
  kinetic_subtitles: kineticSubtitles,
  documentary_cuts: documentaryCuts,
  hook_reveal: hookReveal,
  minimal_text: minimalText,
  pov_style: povStyle,
  countdown_list: countdownList,
  split_context: splitContext,
  engagement_closer: engagementCloser,
};

const FORMAT_STYLE_PROMPTS = {
  kinetic_subtitles: 'Alto contraste, colores saturados, energia editorial urbana, composicion dinamica.',
  documentary_cuts: 'Blanco y negro cinematografico, sombras duras, textura documental, realista.',
  hook_reveal: 'Plano abierto dramatico, iluminacion cinematografica, profundidad y tension visual.',
  minimal_text: 'Fondos limpios, composicion minimalista, paleta neutra, aire editorial.',
  pov_style: 'POV en primera persona, sensacion handheld, cercano, espontaneo y realista.',
  countdown_list: 'Grafico bold, flat design premium, iconografico, formas claras y alto impacto.',
  split_context: 'Dos ambientes contrastados en composicion tipo split screen, tension visual clara.',
  engagement_closer: 'Calido, invitador, directo al espectador, luz natural y foco humano.',
};

const LOOK_STYLE_PROMPTS = {
  contrast_pop: FORMAT_STYLE_PROMPTS.kinetic_subtitles,
  bw_documentary: FORMAT_STYLE_PROMPTS.documentary_cuts,
  cinematic_wide: FORMAT_STYLE_PROMPTS.hook_reveal,
  dark_cinematic: FORMAT_STYLE_PROMPTS.hook_reveal,
  soft_minimal: FORMAT_STYLE_PROMPTS.minimal_text,
  luxury_minimal: FORMAT_STYLE_PROMPTS.minimal_text,
  pov_handheld: FORMAT_STYLE_PROMPTS.pov_style,
  social_pov: FORMAT_STYLE_PROMPTS.pov_style,
  bold_graphic: FORMAT_STYLE_PROMPTS.countdown_list,
  clean_punch: FORMAT_STYLE_PROMPTS.countdown_list,
  split_tone: FORMAT_STYLE_PROMPTS.split_context,
  gray_editorial: FORMAT_STYLE_PROMPTS.split_context,
  warm_cta: FORMAT_STYLE_PROMPTS.engagement_closer,
  comment_punch: FORMAT_STYLE_PROMPTS.engagement_closer,
};

function getApiKey(options = {}) {
  return String(options.apiKey || options.geminiApiKey || globalThis.GEMINI_API_KEY || '').trim();
}

function getImageModel(options = {}) {
  return String(options.imageModel || options.geminiImageModel || globalThis.GEMINI_IMAGE_MODEL || DEFAULT_IMAGE_MODEL).trim();
}

function getOverlayOpacity(options = {}) {
  const value = Number(options.imageOverlayOpacity ?? options.overlayOpacity ?? globalThis.IMAGE_OVERLAY_OPACITY ?? 0.55);
  return Number.isFinite(value) ? clamp(value, 0.05, 1) : 0.55;
}

function getAspectPrompt(options = {}) {
  const orientation = String(options.orientation || options.aspectRatio || 'portrait').toLowerCase();
  if (orientation.includes('landscape') || orientation.includes('16:9')) return 'Formato horizontal 16:9, 1920x1080.';
  return 'Formato vertical 9:16, 1080x1920.';
}

function getVisualStyle(plan = {}) {
  const look = plan?.composition?.look || plan?.timeline?.find(action => action.action === 'visual_style')?.look || '';
  return LOOK_STYLE_PROMPTS[look] || FORMAT_STYLE_PROMPTS[plan?.format] || 'Cinematografico, claro, moderno y coherente con un video corto social.';
}

export function buildImagePromptForIdea(idea, analysisResult, plan = {}, options = {}) {
  const formatModule = FORMAT_MODULES[plan?.format];
  if (typeof formatModule?.imagePromptForIdea === 'function') {
    return formatModule.imagePromptForIdea(idea, analysisResult, plan, options);
  }

  return [
    `Imagen cinematografica que ilustra: "${idea.text}".`,
    `Estilo visual: ${getVisualStyle(plan)}`,
    getAspectPrompt(options),
    'Sin texto, sin letras, sin logos, sin marcas de agua.',
  ].join(' ');
}

function normalizeImagePart(part) {
  const inlineData = part?.inlineData || part?.inline_data;
  const data = inlineData?.data;
  if (!data) return null;
  return {
    data,
    mimeType: inlineData.mimeType || inlineData.mime_type || 'image/png',
  };
}

async function requestGeminiImage(prompt, options = {}) {
  const apiKey = getApiKey(options);
  if (!apiKey) throw new Error('Falta configurar GEMINI_API_KEY para generar imagenes.');

  const model = getImageModel(options);
  const { payload } = await generateGeminiContent({
    apiKey,
    model,
    fallbackModels: options.imageFallbackModels || globalThis.GEMINI_IMAGE_FALLBACK_MODELS || DEFAULT_IMAGE_FALLBACK_MODELS,
    retries: options.geminiImageRetries ?? 1,
    onProgress: options.onProgress,
    step: 'images',
    purpose: 'Imagen Gemini',
    body: {
      contents: [{
        role: 'user',
        parts: [{ text: prompt }],
      }],
      generationConfig: {
        responseModalities: ['IMAGE'],
      },
    },
  });

  const image = payload?.candidates?.[0]?.content?.parts
    ?.map(normalizeImagePart)
    .find(Boolean);
  if (!image?.data) throw new Error('Gemini no devolvio una imagen valida.');
  return image;
}

async function runPool(items, concurrency, worker) {
  const results = new Array(items.length);
  let cursor = 0;
  const workers = Array.from({ length: Math.min(concurrency, items.length) }, async () => {
    while (cursor < items.length) {
      const index = cursor;
      cursor += 1;
      results[index] = await worker(items[index], index);
    }
  });
  await Promise.all(workers);
  return results;
}

function getNearestTimelineSecond(plan = {}, idea) {
  const ideaStart = Number(idea?.start || 0);
  const candidates = (plan.timeline || [])
    .filter(action => action.action === 'show_text' || action.action === 'cut')
    .map(action => Number(action.second))
    .filter(second => Number.isFinite(second));

  if (candidates.length === 0) return roundTime(ideaStart);
  const next = candidates.find(second => second >= ideaStart - 0.15);
  return roundTime(next ?? ideaStart);
}

// Generates one visual layer per idea/segment for a single format plan.
export async function generateSegmentImages(analysisResult, plan, options = {}) {
  const ideas = getIdeas(analysisResult).slice(0, Math.min(DEFAULT_MAX_IMAGES, Number(options.maxSegmentImages || DEFAULT_MAX_IMAGES)));
  if (ideas.length === 0) return [];

  const concurrency = Math.max(1, Math.min(DEFAULT_CONCURRENCY, Number(options.imageConcurrency || DEFAULT_CONCURRENCY)));
  const opacity = getOverlayOpacity(options);

  options.onProgress?.({
    step: 'images',
    format: plan?.format,
    message: `Generando ${ideas.length} imagen(es) para ${plan?.format || 'formato'}...`,
  });

  const generated = await runPool(ideas, concurrency, async (idea, index) => {
    const prompt = buildImagePromptForIdea(idea, analysisResult, plan, options);
    try {
      const image = await requestGeminiImage(prompt, options);
      const duration = Math.max(1, roundTime(Number(idea.end || 0) - Number(idea.start || 0)));
      const result = {
        format: plan?.format || '',
        ideaIndex: index,
        second: getNearestTimelineSecond(plan, idea),
        duration,
        position: 'full_bg',
        opacity,
        prompt,
        imageData: image.data,
        mimeType: image.mimeType,
        imageUrl: `data:${image.mimeType};base64,${image.data}`,
      };
      options.onImageReady?.(result);
      return result;
    } catch (error) {
      options.onImageError?.({ format: plan?.format, idea, index, error });
      return null;
    }
  });

  return generated.filter(Boolean);
}

// Generates image overlays for every selected plan. Failures are isolated per format.
export async function generateImagesForAllPlans(plans = [], analysisResult, options = {}) {
  const segmentImages = {};
  for (const plan of plans) {
    try {
      segmentImages[plan.format] = await generateSegmentImages(analysisResult, plan, options);
    } catch (error) {
      options.onImageError?.({ format: plan?.format, error });
      segmentImages[plan.format] = [];
    }
  }
  return segmentImages;
}
