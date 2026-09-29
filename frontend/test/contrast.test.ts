import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

/** The theme tokens, read from the stylesheet itself so a changed hex is checked here. Under jsdom `import.meta.url` is not a file URL; vitest runs from `frontend/`. */
const css = readFileSync(resolve(process.cwd(), 'src/index.css'), 'utf8');
const token = (name: string) => {
  if (name === 'white') return '#ffffff';
  const hex = css.match(new RegExp(`--color-${name}:\\s*(#[0-9a-fA-F]{6});`))?.[1];
  if (!hex) throw new Error(`No --color-${name} in index.css`);
  return hex;
};

const luminance = (hex: string) => {
  const [r, g, b] = [1, 3, 5]
    .map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
    .map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};

/** WCAG 2 contrast ratio. */
const contrast = (a: string, b: string) => {
  const [hi, lo] = [luminance(token(a)), luminance(token(b))].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
};

// Every pair the app draws. 4.5 for text, 3 for an icon or a control's edge.
const PAIRS: [fg: string, bg: string, min: number, where: string][] = [
  ['ink', 'surface', 4.5, 'body text'],
  ['ink-muted', 'surface', 4.5, 'secondary text, placeholders'],
  ['ink-muted', 'canvas', 4.5, 'secondary text on canvas'],
  ['ink-muted', 'brand-soft', 4.5, 'secondary text on cream'],
  ['ink', 'brand', 4.5, 'primary button, done day'],
  ['brand', 'night', 4.5, 'the only yellow text'],
  ['danger', 'surface', 4.5, 'field errors, danger-soft button, missed days'],
  ['danger', 'danger-soft', 4.5, 'danger Alert, Relapsed button'],
  ['white', 'danger', 4.5, 'danger button, relapse day'],
  ['success', 'success-soft', 4.5, 'On and Reached badges, success Alert'],
  ['success', 'surface', 4.5, 'goal progress'],
  ['danger-soft', 'night', 4.5, 'field error on the black card'],
  ['line-strong', 'surface', 3, 'field border'],
  ['accent-orange', 'surface', 3, 'streak flame'],
  ['accent-green', 'surface', 3, 'clean-streak leaf'],
  ...['accent-orange', 'accent-green', 'accent-purple', 'accent-red', 'accent-teal', 'accent-pink', 'accent-blue'].map(
    (accent): [string, string, number, string] => ['white', accent, 3, 'habit icon glyph'],
  ),
  ['ink', 'brand', 3, 'habit icon glyph on yellow'],
];

describe('colour contrast', () => {
  it.each(PAIRS)('%s on %s reaches %s:1 (%s)', (fg, bg, min) => {
    expect(contrast(fg, bg)).toBeGreaterThanOrEqual(min);
  });
});
