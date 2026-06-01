// Returns subtle flash and cut overlays for transitions in the plan.
export function buildTransitionFilters(action, formatSeconds) {
  const second = Number(action.second || 0);
  const start = formatSeconds(second);
  const shortEnd = formatSeconds(second + 0.07);
  const longEnd = formatSeconds(second + 0.16);

  if (action.type === 'abrupt' || action.type === 'number_transition') {
    return [
      `drawbox=x=0:y=0:w=iw:h=ih:color=white@0.28:t=fill:enable='between(t,${start},${shortEnd})'`,
      `drawbox=x=0:y=0:w=iw:h=ih:color=black@0.16:t=fill:enable='between(t,${shortEnd},${longEnd})'`,
    ];
  }

  return [
    `drawbox=x=0:y=0:w=iw:h=ih:color=white@0.14:t=fill:enable='between(t,${start},${shortEnd})'`,
  ];
}

// Returns accent overlays for emphasis moments and panel transitions.
export function buildAccentMotionFilters(action, formatSeconds) {
  const second = Number(action.second || 0);
  const start = formatSeconds(second);
  const end = formatSeconds(second + Number(action.duration || 0.22));

  if (action.action === 'panel_transition') {
    return [
      `drawbox=x=0:y=1152:w=1080:h=768:color=white@0.14:t=fill:enable='between(t,${start},${end})'`,
      `drawbox=x=76:y=1208:w=928:h=4:color=white@0.55:t=fill:enable='between(t,${start},${end})'`,
    ];
  }

  if (action.action === 'zoom') {
    return [
      `drawbox=x=0:y=0:w=iw:h=ih:color=white@0.08:t=fill:enable='between(t,${start},${end})'`,
    ];
  }

  return [];
}

