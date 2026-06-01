import { getDuration, getIdeas, roundTime, sortTimeline } from './_helpers.js';

// Builds a numbered list plan. It is intended for analysisResult.content_type === "list".
export function generatePlan(analysisResult) {
  const duration = getDuration(analysisResult);
  const timeline = [{ second: 0, action: 'zoom', value: 1.0 }];
  const ideas = getIdeas(analysisResult);

  ideas.forEach((idea, index) => {
    const second = roundTime(idea.start);
    timeline.push({ second, action: 'cut', type: 'number_transition' });
    timeline.push({ second, action: 'zoom', value: 0.96, duration: 0.35 });
    timeline.push({ second, action: 'sfx', type: 'whoosh' });
    timeline.push({
      second,
      action: 'show_text',
      text: String(index + 1),
      position: 'center',
      style: 'countdown_number',
      duration: 0.65,
    });
    timeline.push({
      second: roundTime(second + 0.2),
      action: 'show_text',
      text: idea.text,
      position: 'bottom',
      style: 'list_point',
      duration: Math.max(1, roundTime(idea.end - idea.start)),
    });
  });

  return { format: 'countdown_list', duration, timeline: sortTimeline(timeline) };
}

