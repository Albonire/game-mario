import type { ThemeDef } from '../themes';
import type { PropDef } from './propKit';
import { PROPS } from './props';
import { renderVoxels, type RGB, type Voxels } from './voxel';

/** Píxeles por unidad del mundo de cada nivel de detalle de los props. */
export const PROP_LOD_PPU = [9, 4.5, 2.25] as const;
/** Elevación con la que se prerenderizan: la cámara ve el escenario casi de frente. */
const PROP_PITCH = 0.16;
const PAD = 3;
/** Cuánto se funden con la bruma los niveles de detalle lejanos: lo pequeño es lo que está lejos. */
const LOD_HAZE = [0, 0.1, 0.24] as const;

export interface PropSprite {
  canvas: HTMLCanvasElement;
  /** Ancla: punto del lienzo donde cae el suelo bajo el centro del prop. */
  anchorX: number;
  anchorY: number;
  ppu: number;
}

function frameFor(model: Voxels, scale: number) {
  const sp = Math.sin(PROP_PITCH);
  const cp = Math.cos(PROP_PITCH);
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;
  for (const v of model.getSurface()) {
    const x = v.x * scale;
    const up = (v.y * cp + v.z * sp) * scale;
    if (x < minX) minX = x;
    if (x > maxX) maxX = x;
    if (up < minY) minY = up;
    if (up > maxY) maxY = up;
  }
  const splat = Math.ceil(scale * 1.12);
  const pad = PAD + splat;
  const half = Math.max(Math.abs(minX), Math.abs(maxX));
  return {
    fw: Math.ceil(half * 2) + pad * 2,
    fh: Math.ceil(maxY - minY) + pad * 2,
    groundY: Math.ceil(maxY) + pad,
  };
}

function render(model: Voxels, voxelUnits: number, ppu: number, lod: number, theme: ThemeDef): PropSprite {
  const scale = ppu * voxelUnits;
  const f = frameFor(model, scale);
  const image = renderVoxels(model, {
    yaw: 0,
    pitch: PROP_PITCH,
    scale,
    width: f.fw,
    height: f.fh,
    groundY: f.groundY,
    ambient: theme.ambient,
    haze: { color: theme.fog.color as RGB, amount: LOD_HAZE[lod] * theme.fog.max },
  });
  const canvas = document.createElement('canvas');
  canvas.width = f.fw;
  canvas.height = f.fh;
  canvas.getContext('2d')!.putImageData(image, 0, 0);
  return { canvas, anchorX: f.fw / 2, anchorY: f.groundY, ppu };
}

const glowCache = new Map<string, HTMLCanvasElement>();

/** Disco de luz con caída suave, prerenderizado por color. */
export function glowCanvas(rgb: string): HTMLCanvasElement {
  let c = glowCache.get(rgb);
  if (!c) {
    c = document.createElement('canvas');
    c.width = 64;
    c.height = 64;
    const g = c.getContext('2d')!;
    const grad = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    grad.addColorStop(0, `rgba(${rgb}, 1)`);
    grad.addColorStop(0.28, `rgba(${rgb}, 0.5)`);
    grad.addColorStop(0.62, `rgba(${rgb}, 0.14)`);
    grad.addColorStop(1, `rgba(${rgb}, 0)`);
    g.fillStyle = grad;
    g.fillRect(0, 0, 64, 64);
    glowCache.set(rgb, c);
  }
  return c;
}

/**
 * Props del escenario como sprites voxel: cada tipo tiene unas variantes y tres niveles de detalle.
 * Se generan por tandas; mientras falta uno se usa el más cercano que exista.
 */
export class PropSprites {
  private models = new Map<string, Voxels>();
  private sprites = new Map<string, PropSprite>();
  private queue: Array<{ key: string; type: string; variant: number; lod: number }> = [];
  private queued = new Set<string>();

  constructor(private theme: ThemeDef) {}

  private static key(type: string, variant: number, lod: number) {
    return `${type}:${variant}:${lod}`;
  }

