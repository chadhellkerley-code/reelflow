const ANIMATION_BY_STYLE = {
  kinetic_keyword: 'keyword_pop',
  kinetic_default: 'word_pop',
  subtitle_simple: 'slide_up',
  hook_large: 'cinematic_reveal',
  idea_summary: 'slide_down',
  countdown_number: 'number_punch',
  list_point: 'slide_up',
  documentary_keyword: 'lower_third',
  context_panel: 'panel_slide',
  minimal_hook: 'fade_luxury',
  minimal_idea: 'fade_luxury',
  minimal_cta: 'fade_luxury',
  engagement_question: 'question_pop',
  pov_hook: 'pov_stamp',
};

// Returns a named animation preset for the text action style.
export function getTextAnimation(action) {
  return action.animation || ANIMATION_BY_STYLE[action.style] || 'fade';
}

// Returns a y expression that gives text a subtle format-specific entrance.
export function getAnimatedY(baseY, action, lineIndex = 0, formatSeconds = value => String(value)) {
  const start = Number(action.second || 0);
  const animation = getTextAnimation(action);
  const lineOffset = lineIndex * Number(action.lineStep || 70);
  const y = `${baseY + lineOffset}`;
  const local = `(t-${formatSeconds(start)})`;

  if (animation === 'slide_up' || animation === 'panel_slide') {
    return `${y}+max(0\\,1-${local}/0.18)*42`;
  }
  if (animation === 'slide_down') {
    return `${y}-max(0\\,1-${local}/0.18)*34`;
  }
  if (animation === 'keyword_pop' || animation === 'number_punch' || animation === 'pov_stamp') {
    return `${y}+8*sin(18*${local})*lt(${local}\\,0.28)`;
  }

  return y;
}

