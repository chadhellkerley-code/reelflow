import { getSafeZone } from './layoutEngine.js';

const AVG_CHAR_WIDTH = 0.55;

function clamp(value, min, max) {
  const number = Number(value);
  if (!Number.isFinite(number)) return min;
  return Math.max(min, Math.min(max, number));
}

function normalizeText(value, options = {}) {
  const text = String(value || '').replace(/\s+/g, ' ').trim();
  if (!options.uppercase) return text;
  return text.toUpperCase();
}

function wrapText(text, maxChars, maxLines) {
  const words = text.split(' ').filter(Boolean);
  const lines = [];
  let line = '';

  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word;
    if (candidate.length <= maxChars) {
      line = candidate;
      continue;
    }

    if (line) lines.push(line);
    line = word.length > maxChars ? word.slice(0, maxChars - 1) : word;
    if (lines.length >= maxLines) break;
  }

  if (line && lines.length < maxLines) lines.push(line);

  if (words.length > 0 && lines.join(' ').length < text.length && lines.length > 0) {
    const lastIndex = lines.length - 1;
    lines[lastIndex] = `${lines[lastIndex].replace(/[.。…]+$/, '')}...`;
  }

  return lines.length > 0 ? lines : [''];
}

// Calculates safe lines and font size so text fits Instagram Reels UI.
export function fitTextToZone(text, options = {}) {
  const zone = getSafeZone(options.position || 'center');
  const normalized = normalizeText(text, options);
  const maxLines = clamp(options.maxLines ?? 2, 1, 4);
  const minSize = clamp(options.minSize ?? 34, 20, 120);
  const maxSize = clamp(options.maxSize ?? 76, minSize, 220);
  const lineHeight = clamp(options.lineHeight ?? 1.16, 1, 1.5);
  let fontSize = maxSize;
  let lines = [normalized];

  while (fontSize >= minSize) {
    const maxChars = Math.max(5, Math.floor(zone.width / (fontSize * AVG_CHAR_WIDTH)));
    lines = wrapText(normalized, maxChars, maxLines);
    const longest = Math.max(...lines.map(line => line.length));
    const estimatedWidth = longest * fontSize * AVG_CHAR_WIDTH;
    const estimatedHeight = lines.length * fontSize * lineHeight;

    if (estimatedWidth <= zone.width && estimatedHeight <= zone.height) {
      break;
    }

    fontSize -= 2;
  }

  return {
    text: normalized,
    lines,
    fontSize: Math.max(minSize, fontSize),
    lineHeight,
    zone,
  };
}

