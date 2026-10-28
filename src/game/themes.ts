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

export interface ThemeDef {
  id: TrackId;
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
    { kind: 'islands', color: '#6f9f93', rim: '#9cc4b4', height: 9, seed: 5, alpha: 0.5 },
    { kind: 'islands', color: '#4f8577', height: 6, seed: 9, alpha: 0.7 },
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
        [96, 104, 98],
        [70, 77, 72],
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
