import { getDuration, getIdeas, isKeyword, roundTime, sortTimeline } from './_helpers.js';

// Builds a split-screen context panel where each idea updates the lower panel.
export function generatePlan(analysisResult) {
  const duration = getDuration(analysisResult);
  const timeline = [{ second: 0, action: 'layout', type: 'split_context', videoHeight: 0.6, panelHeight: 0.4 }];
  const keywords = analysisResult?.keywords || [];

  for (const idea of getIdeas(analysisResult)) {
    timeline.push({ second: roundTime(idea.start), action: 'panel_transition', type: 'slide' });
    timeline.push({
      second: roundTime(idea.start + 0.12),
      action: 'show_text',
      text: idea.text,
      position: 'panel',
      style: 'context_panel',
      duration: Math.max(1, roundTime(idea.end - idea.start)),
      highlight: keywords.filter(keyword => isKeyword(analysisResult, keyword)),
    });
  }

  return { format: 'split_context', duration, timeline: sortTimeline(timeline) };
}

