import { darkPalette, lightPalette, type Palette } from '@/theme/colors';

function luminance(hex: string): number {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255) as [number, number, number];
  const lin = (c: number) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}
function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x) as [number, number];
  return (hi + 0.05) / (lo + 0.05);
}

// [foreground, background] pairs that the UI actually renders as text.
const textPairs: [keyof Palette, keyof Palette][] = [
  ['text', 'background'],
  ['text', 'surface'],
  ['text', 'surfaceAlt'],
  ['text', 'accentSoft'],
  ['text', 'inputBackground'],
  ['textMuted', 'background'],
  ['textMuted', 'surface'],
  ['onPrimary', 'primary'],
  ['onPrimary', 'primaryPressed'],
  ['link', 'background'],
  ['danger', 'dangerSoft'],
  ['danger', 'background'],
  ['success', 'successSoft'],
  ['placeholder', 'inputBackground'],
];

describe.each([
  ['light', lightPalette],
  ['dark', darkPalette],
])('%s palette meets WCAG AA (4.5:1)', (_name, palette) => {
  it.each(textPairs)('%s on %s', (fg, bg) => {
    expect(contrast(palette[fg], palette[bg])).toBeGreaterThanOrEqual(4.5);
  });
});
