import { addSimpleSubtitles, getDuration, getHookText, getIdeas, roundTime, sortTimeline } from './_helpers.js';

// Builds a reveal plan that hides the opening under a hook card, then cuts to video.
export function generatePlan(analysisResult) {
  const duration = getDuration(analysisResult);
  const timeline = [
    { second: 0, action: 'visual_style', look: 'dark_cinematic' },
    { second: 0, action: 'darken', opacity: 0.42, duration: Math.min(2, duration || 2) },
    { second: 0, action: 'background', type: 'blur', duration: Math.min(2, duration || 2) },
    {
      second: 0,
      action: 'show_text',
      text: getHookText(analysisResult) || 'Mira esto',
      position: 'center',
      style: 'hook_large',
      animation: 'cinematic_reveal',
      duration: Math.min(2, duration || 2),
    },
    { second: Math.min(2, duration || 2), action: 'cut', type: 'abrupt' },
  ];

  addSimpleSubtitles(timeline, analysisResult, 'subtitle_simple');

  for (const idea of getIdeas(analysisResult)) {
    timeline.push({
      second: roundTime(idea.start),
      action: 'show_text',
      text: idea.text,
      position: 'top',
      style: 'idea_summary',
      animation: 'slide_down',
      duration: Math.min(2.4, Math.max(1, idea.end - idea.start)),
    });
  }

  return {
    format: 'hook_reveal',
    duration,
    composition: { look: 'dark_cinematic', safeText: true, introCard: true },
    timeline: sortTimeline(timeline),
  };
}
