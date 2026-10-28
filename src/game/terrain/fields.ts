import { MAP_SIZE } from '../track';
import type { TerrainSpec } from '../tracks/types';
import type { TrackData } from '../types';
import { fbm } from './noise';

export interface RoadField {
  /** Distancia al eje en cuartos de unidad (0 a 254). 255 = más lejos que `reach`. */
  dist: Uint8Array;
  /** Índice del punto del eje más cercano. */
  idx: Uint16Array;
  reach: number;
}

/**
 * Distancia al eje de la pista estampando un disco por cada punto del eje.
 * Es exacta a unos 0,06 unidades en el borde de la calzada.
 */
export function buildRoadField(track: TrackData, reach = 44): RoadField {
  const size = MAP_SIZE;
  const dist = new Uint8Array(size * size).fill(255);
  const idx = new Uint16Array(size * size);
  const r2 = reach * reach;
  const pts = track.points;
  for (let k = 0; k < pts.length; k++) {
    const p = pts[k];
    const x0 = Math.max(0, Math.floor(p.x - reach));
    const x1 = Math.min(size - 1, Math.ceil(p.x + reach));
    const y0 = Math.max(0, Math.floor(p.y - reach));
    const y1 = Math.min(size - 1, Math.ceil(p.y + reach));
    for (let y = y0; y <= y1; y++) {
      const dy = y + 0.5 - p.y;
      const row = y * size;
      for (let x = x0; x <= x1; x++) {
        const dx = x + 0.5 - p.x;
        const d2 = dx * dx + dy * dy;
        if (d2 >= r2) continue;
        const v = Math.min(254, Math.round(Math.sqrt(d2) * 4));
        if (v < dist[row + x]) {
          dist[row + x] = v;
          idx[row + x] = k;
        }
      }
    }
  }
  return { dist, idx, reach };
}

/** Margen al borde de la tierra: positivo dentro, negativo en el vacío. Rejilla de 1024 x 1024. */
export interface MarginField {
  size: number;
  data: Int16Array;
}

const MARGIN_SIZE = 1024;
const MARGIN_CELL = MAP_SIZE / MARGIN_SIZE;

function islandMargin(spec: Extract<TerrainSpec, { kind: 'island' }>): MarginField {
  const table = new Float32Array(4096);
  for (let i = 0; i < table.length; i++) {
    const a = (i / table.length) * Math.PI * 2 - Math.PI;
    let edge = spec.base;
    for (const [amp, k, phase] of spec.harmonics) edge += amp * Math.sin(k * a + phase);
    table[i] = edge;
  }
  const data = new Int16Array(MARGIN_SIZE * MARGIN_SIZE);
  for (let j = 0; j < MARGIN_SIZE; j++) {
    const y = (j + 0.5) * MARGIN_CELL;
    const dy = (y - spec.cy) / spec.sy;
    for (let i = 0; i < MARGIN_SIZE; i++) {
      const x = (i + 0.5) * MARGIN_CELL;
      const dx = x - spec.cx;
      const angle = Math.atan2(dy, dx);
      const radius = Math.hypot(dx, dy);
      const edge = table[Math.min(4095, Math.floor(((angle + Math.PI) / (Math.PI * 2)) * 4096))];
      data[j * MARGIN_SIZE + i] = Math.max(-400, Math.min(400, Math.round(edge - radius)));
    }
  }
  return { size: MARGIN_SIZE, data };
}

/** Relleno par-impar del polígono del eje sobre una rejilla gruesa (true = dentro del bucle). */
function loopMask(track: TrackData, cells: number): Uint8Array {
  const cell = MAP_SIZE / cells;
  const mask = new Uint8Array(cells * cells);
  const pts = track.points.filter((_, i) => i % 3 === 0);
  const n = pts.length;
  const xs: number[] = [];
  for (let row = 0; row < cells; row++) {
    const y = (row + 0.5) * cell;
    xs.length = 0;
    for (let i = 0; i < n; i++) {
      const a = pts[i];
      const b = pts[(i + 1) % n];
      if ((a.y <= y && b.y > y) || (b.y <= y && a.y > y)) {
        xs.push(a.x + ((y - a.y) / (b.y - a.y)) * (b.x - a.x));
      }
    }
    xs.sort((p, q) => p - q);
    for (let k = 0; k + 1 < xs.length; k += 2) {
      const c0 = Math.max(0, Math.ceil(xs[k] / cell - 0.5));
      const c1 = Math.min(cells - 1, Math.floor(xs[k + 1] / cell - 0.5));
      for (let c = c0; c <= c1; c++) mask[row * cells + c] = 1;
    }
  }
  return mask;
}

