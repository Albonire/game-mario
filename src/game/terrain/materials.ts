import type { Surface } from '../types';

/**
 * Materiales del terreno. Cada píxel del mapa guarda un id; de ahí salen la física
 * (superficie y agarre) y la textura de detalle del render. Es la única fuente de verdad.
 */
export const Mat = {
  VOID: 0,
  SHORE: 1,
  SAND: 2,
  GRASS: 3,
  ASPHALT: 4,
  CURB_A: 5,
  CURB_B: 6,
  DIRT: 7,
  ROCK: 8,
  SNOW: 9,
  SNOW_DEEP: 10,
  ICE: 11,
  CONCRETE: 12,
  WET: 13,
  WOOD: 14,
} as const;

export type MatId = (typeof Mat)[keyof typeof Mat];
export const MAT_COUNT = 15;

/** Superficie física de cada material. */
export const MAT_SURFACE: Surface[] = [
  'sea', // VOID
  'sea', // SHORE
  'sand', // SAND
  'grass', // GRASS
  'asphalt', // ASPHALT
  'curb', // CURB_A
  'curb', // CURB_B
  'dirt', // DIRT
  'dirt', // ROCK
  'snow', // SNOW
  'deepsnow', // SNOW_DEEP
  'ice', // ICE
  'concrete', // CONCRETE
  'wet', // WET
  'curb', // WOOD
];

/** Clase de textura de detalle de cada material. */
export const Detail = {
  ASPHALT: 0,
  CONCRETE: 1,
  GRASS: 2,
  SAND: 3,
  ROCK: 4,
  SNOW: 5,
  ICE: 6,
  WATER: 7,
  FOAM: 8,
  WOOD: 9,
} as const;
export const DETAIL_COUNT = 10;

export const MAT_DETAIL: number[] = [
  Detail.WATER, // VOID
  Detail.FOAM, // SHORE
  Detail.SAND, // SAND
  Detail.GRASS, // GRASS
  Detail.ASPHALT, // ASPHALT
  Detail.CONCRETE, // CURB_A
  Detail.CONCRETE, // CURB_B
  Detail.ROCK, // DIRT
  Detail.ROCK, // ROCK
  Detail.SNOW, // SNOW
  Detail.SNOW, // SNOW_DEEP
  Detail.ICE, // ICE
  Detail.CONCRETE, // CONCRETE
  Detail.WATER, // WET
  Detail.WOOD, // WOOD
];

/** Agarre máximo por superficie. */
export const SURFACE_GRIP: Record<Surface, number> = {
  asphalt: 1,
  curb: 0.95,
  grass: 0.55,
  sand: 0.5,
  sea: 0.25,
  boost: 1,
  dirt: 0.62,
  snow: 0.62,
  deepsnow: 0.45,
  ice: 0.5,
  concrete: 0.85,
  wet: 0.92,
};

/**
 * Tasa con la que la dirección de avance sigue al morro del kart. Alta = sin deslizamiento
 * (el tacto original); baja = el kart patina de lado.
 */
export const SURFACE_FOLLOW: Record<Surface, number> = {
  asphalt: 99,
  curb: 99,
  grass: 99,
  sand: 99,
  sea: 99,
  boost: 99,
  dirt: 99,
  snow: 99,
  deepsnow: 99,
  ice: 3.2,
  concrete: 99,
  wet: 99,
};

export function isVoid(mat: number) {
  return mat === Mat.VOID || mat === Mat.SHORE;
}
