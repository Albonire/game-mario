import { mulberry } from '../utils/rng';
import { CAMERA } from './config';
import type { Decoration, DecorationType, TrackData, TrackPoint, Vec } from './types';

export const MAP_SIZE = 2048;
export const WORLD = {
  W: 320,
  H: 180,
  HORIZON: 62,
  CAM_H: CAMERA.HEIGHT,
  FOCAL: 160,
  CAM_DIST: CAMERA.DIST,
  ROAD_HALF: 26,
  CURB_HALF: 34,
  LAPS: 3,
  MAX_SPEED: 150,
  ACCEL: 115,
  BRAKE: 220,
  TURN: 2.3,
} as const;

export const ISLAND = { cx: 1040, cy: 1080, sy: 0.94 };

const CONTROL_POINTS: Vec[] = [
  { x: 1024, y: 1660 },
  { x: 1340, y: 1710 },
  { x: 1590, y: 1600 },
  { x: 1700, y: 1370 },
  { x: 1660, y: 1110 },
  { x: 1510, y: 960 },
  { x: 1320, y: 970 },
  { x: 1190, y: 1100 },
  { x: 1060, y: 1180 },
  { x: 900, y: 1120 },
  { x: 830, y: 960 },
  { x: 900, y: 760 },
  { x: 1010, y: 610 },
  { x: 830, y: 490 },
  { x: 610, y: 500 },
  { x: 430, y: 610 },
  { x: 370, y: 820 },
  { x: 430, y: 1040 },
  { x: 570, y: 1190 },
  { x: 610, y: 1390 },
  { x: 540, y: 1540 },
  { x: 580, y: 1670 },
  { x: 800, y: 1750 },
];

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

