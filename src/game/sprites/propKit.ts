import { mulberry } from '../../utils/rng';
import { Palette, Voxels } from './voxel';

/**
 * Definición de un prop de escenario modelado con voxeles. El modelo mira hacia -z, que es
 * el lado que ve la cámara. `voxel` es el tamaño de un voxel en unidades del mundo.
 */
export interface PropGlow {
  /** Desplazamiento lateral del foco respecto al centro, en unidades para escala 1 (se invierte con el espejo). */
  x?: number;
  /** Altura del foco sobre el suelo, en unidades del mundo para escala 1. */
  y: number;
  /** Radio del halo en unidades. */
  r: number;
  /** Color del halo como `r, g, b`. */
  rgb: string;
  /** Intensidad máxima (0 a 1). */
  alpha: number;
}

export interface PropOptions {
  /** Distancia máxima a la que se dibuja, en unidades. Por defecto 760. */
  far?: number;
  /** Detalle mínimo con que se prerenderiza: los props enormes nunca necesitan el nivel 0. */
  minLod?: 0 | 1 | 2;
  /** Halo luminoso que se dibuja encima (farolas, rótulos). */
  glow?: PropGlow;
  /** No se refleja en espejo: rótulos con texto. */
  noFlip?: boolean;
  /** Vaivén vertical en unidades del mundo (barcos sobre el agua). */
  bob?: number;
}

export interface PropDef extends PropOptions {
  voxel: number;
  variants: number;
  build: (variant: number) => Voxels;
}

/** Atajo para crear un prop con su generador pseudoaleatorio de variante. */
export function prop(
  voxel: number,
  variants: number,
  build: (variant: number, rand: () => number, pal: Palette) => Voxels,
  seed = 1,
  options: PropOptions = {},
): PropDef {
  return {
    ...options,
    voxel,
    variants,
    build: (variant) => build(variant, mulberry(seed * 977 + variant * 131 + 7), new Palette()),
  };
}

/** Crea una rejilla del tamaño pedido (semianchos y alto en voxeles). */
export function grid(pal: Palette, halfX: number, halfZ: number, height: number) {
  return new Voxels(pal, halfX, halfZ, height);
}

/** Roca irregular: elipsoide recortado con ruido para que parezca tallado. */
export function rock(v: Voxels, cx: number, cy: number, cz: number, rx: number, ry: number, rz: number, c: number, rand: () => number, rough = 0.28) {
  const seedA = rand() * 100;
  const seedB = rand() * 100;
  v.ellipsoidIf(cx, cy, cz, rx, ry, rz, c, (x, y, z) => {
    const n = Math.sin(x * 0.9 + seedA) * Math.sin(y * 0.8 + seedB) * Math.sin(z * 0.7 + seedA * 0.5);
    const dx = (x - cx) / rx;
    const dy = (y - cy) / ry;
    const dz = (z - cz) / rz;
    return dx * dx + dy * dy + dz * dz + n * rough <= 1;
  });
}

/** Mezcla un color hexadecimal con otro (t de 0 a 1). */
export function mix(a: string, b: string, t: number) {
  const pa = parseInt(a.replace('#', ''), 16);
  const pb = parseInt(b.replace('#', ''), 16);
  const ch = (shift: number) => Math.round(((pa >> shift) & 255) * (1 - t) + ((pb >> shift) & 255) * t);
  return `#${[ch(16), ch(8), ch(0)].map((n) => n.toString(16).padStart(2, '0')).join('')}`;
}

/** Fuente de 3 x 5 para rótulos de voxeles. */
const FONT: Record<string, string[]> = {
  A: ['010', '101', '111', '101', '101'],
  B: ['110', '101', '110', '101', '110'],
  C: ['011', '100', '100', '100', '011'],
  D: ['110', '101', '101', '101', '110'],
  E: ['111', '100', '110', '100', '111'],
  F: ['111', '100', '110', '100', '100'],
  H: ['101', '101', '111', '101', '101'],
  I: ['111', '010', '010', '010', '111'],
  K: ['101', '101', '110', '101', '101'],
  L: ['100', '100', '100', '100', '111'],
  M: ['101', '111', '111', '101', '101'],
  N: ['111', '101', '101', '101', '101'],
  O: ['111', '101', '101', '101', '111'],
  P: ['111', '101', '111', '100', '100'],
  R: ['110', '101', '110', '101', '101'],
  S: ['111', '100', '111', '001', '111'],
  T: ['111', '010', '010', '010', '010'],
  U: ['101', '101', '101', '101', '111'],
  X: ['101', '101', '010', '101', '101'],
  Z: ['111', '001', '010', '100', '111'],
  '0': ['111', '101', '101', '101', '111'],
  '1': ['010', '110', '010', '010', '111'],
  '2': ['111', '001', '111', '100', '111'],
  '3': ['111', '001', '111', '001', '111'],
  '-': ['000', '000', '111', '000', '000'],
};

/** Ancho en voxeles de un rótulo con el tamaño dado. */
export function labelWidth(text: string, size = 1) {
  return text.length * 4 * size - size;
}

/** Escribe un rótulo en un plano z fijo, visto desde -z (la derecha de pantalla es +x). */
export function label(v: Voxels, text: string, x: number, yTop: number, z: number, c: number, size = 1) {
  let cursor = x;
  for (const ch of text) {
    const rows = FONT[ch];
    if (rows) {
      for (let r = 0; r < 5; r++) {
        for (let col = 0; col < 3; col++) {
          if (rows[r][col] !== '1') continue;
          for (let dy = 0; dy < size; dy++) {
            for (let dx = 0; dx < size; dx++) v.set(cursor + col * size + dx, yTop - r * size - dy, z, c);
          }
        }
      }
    }
    cursor += 4 * size;
  }
}

/** Pasa los voxeles de ciertos colores a su par más oscuro en franjas horizontales (estratos de roca, troncos). */
export function recolorBands(v: Voxels, pairs: Map<number, number>, period: number, offset = 0) {
  for (let y = 0; y < v.height; y++) {
    if (Math.floor((y + offset) / period) % 2 === 0) continue;
    for (let z = -v.halfZ; z <= v.halfZ; z++) {
      for (let x = -v.halfX; x <= v.halfX; x++) {
        const to = pairs.get(v.get(x, y, z));
        if (to) v.set(x, y, z, to);
      }
    }
  }
}
