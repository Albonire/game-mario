import { Mat, type MatId } from './terrain/materials';
import type { TrackId } from './types';

export type RGB = [number, number, number];

export interface SkyStop {
  at: number;
  color: string;
}

export interface CelestialSpec {
  kind: 'sun' | 'moon';
  /** Rumbo en radianes del mundo. */
  angle: number;
  color: string;
  glow: string;
  /** Radio del disco en píxeles lógicos (lienzo de 320x180). */
  size: number;
  /** Altura sobre el horizonte en píxeles lógicos. */
  height: number;
}

export interface CloudSpec {
  count: number;
  color: string;
  alpha: number;
  minY: number;
  maxY: number;
  seed: number;
}

export interface LayerSpec {
  kind: 'islands' | 'dunes' | 'mesas' | 'mountains' | 'skyline';
  /** Color de relleno. */
  color: string;
  /** Color del borde iluminado, si lo tiene. */
  rim?: string;
  /** Color de detalle: nieve en las cimas, ventanas en la ciudad. */
  accent?: string;
  /** Altura máxima en píxeles lógicos. */
  height: number;
  seed: number;
  alpha?: number;
}

export interface WaterSpec {
  deep: RGB;
  mid: RGB;
  shallow: RGB;
  foam: RGB;
  /** Intensidad de los destellos del sol (0 a 1). */
  sparkle: number;
  /** Cuánto se agita la superficie (1 = mar abierto, 0,3 = abismo o lago helado). */
  motion: number;
}

export interface GroundStyle {
  /** Material que rellena la tierra por defecto. */
  land: MatId;
  /** Material en una franja pegada al bordillo. */
  shoulder: MatId;
  shoulderWidth: number;
  /** Material junto al borde del vacío. */
  coast: MatId;
  coastWidth: number;
  /** Dos tonos por material; el pintor mezcla entre ambos con ruido. */
  palette: Partial<Record<MatId, [RGB, RGB]>>;
  /** Color de las líneas pintadas en la calzada. */
  line: RGB;
}

export type WeatherKind = 'none' | 'snow' | 'dust';
export type Soundscape = 'sea' | 'desert' | 'mountain' | 'city';

export interface ThemeDef {
  id: TrackId;
  /** Partículas de clima en pantalla. */
  weather: WeatherKind;
  /** Sonido de fondo sintetizado. */
  soundscape: Soundscape;
  /** Tipo de prop del arco de salida. */
  startArch: string;
  sky: SkyStop[];
  celestial: CelestialSpec | null;
  clouds: CloudSpec | null;
  /** Estrellas visibles (0 = ninguna). */
  stars: number;
  layers: LayerSpec[];
  haze: { color: string; alpha: number };
  fog: { color: RGB; start: number; end: number; max: number };
  /** Tinte multiplicativo del suelo (1,1,1 = sin tinte). */
  ambient: RGB;
  /** Amplitud del temblor de calor cerca del horizonte, en unidades del mundo. */
  heat: number;
  water: WaterSpec;
  ground: GroundStyle;
}

export const FARO_THEME: ThemeDef = {
  id: 'faro',
  weather: 'none',
  soundscape: 'sea',
  startArch: 'arch',
  sky: [
    { at: 0, color: '#17628a' },
    { at: 0.38, color: '#4098b0' },
    { at: 0.7, color: '#9fd3c8' },
    { at: 1, color: '#f1e4b4' },
  ],
  celestial: { kind: 'sun', angle: 2.15, color: '#fff6cf', glow: 'rgba(255, 233, 160, ', size: 8, height: 25 },
  clouds: { count: 7, color: 'rgba(246, 246, 224, ', alpha: 0.34, minY: 14, maxY: 34, seed: 11 },
  stars: 0,
  layers: [
    { kind: 'islands', color: '#6f9f93', rim: '#9cc4b4', height: 13, seed: 5, alpha: 0.55 },
    { kind: 'islands', color: '#4f8577', height: 8, seed: 9, alpha: 0.75 },
  ],
  haze: { color: 'rgba(240, 232, 196, ', alpha: 0.5 },
  fog: { color: [208, 228, 208], start: 170, end: 1120, max: 0.9 },
  ambient: [1, 0.985, 0.95],
  heat: 0,
  water: {
    deep: [8, 82, 98],
    mid: [14, 112, 130],
    shallow: [60, 186, 182],
    foam: [236, 250, 240],
    sparkle: 0.9,
    motion: 1,
  },
  ground: {
    land: Mat.GRASS,
    shoulder: Mat.GRASS,
    shoulderWidth: 0,
    coast: Mat.SAND,
    coastWidth: 86,
    palette: {
      [Mat.GRASS]: [
        [62, 142, 86],
        [38, 106, 66],
      ],
      [Mat.SAND]: [
        [234, 215, 160],
        [212, 188, 130],
      ],
      [Mat.SHORE]: [
        [92, 208, 196],
        [34, 148, 168],
      ],
      [Mat.VOID]: [
        [14, 112, 130],
        [6, 66, 80],
      ],
      [Mat.ASPHALT]: [
        [64, 74, 78],
        [50, 59, 63],
      ],
      [Mat.CURB_A]: [
        [196, 72, 60],
        [170, 56, 46],
      ],
      [Mat.CURB_B]: [
        [242, 236, 216],
        [222, 214, 192],
      ],
      [Mat.ROCK]: [
        [138, 128, 112],
        [98, 90, 80],
      ],
      [Mat.WOOD]: [
        [150, 100, 56],
        [116, 74, 42],
      ],
      [Mat.DIRT]: [
        [170, 140, 94],
        [142, 114, 74],
      ],
    },
    line: [236, 232, 214],
  },
};