  /** Variante y espejo estables para cada elemento según su posición. */
  static pick(def: PropDef, x: number, y: number): { variant: number; flip: boolean } {
    const h = Math.imul((x * 7.31) | 0, 374761393) ^ Math.imul((y * 3.17) | 0, 668265263);
    const u = (h >>> 0) / 4294967296;
    return { variant: Math.floor(u * def.variants) % def.variants, flip: !def.noFlip && ((h >>> 9) & 1) === 1 };
  }

  request(type: string, variant: number, lod: number, urgent = false) {
    lod = Math.max(lod, PROPS[type]?.minLod ?? 0);
    const key = PropSprites.key(type, variant, lod);
    if (this.sprites.has(key) || this.queued.has(key)) return;
    this.queued.add(key);
    const req = { key, type, variant, lod };
    if (urgent) this.queue.unshift(req);
    else this.queue.push(req);
  }

  private model(type: string, variant: number): Voxels {
    const key = `${type}:${variant}`;
    let m = this.models.get(key);
    if (!m) {
      m = PROPS[type].build(variant);
      this.models.set(key, m);
    }
    return m;
  }

  pending() {
    return this.queue.length;
  }

  /** Genera sprites durante `budgetMs`. Devuelve true si queda trabajo. */
  pump(budgetMs: number): boolean {
    const deadline = performance.now() + budgetMs;
    while (this.queue.length && performance.now() < deadline) {
      const req = this.queue.shift()!;
      const def = PROPS[req.type];
      const sprite = render(this.model(req.type, req.variant), def.voxel, PROP_LOD_PPU[req.lod], req.lod, this.theme);
      this.sprites.set(req.key, sprite);
    }
    return this.queue.length > 0;
  }

  flush() {
    while (this.pump(1000)) {
      /* hasta vaciar */
    }
  }

  /** El sprite pedido o el más cercano en tamaño de la misma variante. */
  best(type: string, variant: number, lod: number): PropSprite | null {
    const exact = this.sprites.get(PropSprites.key(type, variant, lod));
    if (exact) return exact;
    let best: PropSprite | null = null;
    let bestCost = Infinity;
    for (let l = 0; l < PROP_LOD_PPU.length; l++) {
      const s = this.sprites.get(PropSprites.key(type, variant, l));
      if (s && Math.abs(l - lod) < bestCost) {
        bestCost = Math.abs(l - lod);
        best = s;
      }
    }
    return best;
  }

  static lodFor(pxPerUnit: number): 0 | 1 | 2 {
    for (let i = 0; i < PROP_LOD_PPU.length - 1; i++) if (PROP_LOD_PPU[i] <= pxPerUnit * 1.4) return i as 0 | 1;
    return 2;
  }

  /** Dibuja el sprite con el suelo bajo (x, y); `pxPerUnit` es la escala de pantalla del elemento. */
  static draw(ctx: CanvasRenderingContext2D, s: PropSprite, x: number, y: number, pxPerUnit: number, flip: boolean) {
    const f = pxPerUnit / s.ppu;
    const dw = Math.max(1, Math.round(s.canvas.width * f));
    const dh = Math.max(1, Math.round(s.canvas.height * f));
    const dx = Math.round(x - s.anchorX * f);
    const dy = Math.round(y - s.anchorY * f);
    if (dx > ctx.canvas.width + 10 || dx + dw < -10 || dy > ctx.canvas.height + 10 || dy + dh < -10) return;
    const smooth = f < 0.62;
    if (smooth) ctx.imageSmoothingEnabled = true;
    if (flip) {
      ctx.save();
      ctx.translate(Math.round(x), 0);
      ctx.scale(-1, 1);
      ctx.drawImage(s.canvas, Math.round(-s.anchorX * f), dy, dw, dh);
      ctx.restore();
    } else {
      ctx.drawImage(s.canvas, dx, dy, dw, dh);
    }
    if (smooth) ctx.imageSmoothingEnabled = false;
  }
}
