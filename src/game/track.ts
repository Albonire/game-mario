import { CAMERA } from './config';
import { TRACK_BY_ID } from './tracks';
import type { LayoutSpec, TrackDef } from './tracks/types';
import type { TrackData, TrackId, TrackPoint, TrackStats, Vec } from './types';

export const MAP_SIZE = 2048;

export const WORLD = {
  CAM_H: CAMERA.HEIGHT,
  CAM_DIST: CAMERA.DIST,
  ROAD_HALF: 26,
  CURB_HALF: 34,
  LAPS: 3,
  MAX_SPEED: 150,
  ACCEL: 115,
  BRAKE: 220,
  TURN: 2.3,
} as const;

/** Separación entre puntos del eje de la pista, en unidades. */
export const TRACK_STEP = 3.5;

const TAU = Math.PI * 2;

export function clamp(v: number, min: number, max: number) {
  return Math.max(min, Math.min(max, v));
}

export function angleDelta(a: number, b: number) {
  let d = (b - a) % TAU;
  if (d > Math.PI) d -= TAU;
  if (d < -Math.PI) d += TAU;
  return d;
}

function catmull(p0: number, p1: number, p2: number, p3: number, t: number) {
  const t2 = t * t;
  const t3 = t2 * t;
  return 0.5 * (2 * p1 + (-p0 + p2) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2 + (-p0 + 3 * p1 - 3 * p2 + p3) * t3);
}

function sampleSpline(control: Vec[], samples: number): Vec[] {
  const result: Vec[] = [];
  const n = control.length;
  for (let i = 0; i < n; i++) {
    const a = control[(i - 1 + n) % n];
    const b = control[i];
    const c = control[(i + 1) % n];
    const d = control[(i + 2) % n];
    for (let s = 0; s < samples; s++) {
      const t = s / samples;
      result.push({ x: catmull(a.x, b.x, c.x, d.x, t), y: catmull(a.y, b.y, c.y, d.y, t) });
    }
  }
  return result;
}

/** Polilínea cerrada con cada esquina sustituida por un arco tangente de radio `r`. */
function sampleRounded(control: Array<Vec & { r: number }>): Vec[] {
  const n = control.length;
  const out: Vec[] = [];
  for (let i = 0; i < n; i++) {
    const p0 = control[(i - 1 + n) % n];
    const p1 = control[i];
    const p2 = control[(i + 1) % n];
    const v1 = { x: p0.x - p1.x, y: p0.y - p1.y };
    const v2 = { x: p2.x - p1.x, y: p2.y - p1.y };
    const l1 = Math.hypot(v1.x, v1.y);
    const l2 = Math.hypot(v2.x, v2.y);
    const u1 = { x: v1.x / l1, y: v1.y / l1 };
    const u2 = { x: v2.x / l2, y: v2.y / l2 };
    const interior = Math.acos(clamp(u1.x * u2.x + u1.y * u2.y, -1, 1));
    if (p1.r === 0 || interior > Math.PI - 0.02) {
      out.push({ x: p1.x, y: p1.y });
      continue;
    }
    let tangent = p1.r / Math.tan(interior / 2);
    const maxTangent = Math.min(l1, l2) * 0.49;
    let radius = p1.r;
    if (tangent > maxTangent) {
      tangent = maxTangent;
      radius = tangent * Math.tan(interior / 2);
    }
    const a = { x: p1.x + u1.x * tangent, y: p1.y + u1.y * tangent };
    const b = { x: p1.x + u2.x * tangent, y: p1.y + u2.y * tangent };
    const bis = { x: u1.x + u2.x, y: u1.y + u2.y };
    const bl = Math.hypot(bis.x, bis.y);
    bis.x /= bl;
    bis.y /= bl;
    const centerDist = radius / Math.sin(interior / 2);
    const c = { x: p1.x + bis.x * centerDist, y: p1.y + bis.y * centerDist };
    const a0 = Math.atan2(a.y - c.y, a.x - c.x);
    const a1 = Math.atan2(b.y - c.y, b.x - c.x);
    let sweep = a1 - a0;
    while (sweep > Math.PI) sweep -= TAU;
    while (sweep < -Math.PI) sweep += TAU;
    const steps = Math.max(6, Math.ceil((Math.abs(sweep) * radius) / 4));
    for (let s = 0; s <= steps; s++) {
      const th = a0 + (sweep * s) / steps;
      out.push({ x: c.x + Math.cos(th) * radius, y: c.y + Math.sin(th) * radius });
    }
  }
  return out;
}

