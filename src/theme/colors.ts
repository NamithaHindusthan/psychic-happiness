/**
 * TaskNest palette: deep plum + soft rose on warm neutrals.
 * Every text/background pair used by the UI is checked for WCAG AA contrast
 * in __tests__/colors.test.ts.
 */
export type Palette = {
  background: string;
  surface: string;
  surfaceAlt: string;
  border: string;
  text: string;
  textMuted: string;
  primary: string;
  primaryPressed: string;
  onPrimary: string;
  accent: string; // decorative only (chips, highlights); never used for body text
  accentSoft: string;
  link: string;
  danger: string;
  dangerSoft: string;
  success: string;
  successSoft: string;
  warning: string;
  inputBackground: string;
  placeholder: string;
  overlay: string;
};

export const lightPalette: Palette = {
  background: '#FBF6F8',
  surface: '#FFFFFF',
  surfaceAlt: '#F4EAEF',
  border: '#E4D3DB',
  text: '#2B1727',
  textMuted: '#6A5562',
  primary: '#5B2A52',
  primaryPressed: '#47203F',
  onPrimary: '#FFFFFF',
  accent: '#D98BA3',
  accentSoft: '#F7E1E8',
  link: '#8A3A66',
  danger: '#B3261E',
  dangerSoft: '#FCE8E6',
  success: '#2F6F4E',
  successSoft: '#E3F2EA',
  warning: '#8A5A00',
  inputBackground: '#FFFFFF',
  placeholder: '#74606D',
  overlay: 'rgba(43, 23, 39, 0.45)',
};

export const darkPalette: Palette = {
  background: '#161018',
  surface: '#211925',
  surfaceAlt: '#2B2130',
  border: '#3F3045',
  text: '#F5EAF0',
  textMuted: '#BFA9B7',
  primary: '#E8A2BA',
  primaryPressed: '#D98BA3',
  onPrimary: '#2B1020',
  accent: '#E8A2BA',
  accentSoft: '#3A2535',
  link: '#F0B4C8',
  danger: '#F2918B',
  dangerSoft: '#3D1F1D',
  success: '#7CCBA0',
  successSoft: '#1E3328',
  warning: '#E6B24D',
  inputBackground: '#1B141E',
  placeholder: '#9C8695',
  overlay: 'rgba(0, 0, 0, 0.6)',
};

export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 } as const;
export const radius = { sm: 8, md: 12, lg: 16, pill: 999 } as const;

/** Android ships a real serif ("serif"); used sparingly for the brand and big titles. */
export const fonts = {
  display: 'serif',
} as const;
