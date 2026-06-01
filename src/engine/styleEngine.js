export const FORMAT_VISUAL_STYLES = {
  kinetic_subtitles: {
    look: 'contrast_pop',
    grade: ['eq=contrast=1.16:saturation=1.18:gamma=1.01', 'unsharp=5:5:0.8:5:5:0'],
    overlays: ['vignette=PI/8'],
    textPalette: { primary: 'white', accent: 'yellow', muted: '#e8e8e8' },
  },
  hook_reveal: {
    look: 'dark_cinematic',
    grade: ['eq=contrast=1.24:saturation=0.92:gamma=0.96', 'vignette=PI/5'],
    overlays: ['noise=alls=3:allf=t+u'],
    textPalette: { primary: 'white', accent: 'white', muted: 'gray' },
  },
  countdown_list: {
    look: 'clean_punch',
    grade: ['eq=contrast=1.18:saturation=1.16:gamma=1.02', 'unsharp=5:5:1.0:5:5:0'],
    overlays: [],
    textPalette: { primary: 'white', accent: 'yellow', muted: '#f4f4f4' },
  },
  documentary_cuts: {
    look: 'bw_documentary',
    grade: ['format=gray', 'eq=contrast=1.28:gamma=1.03', 'noise=alls=6:allf=t+u', 'vignette=PI/6'],
    overlays: [],
    textPalette: { primary: 'white', accent: 'white', muted: 'gray' },
  },
  split_context: {
    look: 'gray_editorial',
    grade: ['eq=contrast=1.08:saturation=0.72:gamma=1.02', 'vignette=PI/9'],
    overlays: [],
    textPalette: { primary: 'white', accent: 'white', muted: 'gray' },
  },
  minimal_text: {
    look: 'luxury_minimal',
    grade: ['eq=contrast=1.06:saturation=0.88:gamma=1.04', 'vignette=PI/10'],
    overlays: ['noise=alls=2:allf=t+u'],
    textPalette: { primary: 'white', accent: 'white', muted: 'gray' },
  },
  engagement_closer: {
    look: 'comment_punch',
    grade: ['eq=contrast=1.18:saturation=1.06:gamma=0.98', 'vignette=PI/7'],
    overlays: [],
    textPalette: { primary: 'white', accent: 'yellow', muted: '#dedede' },
  },
  pov_style: {
    look: 'social_pov',
    grade: ['eq=contrast=1.2:saturation=1.22:gamma=1.0', 'unsharp=5:5:1.05:5:5:0'],
    overlays: ['vignette=PI/9'],
    textPalette: { primary: 'white', accent: 'white', muted: 'gray' },
  },
};

// Returns the visual style definition for a generated format plan.
export function getFormatVisualStyle(format) {
  return FORMAT_VISUAL_STYLES[format] || FORMAT_VISUAL_STYLES.kinetic_subtitles;
}

// Returns FFmpeg filter snippets for the plan's visual look.
export function getPlanGradeFilters(plan) {
  const style = getFormatVisualStyle(plan?.format);
  return [...(style.grade || []), ...(style.overlays || [])];
}
