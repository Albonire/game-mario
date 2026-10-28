import type { Pilot, PilotId } from '../types';
import { VOXEL_UNITS, buildKartModel } from './karts';
import { renderVoxels, type Voxels } from './voxel';

/** Cuadros por vuelta completa del kart. */
export const ANGLES = 32;
/** Elevación de la cámara por cubo de distancia: cerca, media y lejos. */
export const PITCHES = [0.45, 0.24, 0.1] as const;
/** Píxeles por unidad del mundo con que se prerenderiza cada nivel de detalle. */
export const LOD_PPU = [9, 4.5, 2.25] as const;
const COLS = 8;
const PAD = 3;
const TAU = Math.PI * 2;

export type PoseKey = 'N' | 'L' | 'R';
const POSE_STEER: Record<PoseKey, number> = { N: 0, L: -1, R: 1 };

export interface Atlas {
  fw: number;
  fh: number;
  /** Punto del cuadro donde cae el suelo bajo el centro del kart. */
  anchorX: number;
  anchorY: number;
  ppu: number;
  canvas: HTMLCanvasElement;
}

/** Cubo de elevación según la distancia en el eje de la cámara. */
export function pitchIndexFor(forward: number): 0 | 1 | 2 {
  return forward < 62 ? 0 : forward < 130 ? 1 : 2;
}

/** Primer nivel de detalle cuyo tamaño no queda más de 1,4 veces por debajo del que se dibuja. */
export function lodIndexFor(pxPerUnit: number): 0 | 1 | 2 {
  for (let i = 0; i < LOD_PPU.length - 1; i++) if (LOD_PPU[i] <= pxPerUnit * 1.4) return i as 0 | 1;
  return 2;
}

export function poseKeyFor(steer: number): PoseKey {
  return steer < -0.3 ? 'L' : steer > 0.3 ? 'R' : 'N';
}

/** Tamaño de cuadro que contiene el modelo desde los 32 ángulos. */
function frameBounds(model: Voxels, scale: number, pitch: number) {
  const sp = Math.sin(pitch);
  const cp = Math.cos(pitch);
  let maxX = 0;
  let minY = Infinity;
  let maxY = -Infinity;
  const surface = model.getSurface();
  for (let a = 0; a < ANGLES; a += 1) {
    const yaw = (a / ANGLES) * TAU;
    const sy = Math.sin(yaw);
    const cy = Math.cos(yaw);
    for (let i = 0; i < surface.length; i += 2) {
      const v = surface[i];
      const xc = v.x * cy + v.z * sy;
      const zc = -v.x * sy + v.z * cy;
      const up = (v.y * cp + zc * sp) * scale;
      const ax = Math.abs(xc * scale);
      if (ax > maxX) maxX = ax;
      if (up > maxY) maxY = up;
      if (up < minY) minY = up;
    }
  }
  const splat = Math.ceil(scale * 1.12);
  return {
    fw: Math.ceil(maxX * 2) + (PAD + splat) * 2,
    fh: Math.ceil(maxY - minY) + (PAD + splat) * 2,
    groundY: Math.ceil(maxY) + PAD + splat,
  };
}

class AtlasJob {
  private next = 0;
  readonly atlas: Atlas;
  private ctx: CanvasRenderingContext2D;
  private groundY: number;
  private scale: number;

  constructor(
    private model: Voxels,
    ppu: number,
    private pitch: number,
  ) {
    this.scale = ppu * VOXEL_UNITS;
    const b = frameBounds(model, this.scale, pitch);
    this.groundY = b.groundY;
    const canvas = document.createElement('canvas');
    canvas.width = b.fw * COLS;
    canvas.height = b.fh * Math.ceil(ANGLES / COLS);
    this.ctx = canvas.getContext('2d')!;
    this.atlas = { fw: b.fw, fh: b.fh, anchorX: b.fw / 2, anchorY: b.groundY, ppu, canvas };
  }

  /** Renderiza cuadros hasta agotar el tiempo. Devuelve true al terminar los 32. */
  step(deadline: number): boolean {
    while (this.next < ANGLES && performance.now() < deadline) {
      const i = this.next++;
      const image = renderVoxels(this.model, {
        yaw: (i / ANGLES) * TAU,
        pitch: this.pitch,
        scale: this.scale,
        width: this.atlas.fw,
        height: this.atlas.fh,
        groundY: this.groundY,
      });
      this.ctx.putImageData(image, (i % COLS) * this.atlas.fw, Math.floor(i / COLS) * this.atlas.fh);
    }
    return this.next >= ANGLES;
  }
}

interface Request {
  key: string;
  pilot: Pilot;
  pose: PoseKey;
  pitchIdx: number;
  lodIdx: number;
}

