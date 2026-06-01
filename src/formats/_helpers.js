// Rounds a timestamp to two decimals for compact timeline JSON.
export function roundTime(value) {
  const number = Number(value);
  return Number.isFinite(number) ? Number(number.toFixed(2)) : 0;
}

// Clamps a number between min and max and returns a safe numeric value.
export function clamp(value, min, max) {
  const number = Number(value);
  if (!Number.isFinite(number)) return min;
  return Math.max(min, Math.min(max, number));
}

// Reads duration from either the analysis root or nested transcription.
export function getDuration(analysisResult) {
  return roundTime(analysisResult?.duration || analysisResult?.transcription?.duration || 0);
}

// Reads word-level timestamps from either the analysis root or nested transcription.
export function getWords(analysisResult) {
  return Array.isArray(analysisResult?.words)
    ? analysisResult.words
    : Array.isArray(analysisResult?.transcription?.words)
      ? analysisResult.transcription.words
      : [];
}

// Returns the hook text used by intro-oriented formats.
export function getHookText(analysisResult) {
  return String(analysisResult?.hook || analysisResult?.transcription?.full_text || '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 80);
}

// Returns normalized ideas with start/end timestamps for timeline sections.
export function getIdeas(analysisResult) {
  const duration = getDuration(analysisResult);
  const ideas = Array.isArray(analysisResult?.ideas) ? analysisResult.ideas : [];
  if (ideas.length > 0) {
    return ideas.map((idea, index) => ({
      text: String(idea.text || idea.summary || `Idea ${index + 1}`).trim(),
      start: clamp(idea.start, 0, duration),
      end: clamp(idea.end, 0, duration || Number.MAX_SAFE_INTEGER),
    })).filter(idea => idea.end > idea.start);
  }

  return duration > 0
    ? [{ text: getHookText(analysisResult) || 'Idea central', start: 0, end: duration }]
    : [];
}

// Checks whether a word should receive keyword visual emphasis.
export function isKeyword(analysisResult, word) {
  const keywordSet = new Set((analysisResult?.keywords || []).map(item => String(item).toLowerCase()));
  return keywordSet.has(String(word || '').toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ''));
}

// Returns normalized emphasis moments for zoom punches and other accents.
export function getEmphasisMoments(analysisResult) {
  const duration = getDuration(analysisResult);
  return (analysisResult?.emphasis_moments || [])
    .map(moment => ({
      second: clamp(moment.second ?? moment.start, 0, duration),
      end: clamp(moment.end ?? Number(moment.second ?? moment.start) + 0.35, 0, duration || Number.MAX_SAFE_INTEGER),
      reason: String(moment.reason || 'emphasis'),
    }))
    .filter(moment => moment.end > moment.second);
}

// Adds direct cuts at the beginning of each idea after the first one.
export function addIdeaCuts(timeline, analysisResult) {
  for (const idea of getIdeas(analysisResult).slice(1)) {
    timeline.push({ second: roundTime(idea.start), action: 'cut', type: 'direct' });
  }
}

// Adds simple word-level subtitle actions to a timeline.
export function addSimpleSubtitles(timeline, analysisResult, style = 'subtitle_default') {
  for (const word of getWords(analysisResult)) {
    const start = roundTime(word.start);
    const end = roundTime(word.end);
    if (end <= start) continue;
    timeline.push({
      second: start,
      action: 'show_text',
      text: String(word.word || '').trim(),
      position: 'bottom',
      style,
      duration: roundTime(end - start),
    });
  }
}

// Sorts timeline actions by timestamp before returning a plan.
export function sortTimeline(timeline) {
  return timeline.sort((a, b) => Number(a.second || 0) - Number(b.second || 0));
}
