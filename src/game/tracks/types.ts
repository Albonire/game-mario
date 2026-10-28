import type { MatId } from '../terrain/materials';
import type { ThemeDef } from '../themes';
import type { TrackId, Vec } from '../types';

export type LayoutSpec =
  /** Spline Catmull-Rom cerrada por los puntos de control. */
  | { kind: 'spline'; points: Vec[]; samples?: number }
  /** Polilínea con esquinas redondeadas con arcos tangentes de radio `r` (0 = esquina viva). */
  | { kind: 'rounded'; points: Array<Vec & { r: number }> };

export type TerrainSpec =
  /** Isla de contorno polar: radio base más armónicos [amplitud, frecuencia, fase]. */
  | {
      kind: 'island';
      cx: number;
      cy: number;
      /** Aplastamiento vertical del contorno. */
      sy: number;
      base: number;
      harmonics: Array<[number, number, number]>;
    }
  /**
   * Cinta de tierra alrededor de la pista más el interior del bucle. Fuera queda el vacío
   * (abismo, lago helado, canal). `radius` es el ancho de tierra a cada lado del eje.
   */
  | { kind: 'ribbon'; radius: number; wobble: number; seed: number };

/** Franja de material especial sobre la calzada o junto a ella. Tramos en fracción del bucle. */
export interface Patch {
  from: number;
  to: number;
  mat: MatId;
  /** Desplazamiento lateral [mínimo, máximo] respecto al eje, en unidades. Por defecto toda la calzada. */
  lat?: [number, number];
}

/** Mancha irregular de un material en una posición fija (acantilados, plazas). */
export interface Blob {
  x: number;
  y: number;
  r: number;
  mat: MatId;
  seed: number;
}

export interface SceneryRule {
  /** Tipos con su peso relativo. */
  types: Array<[string, number]>;
  /** Separación entre intentos a lo largo de la pista, en unidades. */
  every: number;
  offsetMin: number;
  offsetMax: number;
  /** Probabilidad de colocar algo en cada intento (0 a 1). */
  chance: number;
  /** Margen mínimo al borde del vacío. */
  minMargin?: number;
  scale: [number, number];
  /** Materiales donde se permite colocar. Por defecto cualquiera que no sea calzada ni vacío. */
  allow?: MatId[];
  /** Grupos pequeños alrededor del punto principal. */
  cluster?: { chance: number; count: [number, number]; spread: number; types?: string[]; scale?: [number, number] };
  /** Solo en este tramo del bucle, en fracciones. */
  range?: [number, number];
  /** Solo en curvas de radio menor que `maxRadius`, y en el lado exterior de la curva. */
  corners?: { maxRadius: number };
}

export interface Landmark {
  type: string;
  x: number;
  y: number;
  scale?: number;
}

/** Elemento colocado relativo a la salida: `along` hacia delante y `lateral` hacia la derecha, en unidades. */
export interface StartLandmark {
  type: string;
  along: number;
  lateral: number;
  scale?: number;
}

export interface TrackDef {
  id: TrackId;
  name: string;
  /** Una frase, concreta, para las tarjetas de selección. */
  tagline: string;
  laps: number;
  layout: LayoutSpec;
  /** Dónde queda la salida: fracción del bucle o 'auto' (la recta más larga). */
  startAt: number | 'auto';
  terrain: TerrainSpec;
  patches: Patch[];
  blobs: Blob[];
  /** Posiciones de los turbos en fracción del bucle (contada desde la salida). */
  boostPads: number[];
  scenery: SceneryRule[];
  landmarks: Landmark[];
  /** Gradas y elementos de la zona de salida. */
  startside?: StartLandmark[];
  theme: ThemeDef;
}
