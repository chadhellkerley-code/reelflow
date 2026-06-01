import { generatePlan as kineticSubtitles } from '../formats/kinetic_subtitles.js';
import { generatePlan as hookReveal } from '../formats/hook_reveal.js';
import { generatePlan as countdownList } from '../formats/countdown_list.js';
import { generatePlan as documentaryCuts } from '../formats/documentary_cuts.js';
import { generatePlan as splitContext } from '../formats/split_context.js';
import { generatePlan as minimalText } from '../formats/minimal_text.js';
import { generatePlan as engagementCloser } from '../formats/engagement_closer.js';
import { generatePlan as povStyle } from '../formats/pov_style.js';

export const FORMAT_GENERATORS = {
  kinetic_subtitles: kineticSubtitles,
  hook_reveal: hookReveal,
  countdown_list: countdownList,
  documentary_cuts: documentaryCuts,
  split_context: splitContext,
  minimal_text: minimalText,
  engagement_closer: engagementCloser,
  pov_style: povStyle,
};

const FORMAT_RULES = {
  list: ['countdown_list', 'kinetic_subtitles', 'engagement_closer'],
  story: ['hook_reveal', 'pov_style', 'minimal_text'],
  advice: ['kinetic_subtitles', 'split_context', 'minimal_text'],
  controversial: ['hook_reveal', 'documentary_cuts', 'engagement_closer'],
  educational: ['split_context', 'kinetic_subtitles', 'minimal_text'],
};

// Chooses the best format keys from content type and engagement trigger.
export function selectFormats(analysisResult, options = {}) {
  const maxFormats = Math.max(1, Number(options.maxFormats || 3));
  const contentType = analysisResult?.content_type || 'educational';
  const trigger = analysisResult?.engagement_trigger || 'save';
  const allowedFormats = Array.isArray(options.allowedFormats) && options.allowedFormats.length > 0
    ? new Set(options.allowedFormats)
    : null;
  const selected = [...(FORMAT_RULES[contentType] || FORMAT_RULES.educational)];

  if (contentType === 'list' && !selected.includes('countdown_list')) selected.unshift('countdown_list');
  if (trigger === 'comment' && !selected.includes('engagement_closer')) selected.push('engagement_closer');
  if (trigger === 'share' && !selected.includes('hook_reveal')) selected.push('hook_reveal');
  if (trigger === 'save' && !selected.includes('split_context')) selected.push('split_context');
  if (trigger === 'follow' && !selected.includes('minimal_text')) selected.push('minimal_text');

  const normalized = Array.from(new Set(selected));
  const filtered = allowedFormats
    ? normalized.filter(format => allowedFormats.has(format))
    : normalized;
  const fallback = allowedFormats
    ? Array.from(allowedFormats).filter(format => FORMAT_GENERATORS[format])
    : normalized;

  return (filtered.length > 0 ? filtered : fallback).slice(0, maxFormats);
}

// Generates complete edit plans for the selected formats.
export function generatePlans(analysisResult, options = {}) {
  const keys = Array.isArray(options.formats) && options.formats.length > 0
    ? options.formats
    : selectFormats(analysisResult, options);

  return keys.map(key => {
    const generator = FORMAT_GENERATORS[key];
    if (!generator) throw new Error(`Formato no soportado: ${key}`);
    return generator(analysisResult);
  });
}
