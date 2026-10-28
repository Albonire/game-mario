import { TRACK_BY_ID } from '../tracks';
import type { TrackDef } from '../tracks/types';
import { MAP_SIZE, WORLD, getTrack } from '../track';
import type { Decoration, Surface, TrackData, TrackId } from '../types';
import { buildMarginField, buildRoadField, marginAt, type MarginField, type RoadField } from './fields';
import { Mat, MAT_SURFACE } from './materials';
import { fbm, n2 } from './noise';
import { buildMips, paintBase, paintDecals } from './paint';
import { placeScenery } from './scenery';

/** Todo lo que el motor necesita de una pista: geometría, materiales, color y escenario. */
export interface WorldData {
  def: TrackDef;
  track: TrackData;
  /** Material por píxel del mapa (MAP_SIZE²). Fuente de verdad de la física y del detalle. */
  mat: Uint8Array;
  /** Color en cuatro niveles de mipmap: 2048², 1024², 512² y 256². */
  levels: Uint8ClampedArray[];
  decorations: Decoration[];
  margin: MarginField;
}

export type BuildProgress = (fraction: number, label: string) => void;

/** Cede el hilo sin depender de temporizadores que el navegador frena en segundo plano. */
function yieldNow(): Promise<void> {
  return new Promise((resolve) => {
    const channel = new MessageChannel();
    channel.port1.onmessage = () => {
      channel.port1.close();
      resolve();
    };
    channel.port2.postMessage(0);
  });
}

function makeTicker(onProgress?: BuildProgress, label = 'Trazando la pista') {
  let last = performance.now();
  return async (fraction: number) => {
    const now = performance.now();
    if (now - last > 10) {
      onProgress?.(fraction, label);
      await yieldNow();
      last = performance.now();
    }
  };
}

/** Asigna el material de cada píxel a partir de la distancia a la calzada y el margen al vacío. */
async function assignMaterials(
  def: TrackDef,
  track: TrackData,
  road: RoadField,
  margin: MarginField,
  tick: (f: number) => Promise<void>,
): Promise<Uint8Array> {
  const size = MAP_SIZE;
  const mat = new Uint8Array(size * size);
  const ground = def.theme.ground;
  const pts = track.points;
  const total = pts.length;
  const ROAD = WORLD.ROAD_HALF;
  const CURB = WORLD.CURB_HALF;
  const mScale = margin.size / size;

  for (let py = 0; py < size; py++) {
    if ((py & 63) === 0) await tick((py / size) * 0.5);
    const mrow = Math.floor(py * mScale) * margin.size;
    for (let px = 0; px < size; px++) {
      const i = py * size + px;
      const rd = road.dist[i];
      const dist = rd === 255 ? 999 : rd / 4;
      let m: number;
      if (dist <= ROAD) {
        m = Mat.ASPHALT;
      } else if (dist <= CURB) {
        m = Math.floor((road.idx[i] * track.step) / 9) & 1 ? Mat.CURB_B : Mat.CURB_A;
      } else {
        // Ruido de borde para que la costa no se vea escalonada.
        const edge = (n2(px * 0.18, py * 0.18) - 0.5) * 8;
        const mg = margin.data[mrow + Math.floor(px * mScale)] + edge;
        if (mg <= 0) {
          m = mg > -26 ? Mat.SHORE : Mat.VOID;
        } else {
          const coast = ground.coastWidth + (fbm(px * 0.01, py * 0.01, 2) - 0.5) * 34;
          if (mg < coast) m = ground.coast;
          else if (ground.shoulderWidth > 0 && dist <= CURB + ground.shoulderWidth) m = ground.shoulder;
          else m = ground.land;
        }
      }
      mat[i] = m;
    }
  }

  // Manchas fijas (acantilados, plazas): sustituyen tierra y costa, nunca calzada ni vacío.
  for (const blob of def.blobs) {
    const reach = Math.ceil(blob.r * 1.3);
    for (let y = Math.max(0, Math.floor(blob.y - reach)); y <= Math.min(size - 1, blob.y + reach); y++) {
      for (let x = Math.max(0, Math.floor(blob.x - reach)); x <= Math.min(size - 1, blob.x + reach); x++) {
        const dx = x + 0.5 - blob.x;
        const dy = y + 0.5 - blob.y;
        const a = Math.atan2(dy, dx);
        const r = blob.r * (0.78 + 0.45 * n2(Math.cos(a) * 1.6 + blob.seed * 9, Math.sin(a) * 1.6 + blob.seed * 5));
        if (Math.hypot(dx, dy) > r) continue;
        const i = y * size + x;
        const cur = mat[i];
        if (cur === Mat.ASPHALT || cur === Mat.CURB_A || cur === Mat.CURB_B || cur === Mat.VOID || cur === Mat.SHORE) continue;
        mat[i] = blob.mat;
      }
    }
  }

  // Franjas sobre la calzada (hielo, charcos...) por tramo del bucle y desplazamiento lateral.
  for (const patch of def.patches) {
    const from = Math.floor(patch.from * total);
    const to = Math.floor(patch.to * total);
    const [latMin, latMax] = patch.lat ?? [-ROAD, ROAD];
    for (let k = from; k < to; k++) {
      const p = pts[k % total];
      for (let lat = latMin; lat <= latMax; lat += 0.7) {
        for (let along = -1.8; along <= 1.8; along += 0.7) {
          const x = Math.floor(p.x + p.nx * lat + Math.sin(p.angle) * along);
          const y = Math.floor(p.y + p.ny * lat - Math.cos(p.angle) * along);
          if (x < 0 || y < 0 || x >= size || y >= size) continue;
          const i = y * size + x;
          if (mat[i] === Mat.ASPHALT || mat[i] === Mat.CURB_A || mat[i] === Mat.CURB_B || mat[i] === patch.mat) mat[i] = patch.mat;
        }
      }
    }
  }
  return mat;
}

