import {
  addIdeaCuts,
  getDuration,
  getEmphasisMoments,
  getWords,
  isKeyword,
  roundTime,
  sortTimeline,
} from './_helpers.js';

// Builds a word-by-word subtitle plan with keyword emphasis and idea cuts.
export function generatePlan(analysisResult) {
  const duration = getDuration(analysisResult);
  const timeline = [{ second: 0, action: 'zoom', value: 1.0 }];

  for (const word of getWords(analysisResult)) {
    const start = roundTime(word.start);
    const end = roundTime(word.end);
    if (end <= start) continue;
    const keyword = isKeyword(analysisResult, word.word);
    timeline.push({
      second: start,
      action: 'show_text',
      text: String(word.word || '').trim(),
      position: 'center',
      style: keyword ? 'kinetic_keyword' : 'kinetic_default',
      duration: roundTime(end - start),
    });
  }

  addIdeaCuts(timeline, analysisResult);

  for (const moment of getEmphasisMoments(analysisResult)) {
    timeline.push({ second: roundTime(moment.second), action: 'zoom', value: 1.05, duration: 0.3 });
  }

  return { format: 'kinetic_subtitles', duration, timeline: sortTimeline(timeline) };
}

