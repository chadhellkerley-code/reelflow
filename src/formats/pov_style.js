import { addSimpleSubtitles, getDuration, getEmphasisMoments, getHookText, roundTime, sortTimeline } from './_helpers.js';

// Builds a POV opener plus simple subtitles and quick emphasis zoom punches.
export function generatePlan(analysisResult) {
  const duration = getDuration(analysisResult);
  const timeline = [
    { second: 0, action: 'visual_style', look: 'social_pov' },
    {
      second: 0,
      action: 'show_text',
      text: `POV: ${getHookText(analysisResult) || 'esto te pasa'}`,
      position: 'center',
      style: 'pov_hook',
      animation: 'pov_stamp',
      duration: Math.min(2, duration || 2),
    },
  ];

  addSimpleSubtitles(timeline, analysisResult, 'subtitle_simple');

  for (const moment of getEmphasisMoments(analysisResult)) {
    timeline.push({ second: roundTime(moment.second), action: 'zoom', value: 1.1, duration: 0.3 });
  }

  return {
    format: 'pov_style',
    duration,
    composition: { look: 'social_pov', safeText: true, povIntro: true },
    timeline: sortTimeline(timeline),
  };
}
