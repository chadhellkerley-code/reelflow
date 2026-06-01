export const REEL_CANVAS = {
  width: 1080,
  height: 1920,
};

export const INSTAGRAM_SAFE_ZONES = {
  top: { x: 96, y: 210, width: 760, height: 260 },
  center: { x: 96, y: 520, width: 760, height: 520 },
  bottom: { x: 96, y: 1200, width: 700, height: 260 },
  lower_third: { x: 86, y: 1260, width: 650, height: 210 },
  panel: { x: 76, y: 1220, width: 840, height: 520 },
  cta: { x: 96, y: 640, width: 760, height: 480 },
  full: { x: 72, y: 180, width: 936, height: 1480 },
};

// Returns a Reels-safe rectangle that avoids Instagram UI overlays.
export function getSafeZone(position = 'center') {
  return INSTAGRAM_SAFE_ZONES[position] || INSTAGRAM_SAFE_ZONES.center;
}

// Returns the baseline y coordinate for a multi-line text block inside a safe zone.
export function getTextBlockY(position, lineCount, fontSize, lineHeight = 1.16) {
  const zone = getSafeZone(position);
  const blockHeight = lineCount * fontSize * lineHeight;

  if (position === 'top' || position === 'lower_third' || position === 'panel') {
    return Math.round(zone.y + 22);
  }

  if (position === 'bottom') {
    return Math.round(zone.y + Math.max(0, (zone.height - blockHeight) / 2));
  }

  return Math.round(zone.y + Math.max(0, (zone.height - blockHeight) / 2));
}

// Returns a background rectangle for text styles that need contrast protection.
export function getTextBackplate(position, inset = 0) {
  const zone = getSafeZone(position);
  return {
    x: Math.max(0, zone.x - inset),
    y: Math.max(0, zone.y - inset),
    width: Math.min(REEL_CANVAS.width, zone.width + inset * 2),
    height: Math.min(REEL_CANVAS.height, zone.height + inset * 2),
  };
}
