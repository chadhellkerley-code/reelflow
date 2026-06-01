import { generatePlan as generateKineticPlan } from './kinetic_subtitles.js';
import { getDuration, roundTime, sortTimeline } from './_helpers.js';

// Builds a kinetic subtitle plan and adds a dark comment prompt in the last seconds.
export function generatePlan(analysisResult) {
  const plan = generateKineticPlan(analysisResult);
  const duration = getDuration(analysisResult);
  const question = String(
    analysisResult?.engagement_question ||
    analysisResult?.comment_question ||
    'Que opinas?'
  ).trim();

  if (duration > 3) {
    const second = roundTime(duration - 3);
    plan.timeline.push({ second, action: 'darken', opacity: 0.7, duration: 3 });
    plan.timeline.push({
      second,
      action: 'show_text',
      text: question,
      position: 'cta',
      style: 'engagement_question',
      animation: 'question_pop',
      duration: 3,
    });
  }

  return {
    ...plan,
    format: 'engagement_closer',
    composition: { look: 'comment_punch', safeText: true, commentCloser: true },
    timeline: sortTimeline(plan.timeline),
  };
}
