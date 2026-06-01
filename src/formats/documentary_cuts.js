import { getDuration, getIdeas, roundTime, sortTimeline } from './_helpers.js';

// Builds a documentary-style plan with steady cuts, alternating reframes, and keyword lower thirds.
export function generatePlan(analysisResult) {
  const duration = getDuration(analysisResult);
  const timeline = [
    { second: 0, action: 'visual_style', look: 'bw_documentary' },
    { second: 0, action: 'music_background', type: 'tense', volume: 0.15 },
    { second: 0, action: 'zoom', value: 1.0 },
  ];

  for (let second = 2.5, index = 1; second < duration; second += 2.5, index += 1) {
    timeline.push({ second: roundTime(second), action: 'cut', type: 'direct' });
    timeline.push({ second: roundTime(second), action: 'zoom', value: index % 2 === 0 ? 1.0 : 1.08, duration: 2.5 });
  }

  const keywords = (analysisResult?.keywords || []).slice(0, 10);
  const ideas = getIdeas(analysisResult);
  keywords.forEach((keyword, index) => {
    const idea = ideas[index % Math.max(1, ideas.length)];
    timeline.push({
      second: roundTime(idea?.start ?? index * 2.5),
      action: 'show_text',
      text: keyword,
      position: 'lower_third',
      style: 'documentary_keyword',
      animation: 'lower_third',
      duration: 1.8,
    });
  });

  return {
    format: 'documentary_cuts',
    duration,
    composition: { look: 'bw_documentary', safeText: true, lowerThird: true },
    timeline: sortTimeline(timeline),
  };
}
