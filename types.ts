
export enum AppTheme {
  Peach = 'Peach',
  Mint = 'Mint',
  Lavender = 'Lavender',
  BabyBlue = 'BabyBlue',
  Blush = 'Blush',
  Dark = 'Dark',
  MintySwirl = 'Minty Swirl',
  CoralKiss = 'Coral Kiss',
  LilacDream = 'Lilac Dream'
}

export type LayoutType = 'single' | 'grid2x2' | 'strip4';

export interface StickerItem {
  id: string;
  emoji: string;
  x: number; // Percentage 0-100
  y: number; // Percentage 0-100
  scale: number;
  rotation: number;
}

export interface TextItem {
  id: string;
  text: string;
  x: number;
  y: number;
  scale: number;
  rotation: number;
  color: string;
  font: string;
}

export interface Photo {
  id: string;
  uri: string; // The final composite image
  originalImages: string[]; // The raw captures
  timestamp: number;
  layout: LayoutType;
  filter?: string;
  
  // Styling
  frameColor?: string;
  framePattern?: string;
  cornerRadius?: number;
  padding?: number;
  gap?: number;
  
  // Layers
  stickers?: StickerItem[];
  texts?: TextItem[];
  
  width: number;
  height: number;
}

export interface FilterConfig {
  name: string;
  class: string;
  brightness: number;
  contrast: number;
  saturate: number;
  sepia: number;
  blur: number;
  hueRotate: number;
}

export enum ViewState {
  Intro = 'Intro',
  Home = 'Home',
  Booth = 'Booth',
  Gallery = 'Gallery',
  Editor = 'Editor',
  Settings = 'Settings'
}

export interface User {
  id: string;
  name: string;
  email: string;
  avatar: string;
}
