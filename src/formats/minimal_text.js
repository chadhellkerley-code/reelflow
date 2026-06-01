import { getDuration, getHookText, getIdeas, roundTime, sortTimeline } from './_helpers.js';

// Builds a clean plan with only hook, central idea, CTA, and one slow continuous zoom.
export function generatePlan(analysisResult) {
  const duration = getDuration(analysisResult);
  const ideas = getIdeas(analysisResult);
  const centralIdea = ideas[Math.floor(ideas.length / 2)] || ideas[0];
  const ctaText = typeof analysisResult?.cta === 'string'
    ? analysisResult.cta
    : analysisResult?.cta?.text || '';
  const timeline = [
    { second: 0, action: 'visual_style', look: 'luxury_minimal' },
    { second: 0, action: 'zoom', value: 1.06, duration },
    {
      second: 0,
      action: 'show_text',
      text: getHookText(analysisResult) || 'Mira esto',
      position: 'center',
      style: 'minimal_hook',
      animation: 'fade_luxury',
      duration: Math.min(2.4, duration || 2.4),
    },
  ];

  if (centralIdea) {
    timeline.push({
      second: roundTime(Math.max(2.5, centralIdea.start)),
      action: 'show_text',
      text: centralIdea.text,
      position: 'center',
      style: 'minimal_idea',
      animation: 'fade_luxury',
      duration: Math.min(3, Math.max(1.5, centralIdea.end - centralIdea.start)),
    });
  }

  if (ctaText && duration > 4) {
    timeline.push({
      second: roundTime(Math.max(0, duration - 3)),
      action: 'show_text',
      text: ctaText,
      position: 'cta',
      style: 'minimal_cta',
      animation: 'fade_luxury',
      duration: Math.min(3, duration),
    });
  }

  return {
    format: 'minimal_text',
    duration,
    composition: { look: 'luxury_minimal', safeText: true, sparseText: true },
    timeline: sortTimeline(timeline),
  };
}