/** Cañón del Sol: desierto a mediodía, mesas rojas y un abismo en lugar de mar. */
export const CANON_THEME: ThemeDef = {
  id: 'canon',
  weather: 'dust',
  soundscape: 'desert',
  startArch: 'arch_canon',
  sky: [
    { at: 0, color: '#1c68ad' },
    { at: 0.4, color: '#4fa2d6' },
    { at: 0.72, color: '#a8d4e8' },
    { at: 1, color: '#f4e6c2' },
  ],
  celestial: { kind: 'sun', angle: 0.7, color: '#fffbe3', glow: 'rgba(255, 243, 190, ', size: 7, height: 15 },
  clouds: { count: 4, color: 'rgba(250, 248, 236, ', alpha: 0.24, minY: 12, maxY: 28, seed: 21 },
  stars: 0,
  layers: [
    { kind: 'mesas', color: '#b4694b', rim: '#d98c63', height: 24, seed: 3, alpha: 0.78 },
    { kind: 'dunes', color: '#cf9561', rim: '#e6b983', height: 8, seed: 5, alpha: 1 },
  ],
  haze: { color: 'rgba(248, 224, 180, ', alpha: 0.55 },
  fog: { color: [238, 214, 178], start: 150, end: 1000, max: 0.88 },
  ambient: [1.03, 0.98, 0.92],
  heat: 1.5,
  water: {
    deep: [26, 14, 18],
    mid: [74, 40, 36],
    shallow: [128, 72, 54],
    foam: [212, 160, 118],
    sparkle: 0,
    motion: 0.3,
  },
  ground: {
    land: Mat.DIRT,
    shoulder: Mat.SAND,
    shoulderWidth: 38,
    coast: Mat.ROCK,
    coastWidth: 70,
    palette: {
      [Mat.DIRT]: [
        [184, 104, 66],
        [146, 78, 50],
      ],
      [Mat.SAND]: [
        [232, 192, 134],
        [208, 164, 108],
      ],
      [Mat.ROCK]: [
        [160, 90, 62],
        [116, 64, 46],
      ],
      [Mat.SHORE]: [
        [112, 66, 50],
        [66, 38, 34],
      ],
      [Mat.VOID]: [
        [52, 30, 30],
        [18, 10, 14],
      ],
      [Mat.ASPHALT]: [
        [84, 82, 84],
        [66, 64, 68],
      ],
      [Mat.CURB_A]: [
        [202, 66, 48],
        [172, 52, 40],
      ],
      [Mat.CURB_B]: [
        [242, 232, 208],
        [222, 210, 182],
      ],
    },
    line: [242, 232, 202],
  },
};