/**
 * Gestor de los sprites de los karts. Los atlas se generan por tandas con un presupuesto de
 * milisegundos para no frenar la carrera; mientras un atlas no está listo se usa el más
 * parecido que ya exista.
 */
export class KartSprites {
  private models = new Map<string, Voxels>();
  private atlases = new Map<string, Atlas>();
  private queue: Request[] = [];
  private job: { job: AtlasJob; key: string } | null = null;

  private static key(id: PilotId, pose: PoseKey, pitchIdx: number, lodIdx: number) {
    return `${id}:${pose}:${pitchIdx}:${lodIdx}`;
  }

  private model(pilot: Pilot, pose: PoseKey): Voxels {
    const key = `${pilot.id}:${pose}`;
    let m = this.models.get(key);
    if (!m) {
      m = buildKartModel(pilot, { steer: POSE_STEER[pose] });
      this.models.set(key, m);
    }
    return m;
  }

  /** Pide un atlas. Con `urgent` pasa al principio de la cola. */
  request(pilot: Pilot, pose: PoseKey, pitchIdx: number, lodIdx: number, urgent = false) {
    const key = KartSprites.key(pilot.id, pose, pitchIdx, lodIdx);
    if (this.atlases.has(key) || this.job?.key === key || this.queue.some((q) => q.key === key)) return;
    const req = { key, pilot, pose, pitchIdx, lodIdx };
    if (urgent) this.queue.unshift(req);
    else this.queue.push(req);
  }

  /** Genera atlas durante `budgetMs`. Devuelve true si aún queda trabajo. */
  pump(budgetMs: number): boolean {
    const deadline = performance.now() + budgetMs;
    while (performance.now() < deadline) {
      if (!this.job) {
        const req = this.queue.shift();
        if (!req) return false;
        this.job = {
          key: req.key,
          job: new AtlasJob(this.model(req.pilot, req.pose), LOD_PPU[req.lodIdx], PITCHES[req.pitchIdx]),
        };
      }
      if (this.job.job.step(deadline)) {
        this.atlases.set(this.job.key, this.job.job.atlas);
        this.job = null;
      }
    }
    return this.job !== null || this.queue.length > 0;
  }

  /** Atlas aún por generar (cola más el que está en curso). */
  pending() {
    return this.queue.length + (this.job ? 1 : 0);
  }

  /** Termina de forma síncrona todo lo pendiente (carga). */
  flush() {
    while (this.pump(1000)) {
      /* sigue hasta vaciar */
    }
  }

  /** El mejor atlas disponible para lo pedido: el exacto o el más cercano en pose, altura y tamaño. */
  best(id: PilotId, pose: PoseKey, pitchIdx: number, lodIdx: number): Atlas | null {
    const exact = this.atlases.get(KartSprites.key(id, pose, pitchIdx, lodIdx));
    if (exact) return exact;
    let best: Atlas | null = null;
    let bestCost = Infinity;
    for (const p of pose === 'N' ? (['N'] as const) : ([pose, 'N'] as const)) {
      for (let pi = 0; pi < PITCHES.length; pi++) {
        for (let li = 0; li < LOD_PPU.length; li++) {
          const a = this.atlases.get(KartSprites.key(id, p, pi, li));
          if (!a) continue;
          const cost = Math.abs(pi - pitchIdx) * 2 + Math.abs(li - lodIdx) + (p === pose ? 0 : 1.5);
          if (cost < bestCost) {
            bestCost = cost;
            best = a;
          }
        }
      }
    }
    return best;
  }

  /** Cuadros de un atlas dibujados a la escala de pantalla dada (píxeles por unidad). */
  static draw(
    ctx: CanvasRenderingContext2D,
    atlas: Atlas,
    rel: number,
    x: number,
    y: number,
    pxPerUnit: number,
    alpha = 1,
  ) {
    const idx = Math.round((((rel % TAU) + TAU) % TAU) / TAU * ANGLES) % ANGLES;
    const f = pxPerUnit / atlas.ppu;
    const dw = Math.max(1, Math.round(atlas.fw * f));
    const dh = Math.max(1, Math.round(atlas.fh * f));
    const dx = Math.round(x - atlas.anchorX * f);
    const dy = Math.round(y - atlas.anchorY * f);
    const smooth = f < 0.62;
    if (smooth) ctx.imageSmoothingEnabled = true;
    if (alpha !== 1) ctx.globalAlpha = alpha;
    ctx.drawImage(atlas.canvas, (idx % COLS) * atlas.fw, Math.floor(idx / COLS) * atlas.fh, atlas.fw, atlas.fh, dx, dy, dw, dh);
    if (alpha !== 1) ctx.globalAlpha = 1;
    if (smooth) ctx.imageSmoothingEnabled = false;
  }
}