export async function buildWorld(id: TrackId, onProgress?: BuildProgress): Promise<WorldData> {
  const def = TRACK_BY_ID[id];
  const track = getTrack(id);
  const tick = makeTicker(onProgress);

  onProgress?.(0, 'Midiendo la pista');
  await yieldNow();
  const road = buildRoadField(track);
  const margin = buildMarginField(def.terrain, track);
  await yieldNow();

  const mat = await assignMaterials(def, track, road, margin, (f) => tick(f * 0.35));
  const decorations = placeScenery({ def, track, mat, road, margin });
  await yieldNow();

  const input = {
    theme: def.theme,
    track,
    mat,
    road,
    margin,
    decorations,
    tick: (f: number) => tick(0.35 + f * 0.6),
  };
  const base = await paintBase(input);
  const painted = await paintDecals(base, input);
  const levels = buildMips(painted);
  onProgress?.(1, 'Listo');
  return { def, track, mat, levels, decorations, margin };
}

/** Material en un punto del mundo. El mapa se repite fuera de sus bordes, como el render. */
export function matAt(world: WorldData, x: number, y: number): number {
  return world.mat[((y | 0) & (MAP_SIZE - 1)) * MAP_SIZE + ((x | 0) & (MAP_SIZE - 1))];
}

export function surfaceAt(world: WorldData, x: number, y: number): Surface {
  return MAT_SURFACE[matAt(world, x, y)];
}

/** Margen al borde de la tierra en un punto (negativo = vacío). */
export function terrainMargin(world: WorldData, x: number, y: number): number {
  return marginAt(world.margin, x, y);
}

const worldCache = new Map<TrackId, Promise<WorldData>>();

/** Mundo de una pista con caché: se guardan como mucho dos para acotar la memoria (~30 MB cada uno). */
export function loadWorld(id: TrackId, onProgress?: BuildProgress): Promise<WorldData> {
  const hit = worldCache.get(id);
  if (hit) {
    onProgress?.(1, 'Listo');
    return hit;
  }
  const pending = buildWorld(id, onProgress);
  worldCache.set(id, pending);
  pending.catch(() => worldCache.delete(id));
  while (worldCache.size > 2) {
    const oldest = worldCache.keys().next().value as TrackId;
    worldCache.delete(oldest);
  }
  return pending;
}
