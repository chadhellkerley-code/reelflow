import { transcribeVideo } from './transcriber.js';
import { analyzeTranscript } from './analyzer.js';
import { generatePlans, selectFormats } from './formatSelector.js';
import { renderFormatQueue } from './ffmpegRunner.js';
import { generateImagesForAllPlans } from './imageGenerator.js';

// Runs transcription, analysis, format selection, and plan generation.
export async function analyzeAndPlan(videoFile, options = {}) {
  options.onProgress?.({ step: 'start', message: 'Iniciando analisis del video...' });
  const transcription = await transcribeVideo(videoFile, options);
  const analysis = await analyzeTranscript(transcription, options);
  const selectedFormats = selectFormats(analysis, {
    ...options,
    allowedFormats: options.allowedFormats,
  });
  const plans = generatePlans(analysis, { ...options, formats: selectedFormats });
  options.onPlansReady?.({ transcription, analysis, selectedFormats, plans });

  return {
    transcription,
    analysis,
    selectedFormats,
    plans,
  };
}

// Runs the full automatic engine and optionally renders every generated format with FFmpeg.wasm.
export async function runFormatEngine(videoFile, options = {}) {
  const result = await analyzeAndPlan(videoFile, options);
  const segmentImages = options.generateImages
    ? await generateImagesForAllPlans(result.plans, result.analysis, options)
    : {};

  if (!options.render) {
    return { ...result, segmentImages, renders: [] };
  }

  const renders = await renderFormatQueue(videoFile, result.plans, options, segmentImages);
  return { ...result, segmentImages, renders };
}

export { transcribeVideo } from './transcriber.js';
export { analyzeTranscript } from './analyzer.js';
export { generatePlans, selectFormats } from './formatSelector.js';
export { renderFormatQueue } from './ffmpegRunner.js';
export { generateImagesForAllPlans, generateSegmentImages } from './imageGenerator.js';