function ribbonMargin(spec: Extract<TerrainSpec, { kind: 'ribbon' }>, track: TrackData): MarginField {
  // Distancia al eje en una rejilla de 256 (celdas de 8 u), con alcance suficiente para el radio.
  const cells = 256;
  const cell = MAP_SIZE / cells;
  const reach = spec.radius * (1 + spec.wobble) + 40;
  const dist = new Float32Array(cells * cells).fill(9999);
  const reachCells = Math.ceil(reach / cell);
  for (const p of track.points) {
    const cx = p.x / cell;
    const cy = p.y / cell;
    const x0 = Math.max(0, Math.floor(cx - reachCells));
    const x1 = Math.min(cells - 1, Math.ceil(cx + reachCells));
    const y0 = Math.max(0, Math.floor(cy - reachCells));
    const y1 = Math.min(cells - 1, Math.ceil(cy + reachCells));
    for (let y = y0; y <= y1; y++) {
      const dy = (y + 0.5) * cell - p.y;
      for (let x = x0; x <= x1; x++) {
        const dx = (x + 0.5) * cell - p.x;
        const d = Math.hypot(dx, dy);
        const k = y * cells + x;
        if (d < dist[k]) dist[k] = d;
      }
    }
  }
  const inside = loopMask(track, cells);
  const data = new Int16Array(MARGIN_SIZE * MARGIN_SIZE);
  const sample = (u: number, v: number) => {
    const fx = Math.max(0, Math.min(cells - 1.001, u / cell - 0.5));
    const fy = Math.max(0, Math.min(cells - 1.001, v / cell - 0.5));
    const ix = Math.floor(fx);
    const iy = Math.floor(fy);
    const tx = fx - ix;
    const ty = fy - iy;
    const a = dist[iy * cells + ix];
    const b = dist[iy * cells + ix + 1];
    const c = dist[(iy + 1) * cells + ix];
    const d = dist[(iy + 1) * cells + ix + 1];
    return a + (b - a) * tx + (c - a) * ty + (a - b - c + d) * tx * ty;
  };
  for (let j = 0; j < MARGIN_SIZE; j++) {
    const y = (j + 0.5) * MARGIN_CELL;
    for (let i = 0; i < MARGIN_SIZE; i++) {
      const x = (i + 0.5) * MARGIN_CELL;
      const wobble = (fbm(x * 0.004 + spec.seed * 7.7, y * 0.004 + spec.seed * 3.1, 3) - 0.5) * 2;
      const local = spec.radius * (1 + wobble * spec.wobble);
      const d = sample(x, y);
      let margin = local - d;
      const cx = Math.min(cells - 1, Math.floor(x / cell));
      const cy = Math.min(cells - 1, Math.floor(y / cell));
      if (inside[cy * cells + cx]) margin = Math.max(margin, 400);
      data[j * MARGIN_SIZE + i] = Math.max(-400, Math.min(400, Math.round(margin)));
    }
  }
  return { size: MARGIN_SIZE, data };
}

export function buildMarginField(spec: TerrainSpec, track: TrackData): MarginField {
  return spec.kind === 'island' ? islandMargin(spec) : ribbonMargin(spec, track);
}

/** Margen en unidades del mundo (valor del vecino más cercano de la rejilla gruesa). */
export function marginAt(field: MarginField, x: number, y: number): number {
  const i = Math.min(field.size - 1, Math.max(0, Math.floor(x / MARGIN_CELL)));
  const j = Math.min(field.size - 1, Math.max(0, Math.floor(y / MARGIN_CELL)));
  return field.data[j * field.size + i];
}
