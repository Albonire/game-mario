import { mulberry } from '../../utils/rng';
import { MAP_SIZE, WORLD } from '../track';
import type { SceneryRule, TrackDef } from '../tracks/types';
import type { Decoration, TrackData } from '../types';
import type { MarginField, RoadField } from './fields';
import { marginAt } from './fields';
import { Mat } from './materials';

interface PlaceContext {
  def: TrackDef;
  track: TrackData;
  mat: Uint8Array;
  road: RoadField;
  margin: MarginField;
}

const BLOCKED = new Set<number>([Mat.VOID, Mat.SHORE, Mat.ASPHALT, Mat.CURB_A, Mat.CURB_B, Mat.WOOD]);

function seedFor(id: string) {
  let h = 1907;
  for (let i = 0; i < id.length; i++) h = (Math.imul(h, 31) + id.charCodeAt(i)) | 0;
  return h >>> 0;
}

function pickType(rule: SceneryRule, rand: () => number, only?: string[]) {
  const list = only ? rule.types.filter(([t]) => only.includes(t)) : rule.types;
  const pool = list.length ? list : rule.types;
  const total = pool.reduce((sum, [, w]) => sum + w, 0);
  let roll = rand() * total;
  for (const [type, weight] of pool) {
    roll -= weight;
    if (roll <= 0) return type;
  }
  return pool[pool.length - 1][0];
}

/**
 * Coloca el escenario siguiendo las reglas de la pista. Es determinista: la misma pista
 * da siempre el mismo escenario. Cada elemento debe caer sobre un material permitido,
 * lejos de la calzada y con margen al borde del vacío.
 */
export function placeScenery(ctx: PlaceContext): Decoration[] {
  const { def, track, mat, road, margin } = ctx;
  const rand = mulberry(seedFor(def.id));
  const out: Decoration[] = [];
  const taken = new Map<number, Array<{ x: number; y: number }>>();
  const CELL = 14;

  const free = (x: number, y: number, gap: number) => {
    const cx = Math.floor(x / CELL);
    const cy = Math.floor(y / CELL);
    for (let j = -1; j <= 1; j++) {
      for (let i = -1; i <= 1; i++) {
        const bucket = taken.get((cy + j) * 4096 + (cx + i));
        if (!bucket) continue;
        for (const o of bucket) if (Math.hypot(o.x - x, o.y - y) < gap) return false;
      }
    }
    return true;
  };
  const claim = (x: number, y: number) => {
    const key = Math.floor(y / CELL) * 4096 + Math.floor(x / CELL);
    const bucket = taken.get(key);
    if (bucket) bucket.push({ x, y });
    else taken.set(key, [{ x, y }]);
  };

  const valid = (x: number, y: number, rule: SceneryRule) => {
    if (x < 8 || y < 8 || x > MAP_SIZE - 8 || y > MAP_SIZE - 8) return false;
    const i = Math.floor(y) * MAP_SIZE + Math.floor(x);
    const m = mat[i];
    if (rule.allow ? !rule.allow.includes(m as never) : BLOCKED.has(m)) return false;
    const d = road.dist[i];
    if (d !== 255 && d / 4 < WORLD.CURB_HALF + 8) return false;
    return marginAt(margin, x, y) >= (rule.minMargin ?? 20);
  };

  for (const rule of def.scenery) {
    const stride = Math.max(2, Math.round(rule.every / track.step));
    const n = track.points.length;
    const from = rule.range ? Math.floor(rule.range[0] * n) : 0;
    const to = rule.range ? Math.floor(rule.range[1] * n) : n;
    let slot = 0;
    for (let i = from; i < to; i += stride, slot++) {
      if (rand() > rule.chance) continue;
      const p = track.points[i];
      const alternate = slot % 2 === 0 ? 1 : -1;
      for (const side of [alternate, -alternate]) {
        const offset = rule.offsetMin + rand() * (rule.offsetMax - rule.offsetMin);
        const x = p.x + p.nx * side * offset;
        const y = p.y + p.ny * side * offset;
        if (!valid(x, y, rule) || !free(x, y, 9)) continue;
        const type = pickType(rule, rand);
        const scale = rule.scale[0] + rand() * (rule.scale[1] - rule.scale[0]);
        out.push({ x, y, type, side, scale });
        claim(x, y);
        const cl = rule.cluster;
        if (cl && rand() < cl.chance) {
          const count = cl.count[0] + Math.floor(rand() * (cl.count[1] - cl.count[0] + 1));
          for (let c = 0; c < count; c++) {
            const a = rand() * Math.PI * 2;
            const r = 12 + rand() * cl.spread;
            const ox = x + Math.cos(a) * r;
            const oy = y + Math.sin(a) * r;
            if (!valid(ox, oy, rule) || !free(ox, oy, 8)) continue;
            const cs = cl.scale ?? rule.scale;
            out.push({ x: ox, y: oy, type: pickType(rule, rand, cl.types), side, scale: cs[0] + rand() * (cs[1] - cs[0]) });
            claim(ox, oy);
          }
        }
        break;
      }
    }
  }

  // Arco de salida y elementos fijos de la pista.
  out.push({ x: track.start.x, y: track.start.y, type: 'arch', side: 0, scale: 1 });
  for (const lm of def.landmarks) out.push({ x: lm.x, y: lm.y, type: lm.type, side: 0, scale: lm.scale ?? 1 });
  return out;
}
