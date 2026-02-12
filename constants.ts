
import { AppTheme, FilterConfig } from './types';

export const THEME_CONFIGS: Record<AppTheme, { bg: string, text: string, accent: string, accentText: string, card: string }> = {
  [AppTheme.Peach]: { bg: 'bg-[#fff5f0]', text: 'text-[#5c4033]', accent: 'bg-[#ffd1ba]', accentText: 'text-[#7a4e3a]', card: 'bg-white' },
  [AppTheme.Mint]: { bg: 'bg-[#f2fffa]', text: 'text-[#2d5c4b]', accent: 'bg-[#b8eadd]', accentText: 'text-[#1e4536]', card: 'bg-white' },
  [AppTheme.Lavender]: { bg: 'bg-[#fdfaff]', text: 'text-[#4a3b69]', accent: 'bg-[#e6d9ff]', accentText: 'text-[#3d2e59]', card: 'bg-white' },
  [AppTheme.BabyBlue]: { bg: 'bg-[#f0f9ff]', text: 'text-[#2d4a69]', accent: 'bg-[#cceaff]', accentText: 'text-[#1e3a59]', card: 'bg-white' },
  [AppTheme.Blush]: { bg: 'bg-[#fff0f5]', text: 'text-[#703b4b]', accent: 'bg-[#ffcce0]', accentText: 'text-[#5c2a38]', card: 'bg-white' },
  [AppTheme.Dark]: { bg: 'bg-[#1a1a1a]', text: 'text-[#e0e0e0]', accent: 'bg-[#333333]', accentText: 'text-white', card: 'bg-[#262626]' },
  
  // New Pastel Themes
  [AppTheme.MintySwirl]: { bg: 'bg-[#e0f7fa]', text: 'text-[#006064]', accent: 'bg-[#80deea]', accentText: 'text-[#004d40]', card: 'bg-white' },
  [AppTheme.CoralKiss]: { bg: 'bg-[#fff3e0]', text: 'text-[#bf360c]', accent: 'bg-[#ffcc80]', accentText: 'text-[#e65100]', card: 'bg-white' },
  [AppTheme.LilacDream]: { bg: 'bg-[#f3e5f5]', text: 'text-[#4a148c]', accent: 'bg-[#ce93d8]', accentText: 'text-[#6a1b9a]', card: 'bg-white' },
};

export const FILTERS: FilterConfig[] = [
  { name: 'Normal', class: '', brightness: 100, contrast: 100, saturate: 100, sepia: 0, blur: 0, hueRotate: 0 },
  { name: 'Cozy', class: 'sepia-[.2] contrast-[.9] brightness-[1.05]', brightness: 105, contrast: 95, saturate: 110, sepia: 15, blur: 0, hueRotate: -5 },
  { name: 'Retro', class: 'sepia-[.4] contrast-[1.1] brightness-[0.9]', brightness: 90, contrast: 110, saturate: 90, sepia: 40, blur: 0, hueRotate: 0 },
  { name: 'Film', class: 'contrast-[1.1] saturate-[0.9] brightness-[1.1]', brightness: 110, contrast: 115, saturate: 85, sepia: 5, blur: 0.2, hueRotate: 0 },
  { name: 'Soft', class: 'contrast-[.9] brightness-[1.1] saturate-[0.9]', brightness: 110, contrast: 90, saturate: 90, sepia: 0, blur: 0.5, hueRotate: 0 },
  { name: 'Golden', class: 'sepia-[.3] contrast-[1.05] brightness-[1.05]', brightness: 105, contrast: 105, saturate: 120, sepia: 30, blur: 0, hueRotate: -10 },
  { name: 'B&W', class: 'grayscale', brightness: 105, contrast: 115, saturate: 0, sepia: 0, blur: 0, hueRotate: 0 },
  { name: 'Noir', class: 'grayscale contrast-[1.2] brightness-[0.9]', brightness: 90, contrast: 130, saturate: 0, sepia: 0, blur: 0, hueRotate: 0 },
  { name: 'Dreamy', class: 'brightness-[1.1] saturate-[1.2] blur-[0.5px]', brightness: 115, contrast: 100, saturate: 120, sepia: 5, blur: 1, hueRotate: -5 },
  { name: 'Cold', class: 'hue-rotate-15 contrast-[1.1]', brightness: 105, contrast: 110, saturate: 90, sepia: 0, blur: 0, hueRotate: 15 },
  { name: 'Pastel', class: 'brightness-[1.2] saturate-[0.8] contrast-[0.9]', brightness: 115, contrast: 90, saturate: 80, sepia: 10, blur: 0, hueRotate: 0 },
];

export const FRAME_PATTERNS = [
    { name: 'Solid', value: 'none' },
    { name: 'Dots', value: 'dots' },
    { name: 'Stripes', value: 'stripes' },
    { name: 'Check', value: 'check' },
];

export const FRAME_COLORS = [
    { name: 'White', value: '#ffffff' },
    { name: 'Cream', value: '#fdfbf7' },
    { name: 'Black', value: '#1a1a1a' },
    { name: 'Soft Pink', value: '#fff0f5' },
    { name: 'Peach', value: '#fff5f0' },
    { name: 'Mint', value: '#f0fdf4' },
    { name: 'Lavender', value: '#f5f3ff' },
    { name: 'Sky', value: '#f0f9ff' },
    { name: 'Butter', value: '#fefce8' },
    { name: 'Rose', value: '#fda4af' },
    { name: 'Sage', value: '#a4cbb4' },
];

export const STICKER_PACKS = [
    { name: 'Cute', items: ['🎀', '💖', '✨', '🧸', '🐰', '🍒', '🍓', '☁️'] },
    { name: 'Mood', items: ['😎', '🥺', '🥰', '😴', '🤠', '🤪', '🤬', '👻'] },
    { name: 'Decor', items: ['⭐', '🌙', '🌸', '🍀', '🦋', '🎈', '🎉', '👑'] },
    { name: 'Food', items: ['🧋', '🍰', '🍪', '🍑', '🍕', '🍩', '🥑', '🥞'] },
    { name: 'Retro', items: ['📼', '💿', '🕹️', '📺', '📻', '🕶️', '🎸', '🛹'] },
];

export const FONTS = [
    { name: 'Quicksand', value: 'Quicksand' },
    { name: 'Handwritten', value: 'Pacifico' },
    { name: 'Serif', value: 'serif' },
    { name: 'Monospace', value: 'monospace' },
];
