export interface ColorPaletteItem {
  hex: string;
  label: string;
}

export interface PresetPalette {
  name: string;
  colors: ColorPaletteItem[];
}

export const PRESET_DIMENSIONS = [
  { label: '8 x 8', width: 8, height: 8 },
  { label: '16 x 16', width: 16, height: 16 },
  { label: '32 x 32', width: 32, height: 32 },
];

export const PALETTES: PresetPalette[] = [
  {
    name: 'Cyberpunk Neon',
    colors: [
      { hex: '#00000000', label: 'Transparent Background' },
      { hex: '#0a0a0a', label: 'Deep Cyber Black Outline' },
      { hex: '#00c950', label: 'Cyber Green Neon Fill' },
      { hex: '#ff0055', label: 'Vibrant Magenta Neon Fill' },
      { hex: '#00d2ff', label: 'Neon Electric Blue' },
      { hex: '#ffde00', label: 'Neon Cyber Yellow' },
      { hex: '#ffffff', label: 'Pure White Highlights' },
      { hex: '#333333', label: 'Muted Metal Gray' },
    ],
  },
  {
    name: 'PICO-8 Retro',
    colors: [
      { hex: '#00000000', label: 'Transparent Background' },
      { hex: '#000000', label: 'Black' },
      { hex: '#1d2b53', label: 'Dark Blue' },
      { hex: '#7e2553', label: 'Dark Purple' },
      { hex: '#008751', label: 'Dark Green' },
      { hex: '#ab5236', label: 'Brown' },
      { hex: '#5f574f', label: 'Dark Gray' },
      { hex: '#c2c3c7', label: 'Light Gray' },
      { hex: '#fff1e8', label: 'White/Peach' },
      { hex: '#ff004d', label: 'Red' },
      { hex: '#ffa300', label: 'Orange' },
      { hex: '#ffec27', label: 'Yellow' },
      { hex: '#00e436', label: 'Green' },
      { hex: '#29adff', label: 'Blue' },
      { hex: '#83769c', label: 'Indigo' },
      { hex: '#ff77a8', label: 'Pink' },
      { hex: '#ffccaa', label: 'Light Peach' },
    ],
  },
  {
    name: 'Classic Gameboy',
    colors: [
      { hex: '#00000000', label: 'Transparent' },
      { hex: '#0f380f', label: 'Darkest Green Outline' },
      { hex: '#306230', label: 'Dark Green Shading' },
      { hex: '#8bac0f', label: 'Light Green Fill' },
      { hex: '#9bbc0f', label: 'Lightest Green Background' },
    ],
  },
];
