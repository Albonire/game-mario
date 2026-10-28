import { mulberry } from '../../utils/rng';

/** Ruido de valor determinista con rejilla de 256x256 que se repite. */
const TAB = (() => {
  const t = new Float32Array(65536);
  const rand = mulberry(90210);
  for (let i = 0; i < t.length; i++) t[i] = rand();
  return t;
})();

/** Ruido suave en [0, 1]. */
export function n2(x: number, y: number): number {
  const ix = Math.floor(x);
  const iy = Math.floor(y);
  const fx = x - ix;
  const fy = y - iy;
  const u = fx * fx * (3 - 2 * fx);
  const v = fy * fy * (3 - 2 * fy);
  const x0 = ix & 255;
  const x1 = (ix + 1) & 255;
  const y0 = (iy & 255) << 8;
  const y1 = ((iy + 1) & 255) << 8;
  const a = TAB[y0 | x0];
  const b = TAB[y0 | x1];
  const c = TAB[y1 | x0];
  const d = TAB[y1 | x1];
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}

/** Ruido suave en [0, 1] que se repite cada `period` celdas, para texturas en mosaico. */
export function n2t(x: number, y: number, period: number): number {
  const ix = Math.floor(x);
  const iy = Math.floor(y);
  const fx = x - ix;
  const fy = y - iy;
  const u = fx * fx * (3 - 2 * fx);
  const v = fy * fy * (3 - 2 * fy);
  const wrap = (n: number) => ((n % period) + period) % period;
  const x0 = wrap(ix);
  const x1 = wrap(ix + 1);
  const y0 = wrap(iy) << 8;
  const y1 = wrap(iy + 1) << 8;
  const a = TAB[y0 | x0];
  const b = TAB[y0 | x1];
  const c = TAB[y1 | x0];
  const d = TAB[y1 | x1];
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}

/** Como `n2t`, con un periodo distinto por eje (texturas alargadas que siguen siendo en mosaico). */
export function n2tp(x: number, y: number, px: number, py: number): number {
  const ix = Math.floor(x);
  const iy = Math.floor(y);
  const fx = x - ix;
  const fy = y - iy;
  const u = fx * fx * (3 - 2 * fx);
  const v = fy * fy * (3 - 2 * fy);
  const wx = (n: number) => ((n % px) + px) % px;
  const wy = (n: number) => ((n % py) + py) % py;
  const x0 = wx(ix);
  const x1 = wx(ix + 1);
  const y0 = wy(iy) << 8;
  const y1 = wy(iy + 1) << 8;
  const a = TAB[y0 | x0];
  const b = TAB[y0 | x1];
  const c = TAB[y1 | x0];
  const d = TAB[y1 | x1];
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}

/** Movimiento browniano fractal en [0, 1] con 2 a 4 octavas. */
export function fbm(x: number, y: number, octaves = 3): number {
  let sum = 0;
  let amp = 0.5;
  let norm = 0;
  let fx = x;
  let fy = y;
  for (let i = 0; i < octaves; i++) {
    sum += n2(fx + i * 17.3, fy + i * 9.1) * amp;
    norm += amp;
    amp *= 0.5;
    fx *= 2.03;
    fy *= 2.03;
  }
  return sum / norm;
}

/** Hash entero de dos coordenadas en [0, 1), sin interpolar: sirve para motas sueltas. */
export function hash2(x: number, y: number): number {
  let h = (Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263)) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}
