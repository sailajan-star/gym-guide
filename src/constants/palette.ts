export type Palette = {
  background: string;
  surface: string;
  surfaceAlt: string;
  coachGradient: [string, string, string];
  border: string;
  text: string;
  cardText: string,
  muted: string;
  accent: string;
  accentSoft: string;
  accentText: string;
  accentMid: string;
  shadowCol: string;
  heroGradient: [string, string, string];
  heroBorder: string;
  danger: string;
};

export const darkPalette: Palette = {
  background: '#0B0D10',
  surface: '#14181D',
  surfaceAlt: '#1B2027',
  coachGradient: ['#6B1E1E', '#2A1010', '#0B0D10'],
  border: '#262C35',
  text: '#F3F5F7',
  cardText: '#F3F5F7',
  muted: '#8A94A3',
  accent: '#dc3d3d',
  accentSoft: 'rgba(220, 61, 61, 0.14)',
  accentText: '#dddddd',
  accentMid: '#9E2B2B',
  shadowCol: '#000000',
  heroGradient: ['#6B1E1E', '#2A1010', '#0B0D10'],
  heroBorder: '#5E1F1F',
  danger: '#FFB020',
};

export const lightPalette: Palette = {
  background: '#F7F5F5',
  surface: '#FFFFFF',
  surfaceAlt: '#F0ECEC',
  coachGradient: ['#6B1E1E', '#2A1010', '#0B0D10'],
  border: '#E4DEDE',
  text: '#10151A',
  cardText: '#F7F5F5',
  muted: '#8A94A3',
  accent: '#C62F2F',
  accentSoft: 'rgba(198, 47, 47, 0.10)',
  accentText: '#FFFFFF',
  accentMid: '#E08A8A',
  shadowCol: '#6B6570',
  heroGradient: ['#F6D5D5', '#FAE8E8', '#F7F5F5'],
  heroBorder: '#EBBABA',
  danger: '#B7791F',
};