/** Cumbre Helada: ladera nevada con un lago helado a los lados. */
export const CUMBRE_THEME: ThemeDef = {
  id: 'cumbre',
  weather: 'snow',
  soundscape: 'mountain',
  startArch: 'arch_snow',
  sky: [
    { at: 0, color: '#3873b6' },
    { at: 0.4, color: '#7bb0dc' },
    { at: 0.75, color: '#c5dff2' },
    { at: 1, color: '#eef4f8' },
  ],
  celestial: { kind: 'sun', angle: 2.6, color: '#ffffff', glow: 'rgba(255, 250, 236, ', size: 6, height: 30 },
  clouds: { count: 6, color: 'rgba(255, 255, 255, ', alpha: 0.4, minY: 12, maxY: 36, seed: 31 },
  stars: 0,
  layers: [
    { kind: 'mountains', color: '#7e92b6', accent: '#f4f8ff', height: 44, seed: 2, alpha: 0.9 },
    { kind: 'mountains', color: '#566d93', accent: '#ffffff', height: 30, seed: 8, alpha: 1 },
  ],
  haze: { color: 'rgba(222, 236, 250, ', alpha: 0.55 },
  fog: { color: [214, 229, 243], start: 130, end: 900, max: 0.9 },
  ambient: [0.98, 1, 1.05],
  heat: 0,
  water: {
    deep: [10, 38, 70],
    mid: [22, 72, 112],
    shallow: [120, 188, 218],
    foam: [236, 246, 255],
    sparkle: 0.5,
    motion: 0.35,
  },
  ground: {
    land: Mat.SNOW_DEEP,
    shoulder: Mat.SNOW,
    shoulderWidth: 30,
    coast: Mat.ICE,
    coastWidth: 64,
    palette: {
      [Mat.SNOW]: [
        [246, 249, 254],
        [214, 230, 247],
      ],
      [Mat.SNOW_DEEP]: [
        [238, 245, 253],
        [198, 220, 242],
      ],
      [Mat.ICE]: [
        [172, 216, 240],
        [120, 178, 224],
      ],
      [Mat.ROCK]: [
        [120, 126, 138],
        [86, 92, 106],
      ],
      [Mat.SHORE]: [
        [156, 208, 234],
        [96, 160, 202],
      ],
      [Mat.VOID]: [
        [24, 74, 114],
        [10, 40, 72],
      ],
      [Mat.ASPHALT]: [
        [58, 66, 74],
        [44, 52, 62],
      ],
      [Mat.CURB_A]: [
        [198, 62, 56],
        [168, 48, 44],
      ],
      [Mat.CURB_B]: [
        [248, 248, 252],
        [228, 232, 240],
      ],
    },
    line: [250, 250, 255],
  },
};

/** Neón Nocturno: ciudad de noche con canal de puerto y aceras de neón. */
export const NEON_THEME: ThemeDef = {
  id: 'neon',
  weather: 'none',
  soundscape: 'city',
  startArch: 'arch_neon',
  sky: [
    { at: 0, color: '#04061a' },
    { at: 0.45, color: '#0f1638' },
    { at: 0.8, color: '#2b2160' },
    { at: 1, color: '#5d2c6c' },
  ],
  celestial: { kind: 'moon', angle: 3.9, color: '#eef2ff', glow: 'rgba(188, 204, 255, ', size: 6, height: 22 },
  clouds: null,
  stars: 240,
  layers: [
    { kind: 'skyline', color: '#161c3e', rim: '#2e3878', accent: '#ffd98a', height: 40, seed: 4, alpha: 0.96 },
    { kind: 'skyline', color: '#0b0f27', rim: '#1d2552', accent: '#ffd98a', height: 54, seed: 6, alpha: 1 },
  ],
  haze: { color: 'rgba(168, 76, 168, ', alpha: 0.42 },
  fog: { color: [44, 28, 78], start: 110, end: 800, max: 0.86 },
  ambient: [0.66, 0.7, 0.94],
  heat: 0,
  water: {
    deep: [4, 10, 26],
    mid: [12, 28, 58],
    shallow: [34, 76, 118],
    foam: [150, 210, 255],
    sparkle: 0.6,
    motion: 0.55,
  },
  ground: {
    land: Mat.CONCRETE,
    shoulder: Mat.CONCRETE,
    shoulderWidth: 0,
    coast: Mat.ROCK,
    coastWidth: 26,
    palette: {
      [Mat.CONCRETE]: [
        [104, 108, 126],
        [74, 78, 100],
      ],
      [Mat.ROCK]: [
        [72, 74, 92],
        [48, 50, 66],
      ],
      [Mat.SHORE]: [
        [40, 92, 134],
        [20, 54, 92],
      ],
      [Mat.VOID]: [
        [14, 34, 66],
        [4, 12, 30],
      ],
      [Mat.ASPHALT]: [
        [34, 38, 50],
        [24, 28, 38],
      ],
      [Mat.WET]: [
        [28, 36, 56],
        [66, 46, 100],
      ],
      [Mat.CURB_A]: [
        [236, 64, 160],
        [190, 40, 130],
      ],
      [Mat.CURB_B]: [
        [70, 236, 236],
        [44, 190, 204],
      ],
    },
    line: [255, 226, 124],
  },
};