function sampleSpline(): Vec[] {
  const result: Vec[] = [];
  const n = CONTROL_POINTS.length;
  for (let i = 0; i < n; i++) {
    const a = CONTROL_POINTS[(i - 1 + n) % n];
    const b = CONTROL_POINTS[i];
    const c = CONTROL_POINTS[(i + 1) % n];
    const d = CONTROL_POINTS[(i + 2) % n];
    for (let s = 0; s < 40; s++) {
      const t = s / 40;
      result.push({ x: catmull(a.x, b.x, c.x, d.x, t), y: catmull(a.y, b.y, c.y, d.y, t) });
    }
  }
  return result;
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

function resample(fine: Vec[], step: number): TrackPoint[] {
  const out: Vec[] = [];
  let carry = 0;
  for (let i = 0; i < fine.length; i++) {
    const a = fine[i];
    const b = fine[(i + 1) % fine.length];
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
  return addNormals(out);
}

export function islandBoundary(angle: number) {
  return (
    880 +
    100 * Math.sin(3 * angle + 0.4) +
    55 * Math.sin(5 * angle + 2.1) +
    28 * Math.sin(9 * angle + 1.1)
  );
}

export function islandInfo(x: number, y: number) {
  const dx = x - ISLAND.cx;
  const dy = (y - ISLAND.cy) / ISLAND.sy;
  const angle = Math.atan2(dy, dx);
  const radius = Math.hypot(dx, dy);
  const edge = islandBoundary(angle);
  return { angle, radius, edge, margin: edge - radius, inside: radius < edge };
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

export function trackProgress(track: TrackData, x: number, y: number) {
  const nearest = nearestPoint(track.points, x, y);
  return { p: track.points[nearest.index], index: nearest.index, progress: nearest.index / track.points.length };
}

export function surfaceAt(track: TrackData, x: number, y: number) {
  const info = islandInfo(x, y);
  if (!info.inside) return 'sea' as const;
  const nearest = nearestPoint(track.points, x, y);
  if (nearest.dist <= WORLD.ROAD_HALF) return 'asphalt' as const;
  if (nearest.dist <= WORLD.CURB_HALF) return 'curb' as const;
  if (info.margin < 85) return 'sand' as const;
  return 'grass' as const;
}

function validDecorSpot(track: TrackData, x: number, y: number) {
  const info = islandInfo(x, y);
  if (!info.inside || info.margin < 26) return false;
  return nearestPoint(track.points, x, y).dist > WORLD.CURB_HALF + 8;
}

function createDecorations(track: Omit<TrackData, 'decorations' | 'svgPath' | 'minimapPoints'>): Decoration[] {
  const rand = mulberry(1907);
  const result: Decoration[] = [];
  const every = Math.max(4, Math.round(56 / track.step));
  const types: DecorationType[] = ['palm', 'palm', 'rock', 'bush', 'palm', 'sign', 'palm', 'bush', 'rock'];
  for (let i = 0; i < track.points.length; i += every) {
    const p = track.points[i];
    const alternate = Math.floor(i / every) % 2 === 0 ? 1 : -1;
    const candidates = [alternate, -alternate];
    for (const side of candidates) {
      const offset = WORLD.CURB_HALF + 22 + rand() * 60;
      const x = p.x + p.nx * side * offset;
      const y = p.y + p.ny * side * offset * 0.84;
      if (!validDecorSpot(track as TrackData, x, y)) continue;
      const type = types[Math.floor(rand() * types.length)];
      result.push({ x, y, type, side, scale: 0.82 + rand() * 0.45 });
      // Ráfagas de vegetación para que la isla no se sienta vacía.
      if (rand() > 0.45) {
        const ox = x + p.nx * side * (14 + rand() * 26) + (rand() - 0.5) * 18;
        const oy = y + p.ny * side * (12 + rand() * 22) + (rand() - 0.5) * 18;
        if (validDecorSpot(track as TrackData, ox, oy)) {
          const extra = types[Math.floor(rand() * types.length)];
          if (extra === 'rock' || extra === 'bush' || extra === 'palm') {
            result.push({ x: ox, y: oy, type: extra, side, scale: 0.6 + rand() * 0.4 });
          }
        }
      }
      break;
    }
  }

  const lighthouse: Vec = { x: 1802, y: 1310 };
  const s0 = track.start;
  result.push({ x: s0.x, y: s0.y, type: 'arch', side: 0, scale: 1 });
  result.push({ x: lighthouse.x, y: lighthouse.y, type: 'lighthouse', side: 0, scale: 1.15 });
  // Rocas del acantilado junto al faro.
  result.push({ x: 1760, y: 1360, type: 'rock', side: 0, scale: 1.35 });
  result.push({ x: 1830, y: 1240, type: 'rock', side: 0, scale: 1.1 });

  // Boyas lejanas para dar vida al mar.
  const buoySeeds: Vec[] = [
    { x: 1980, y: 760 },
    { x: 1960, y: 1720 },
    { x: 300, y: 1530 },
    { x: 560, y: 260 },
  ];
  for (const b of buoySeeds) {
    if (!islandInfo(b.x, b.y).inside) result.push({ ...b, type: 'bouy', side: 0, scale: 1 });
  }
  return result;
}

export function buildTrack(): TrackData {
  const fine = addNormals(sampleSpline());
  const points = resample(fine, 3.5);
  let length = 0;
  for (let i = 0; i < points.length; i++) {
    const a = points[i];
    const b = points[(i + 1) % points.length];
    length += Math.hypot(b.x - a.x, b.y - a.y);
  }
  const start = points[0];

  const progressAt = (t: number, lane = 0) => atProgress(points, t, lane);
  const base = {
    points,
    fine,
    length,
    step: 3.5,
    start,
    lighthouse: { x: 1802, y: 1310 },
    width: WORLD.ROAD_HALF * 2,
    itemBoxes: [0.07, 0.15, 0.245, 0.33, 0.43, 0.53, 0.62, 0.72, 0.82, 0.92].map((t, i) =>
      progressAt(t, i % 2 === 0 ? -11 : 11),
    ),
    nitroCans: Array.from({ length: 20 }, (_, i) => progressAt(0.035 + i * 0.048, i % 2 === 0 ? -17 : 17)),
    bananas: [0.29, 0.5, 0.66, 0.86].map((t, i) => progressAt(t, [-14, 10, 2, 17][i])),
    boostPads: [0.21, 0.69].map((t) => ({ ...progressAt(t, 0), progress: t })),
  };
  const decorations = createDecorations(base);

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

  return { ...base, decorations, svgPath, minimapPoints };
}

export function worldToMinimap(track: TrackData, x: number, y: number) {
  // Reutiliza la misma proyección que el trazado del minimapa.
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const p of track.points) {
    minX = Math.min(minX, p.x);
    minY = Math.min(minY, p.y);
    maxX = Math.max(maxX, p.x);
    maxY = Math.max(maxY, p.y);
  }
  const pad = 7;
  const scale = (100 - pad * 2) / Math.max(maxX - minX, maxY - minY);
  const ox = pad - minX * scale + (100 - pad * 2 - (maxX - minX) * scale) / 2;
  const oy = pad - minY * scale + (100 - pad * 2 - (maxY - minY) * scale) / 2;
  return { x: x * scale + ox, y: y * scale + oy };
}

export function formatTime(seconds: number) {
  if (!Number.isFinite(seconds) || seconds < 0) seconds = 0;
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  const cs = Math.floor((seconds % 1) * 100);
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}.${String(cs).padStart(2, '0')}`;
}