function resample(dense: Vec[], step: number): Vec[] {
  const out: Vec[] = [];
  let carry = 0;
  for (let i = 0; i < dense.length; i++) {
    const a = dense[i];
    const b = dense[(i + 1) % dense.length];
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const len = Math.hypot(dx, dy);
    if (len === 0) continue;
    let d = carry;
    while (d < len) {
      const t = d / len;
      out.push({ x: a.x + dx * t, y: a.y + dy * t });
      d += step;
    }
    carry = d - len;
  }
  return out;
}

function addNormals(points: Vec[]): TrackPoint[] {
  const n = points.length;
  return points.map((p, i) => {
    const prev = points[(i - 1 + n) % n];
    const next = points[(i + 1) % n];
    const angle = Math.atan2(next.x - prev.x, -(next.y - prev.y));
    return { ...p, angle, nx: Math.cos(angle), ny: Math.sin(angle) };
  });
}

function layoutPoints(layout: LayoutSpec): Vec[] {
  const dense = layout.kind === 'spline' ? sampleSpline(layout.points, layout.samples ?? 40) : sampleRounded(layout.points);
  return resample(dense, TRACK_STEP);
}

/** Radio local de curvatura con una ventana de +-8 puntos (infinito en recta). */
export function localRadii(points: Vec[]): number[] {
  const n = points.length;
  const heading = points.map((_, i) => {
    const a = points[(i - 1 + n) % n];
    const b = points[(i + 1) % n];
    return Math.atan2(b.x - a.x, -(b.y - a.y));
  });
  const window = 8;
  const arc = 2 * window * TRACK_STEP;
  return heading.map((_, i) => {
    const d = Math.abs(angleDelta(heading[(i - window + n) % n], heading[(i + window) % n]));
    return d < 1e-4 ? Infinity : arc / d;
  });
}

/** Centro de la recta más larga (tramo continuo con radio > 900). */
function longestStraightCenter(radii: number[]): { center: number; length: number } {
  const n = radii.length;
  let bestStart = 0;
  let bestLen = 0;
  let runStart = -1;
  let runLen = 0;
  for (let k = 0; k < 2 * n; k++) {
    if (radii[k % n] > 900) {
      if (runStart < 0) runStart = k;
      runLen++;
      if (runLen > bestLen && runLen <= n) {
        bestLen = runLen;
        bestStart = runStart;
      }
    } else {
      runStart = -1;
      runLen = 0;
    }
  }
  return { center: (bestStart + Math.floor(bestLen / 2)) % n, length: bestLen * TRACK_STEP };
}

function computeStats(points: Vec[], length: number): TrackStats {
  const n = points.length;
  const radii = localRadii(points);
  let minRadius = Infinity;
  for (const r of radii) minRadius = Math.min(minRadius, r);
  const heading = points.map((_, i) => {
    const a = points[(i - 1 + n) % n];
    const b = points[(i + 1) % n];
    return Math.atan2(b.x - a.x, -(b.y - a.y));
  });
  // Curvas: tramos contiguos con radio < 260 y giro acumulado mayor de 0,45 rad.
  let first = 0;
  while (first < n && radii[first] < 260) first++;
  let corners = 0;
  let turn = 0;
  let inRun = false;
  for (let k = 0; k < n; k++) {
    const idx = (first + k) % n;
    if (radii[idx] < 260) {
      inRun = true;
      turn += angleDelta(heading[idx], heading[(idx + 1) % n]);
    } else if (inRun) {
      if (Math.abs(turn) > 0.45) corners++;
      inRun = false;
      turn = 0;
    }
  }
  if (inRun && Math.abs(turn) > 0.45) corners++;
  return {
    length,
    meters: length / 5,
    corners,
    minRadius: Number.isFinite(minRadius) ? minRadius : 9999,
    longestStraight: longestStraightCenter(radii).length,
  };
}

/**
 * Velocidad máxima con la que un kart puede seguir cada punto del eje.
 * El giro útil cae con la velocidad (WORLD.TURN x (1 - 0,42 v / 150)) y el derrape suma un 34 %,
 * de donde sale el radio mínimo que se recorre a cada velocidad. Luego una pasada hacia atrás
 * limita la velocidad con la frenada disponible para llegar a cada curva con tiempo.
 */
function buildSpeedProfile(points: Vec[]): Float32Array {
  const n = points.length;
  const radii = localRadii(points);
  const safe = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const r = Math.min(radii[i], 4000);
    safe[i] = Math.min(WORLD.MAX_SPEED * 1.3, (3.08 * r) / (1 + 0.0086 * r));
  }
  const decel = 105;
  const step = TRACK_STEP;
  // Dos vueltas para que el cierre del bucle converja.
  for (let pass = 0; pass < 2; pass++) {
    for (let k = n * 2 - 1; k >= 0; k--) {
      const i = k % n;
      const next = safe[(i + 1) % n];
      const limit = Math.sqrt(next * next + 2 * decel * step);
      if (limit < safe[i]) safe[i] = limit;
    }
  }
  return safe;
}

export function nearestPoint(points: TrackPoint[], x: number, y: number) {
  let best = 0;
  let bestDist = Infinity;
  for (let i = 0; i < points.length; i++) {
    const p = points[i];
    const dx = x - p.x;
    const dy = y - p.y;
    const d = dx * dx + dy * dy;
    if (d < bestDist) {
      bestDist = d;
      best = i;
    }
  }
  return { index: best, dist: Math.sqrt(bestDist) };
}

export function atProgress(points: TrackPoint[], t: number, lane = 0): Vec {
  const n = points.length;
  const wrapped = ((t % 1) + 1) % 1;
  const p = points[Math.floor(wrapped * n) % n];
  return { x: p.x + p.nx * lane, y: p.y + p.ny * lane };
}

/** Fracciones por defecto de cajas, latas y bananas a lo largo del bucle. */
const DEFAULT_BOXES = [0.07, 0.15, 0.245, 0.33, 0.43, 0.53, 0.62, 0.72, 0.82, 0.92];
const DEFAULT_BANANAS = [0.29, 0.5, 0.66, 0.86];

export function buildTrackGeometry(def: TrackDef): TrackData {
  let raw = layoutPoints(def.layout);
  if (def.startAt === 'auto') {
    const { center } = longestStraightCenter(localRadii(raw));
    raw = [...raw.slice(center), ...raw.slice(0, center)];
  } else if (def.startAt > 0) {
    const cut = Math.floor(raw.length * def.startAt);
    raw = [...raw.slice(cut), ...raw.slice(0, cut)];
  }
  const points = addNormals(raw);
  let length = 0;
  for (let i = 0; i < points.length; i++) {
    const a = points[i];
    const b = points[(i + 1) % points.length];
    length += Math.hypot(b.x - a.x, b.y - a.y);
  }
  const at = (t: number, lane = 0) => atProgress(points, t, lane);
  const lanePattern = (i: number, lane: number) => (i % 2 === 0 ? -lane : lane);
  const boostPads = def.boostPads.map((t) => {
    const p = at(t, 0);
    return { ...p, progress: t, angle: points[Math.floor(t * points.length) % points.length].angle };
  });

  // Proyección a un lienzo de 100 x 100 para el minimapa.
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const p of points) {
    minX = Math.min(minX, p.x);
    minY = Math.min(minY, p.y);
    maxX = Math.max(maxX, p.x);
    maxY = Math.max(maxY, p.y);
  }
  const pad = 7;
  const scale = (100 - pad * 2) / Math.max(maxX - minX, maxY - minY);
  const ox = pad - minX * scale + (100 - pad * 2 - (maxX - minX) * scale) / 2;
  const oy = pad - minY * scale + (100 - pad * 2 - (maxY - minY) * scale) / 2;
  const minimapPoints = points.filter((_, i) => i % 5 === 0).map((p) => ({ x: p.x * scale + ox, y: p.y * scale + oy }));
  const svgPath = minimapPoints.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ') + ' Z';

  return {
    id: def.id,
    points,
    length,
    step: TRACK_STEP,
    start: points[0],
    width: WORLD.ROAD_HALF * 2,
    itemBoxes: DEFAULT_BOXES.map((t, i) => at(t, lanePattern(i, 11))),
    nitroCans: Array.from({ length: 20 }, (_, i) => at(0.035 + i * 0.048, lanePattern(i, 17))),
    bananas: DEFAULT_BANANAS.map((t, i) => at(t, [-14, 10, 2, 17][i])),
    boostPads,
    svgPath,
    minimapPoints,
    speedProfile: buildSpeedProfile(points),
    minimap: { scale, ox, oy },
    stats: computeStats(points, length),
  };
}

const geometryCache = new Map<TrackId, TrackData>();

/** Geometría de una pista, calculada una vez. Es barata y sirve a la interfaz y al motor. */
export function getTrack(id: TrackId): TrackData {
  let hit = geometryCache.get(id);
  if (!hit) {
    hit = buildTrackGeometry(TRACK_BY_ID[id]);
    geometryCache.set(id, hit);
  }
  return hit;
}

export function worldToMinimap(track: TrackData, x: number, y: number) {
  return { x: x * track.minimap.scale + track.minimap.ox, y: y * track.minimap.scale + track.minimap.oy };
}

export function formatTime(seconds: number) {
  if (!Number.isFinite(seconds) || seconds < 0) seconds = 0;
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  const cs = Math.floor((seconds % 1) * 100);
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}.${String(cs).padStart(2, '0')}`;
}
