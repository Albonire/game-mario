import { LIGHT_POOLS, PROP_SHADOW } from '../config';
import { MAP_SIZE, WORLD } from '../track';
import type { ThemeDef } from '../themes';
import type { Decoration, TrackData } from '../types';
import type { MarginField, RoadField } from './fields';
import { Mat, MAT_COUNT } from './materials';
import { fbm, hash2, n2 } from './noise';

export interface PaintInput {
  theme: ThemeDef;
  track: TrackData;
  mat: Uint8Array;
  road: RoadField;
  margin: MarginField;
  decorations: Decoration[];
  /** Cede el hilo si lleva demasiado tiempo y avisa del avance (0 a 1). */
  tick: (progress: number) => Promise<void>;
}

const DEFAULT_PALETTE: Record<number, [[number, number, number], [number, number, number]]> = {
  [Mat.SNOW]: [
    [242, 247, 252],
    [212, 228, 244],
  ],
  [Mat.SNOW_DEEP]: [
    [232, 242, 252],
    [196, 216, 238],
  ],
  [Mat.ICE]: [
    [168, 214, 238],
    [118, 176, 220],
  ],
  [Mat.CONCRETE]: [
    [124, 126, 134],
    [98, 100, 110],
  ],
  [Mat.WET]: [
    [32, 40, 54],
    [56, 50, 78],
  ],
};

const GRAY: [[number, number, number], [number, number, number]] = [
  [128, 128, 128],
  [100, 100, 100],
];

const FLOWERS: Array<[number, number, number]> = [
  [248, 226, 96],
  [250, 250, 244],
  [238, 128, 168],
  [226, 90, 70],
];

/** Pinta el color base del mapa (RGBA de MAP_SIZE x MAP_SIZE). */
export async function paintBase(input: PaintInput): Promise<Uint8ClampedArray<ArrayBuffer>> {
  const { theme, track, mat, road, margin } = input;
  const size = MAP_SIZE;
  const out = new Uint8ClampedArray(new ArrayBuffer(size * size * 4));
  const pts = track.points;
  const step = track.step;
  const ground = theme.ground;

  const palA = new Float32Array(MAT_COUNT * 3);
  const palB = new Float32Array(MAT_COUNT * 3);
  for (let m = 0; m < MAT_COUNT; m++) {
    const pair = ground.palette[m as keyof typeof ground.palette] ?? DEFAULT_PALETTE[m] ?? GRAY;
    for (let c = 0; c < 3; c++) {
      palA[m * 3 + c] = pair[0][c];
      palB[m * 3 + c] = pair[1][c];
    }
  }
  const line = ground.line;
  const [ambR, ambG, ambB] = theme.ambient;
  const ROAD = WORLD.ROAD_HALF;
  const CURB = WORLD.CURB_HALF;
  const sizeM = margin.size;
  const mdata = margin.data;
  const mScale = sizeM / size;

  for (let py = 0; py < size; py++) {
    if ((py & 63) === 0) await input.tick((py / size) * 0.7);
    const wy = py + 0.5;
    const mrow = Math.floor(py * mScale) * sizeM;
    for (let px = 0; px < size; px++) {
      const i = py * size + px;
      const m = mat[i];
      const wx = px + 0.5;
      const o = i * 4;
      const ia = m * 3;
      let r = 0;
      let g = 0;
      let b = 0;
      let bright = 1;

      const rd = road.dist[i];
      let lat = 0;
      let s = 0;
      let dist = 999;
      if (rd !== 255) {
        const k = road.idx[i];
        const p = pts[k];
        lat = (wx - p.x) * p.nx + (wy - p.y) * p.ny;
        s = k * step;
        dist = rd / 4;
      }
      const mg = mdata[mrow + Math.floor(px * mScale)];

      switch (m) {
        case Mat.ASPHALT:
        case Mat.WET: {
          const hi = n2(wx * 0.85, wy * 0.85);
          const mid = n2(wx * 0.14, wy * 0.14);
          const t = 0.55 * hi + 0.45 * mid;
          r = palA[ia] + (palB[ia] - palA[ia]) * t;
          g = palA[ia + 1] + (palB[ia + 1] - palA[ia + 1]) * t;
          b = palA[ia + 2] + (palB[ia + 2] - palA[ia + 2]) * t;
          const al = Math.abs(lat);
          const lane = Math.abs(al - 9);
          if (lane < 5) bright *= 1 - 0.07 * (1 - lane / 5);
          const h = hash2(px, py);
          if (h < 0.035) bright *= 1.22;
          else if (h > 0.97) bright *= 0.78;
          if (Math.abs(n2(wx * 0.05 + 3.1, wy * 0.05) - 0.5) < 0.0045) bright *= 0.6;
          if (n2(wx * 0.021 + 7.7, wy * 0.021) > 0.8) bright *= 0.9;
          if (m === Mat.ASPHALT) {
            // Líneas: borde continuo con desgaste y eje discontinuo.
            if (al > ROAD - 3.8 && al < ROAD - 2.0 && n2(wx * 0.2, wy * 0.2) > 0.18) {
              const k = 0.92 - 0.1 * hi;
              r += (line[0] - r) * k;
              g += (line[1] - g) * k;
              b += (line[2] - b) * k;
            } else if (al < 0.9 && ((s / 9) | 0) % 2 === 0 && n2(wx * 0.2, wy * 0.2) > 0.2) {
              r += (line[0] - r) * 0.55;
              g += (line[1] - g) * 0.55;
              b += (line[2] - b) * 0.55;
            }
          }
          break;
        }
        case Mat.CURB_A:
        case Mat.CURB_B: {
          const hi = n2(wx * 0.85, wy * 0.85);
          r = palA[ia] + (palB[ia] - palA[ia]) * hi;
          g = palA[ia + 1] + (palB[ia + 1] - palA[ia + 1]) * hi;
          b = palA[ia + 2] + (palB[ia + 2] - palA[ia + 2]) * hi;
          bright *= 0.95 + 0.1 * hash2(px, py);
          if (dist > CURB - 1.3) bright *= 0.82;
          else if (dist < ROAD + 1.2) bright *= 0.9;
          break;
        }
        case Mat.GRASS: {
          const lo = fbm(wx * 0.012, wy * 0.012, 3);
          const mid = n2(wx * 0.16, wy * 0.16);
          const t = Math.min(1, Math.max(0, lo * 1.3 - 0.15));
          r = palA[ia] + (palB[ia] - palA[ia]) * t;
          g = palA[ia + 1] + (palB[ia + 1] - palA[ia + 1]) * t;
          b = palA[ia + 2] + (palB[ia + 2] - palA[ia + 2]) * t;
          bright *= 0.9 + 0.2 * mid;
          // Franjas de corte del césped.
          bright *= ((((px * 0.866 + py * 0.5) / 54) | 0) & 1) === 0 ? 1.035 : 0.97;
          const h = hash2(px * 3 + 1, py * 5 + 2);
          if (h < 0.0016) {
            const f = FLOWERS[(h * 100000) % 4 | 0];
            r = f[0];
            g = f[1];
            b = f[2];
            bright = 1;
          } else if (h > 0.987) bright *= 0.8;
          else if (h > 0.97) bright *= 1.1;
          if (n2(wx * 0.02 + 19, wy * 0.02) > 0.8) {
            r += (palA[Mat.DIRT * 3] - r) * 0.35;
            g += (palA[Mat.DIRT * 3 + 1] - g) * 0.35;
            b += (palA[Mat.DIRT * 3 + 2] - b) * 0.35;
          }
          if (dist < CURB + 7) bright *= 0.9 + 0.1 * ((dist - CURB) / 7);
          break;
        }
        case Mat.SAND: {
          const lo = fbm(wx * 0.014, wy * 0.014, 3);
          const t = Math.min(1, Math.max(0, lo * 1.2 - 0.1));
          r = palA[ia] + (palB[ia] - palA[ia]) * t;
          g = palA[ia + 1] + (palB[ia + 1] - palA[ia + 1]) * t;
          b = palA[ia + 2] + (palB[ia + 2] - palA[ia + 2]) * t;
          const wave = Math.sin((wx * 0.55 + wy * 0.32) + fbm(wx * 0.03, wy * 0.03, 2) * 9);
          bright *= 1 + 0.04 * wave;
          const h = hash2(px, py);
          if (h < 0.01) bright *= 1.12;
          else if (h > 0.985) bright *= 0.85;
          if (mg >= 0 && mg < 24) bright *= 0.86 + 0.14 * (mg / 24);
          break;
        }
        case Mat.SHORE:
        case Mat.VOID: {
          // Profundidad bajo la línea de costa: de turquesa claro a azul profundo.
          const d = Math.max(0, -mg);
          const shoreT = Math.min(1, d / 34);
          const si = Mat.SHORE * 3;
          const vi = Mat.VOID * 3;
          const cr = palA[si] + (palB[si] - palA[si]) * shoreT;
          const cg = palA[si + 1] + (palB[si + 1] - palA[si + 1]) * shoreT;
          const cb = palA[si + 2] + (palB[si + 2] - palA[si + 2]) * shoreT;
          const depthT = Math.min(1, Math.max(0, (d - 20) / 190));
          const w = Math.min(1, Math.max(0, (d - 20) / 40));
          const vr = palA[vi] + (palB[vi] - palA[vi]) * depthT;
          const vg = palA[vi + 1] + (palB[vi + 1] - palA[vi + 1]) * depthT;
          const vb = palA[vi + 2] + (palB[vi + 2] - palA[vi + 2]) * depthT;
          r = cr + (vr - cr) * w;
          g = cg + (vg - cg) * w;
          b = cb + (vb - cb) * w;
          const swell = n2(wx * 0.018, wy * 0.05) * 0.5 + n2(wx * 0.05, wy * 0.02) * 0.5;
          bright *= 0.92 + 0.16 * swell;
          if (m === Mat.SHORE && d < 9) {
            const foam = n2(wx * 0.25, wy * 0.25);
            const k = (1 - d / 9) * (0.4 + 0.6 * foam);
            r += (theme.water.foam[0] - r) * k;
            g += (theme.water.foam[1] - g) * k;
            b += (theme.water.foam[2] - b) * k;
          }
          break;
        }
        case Mat.ROCK:
        case Mat.DIRT: {
          const lo = fbm(wx * 0.02, wy * 0.02, 3);
          const t = Math.min(1, Math.max(0, lo * 1.4 - 0.2));
          r = palA[ia] + (palB[ia] - palA[ia]) * t;
          g = palA[ia + 1] + (palB[ia + 1] - palA[ia + 1]) * t;
          b = palA[ia + 2] + (palB[ia + 2] - palA[ia + 2]) * t;
          bright *= 1 + 0.06 * Math.sin((wy + lo * 40) * 0.22) + (hash2(px, py) - 0.5) * 0.1;
          if (Math.abs(n2(wx * 0.06, wy * 0.06) - 0.5) < 0.012) bright *= 0.62;
          break;
        }
        case Mat.SNOW:
        case Mat.SNOW_DEEP: {
          const lo = fbm(wx * 0.014, wy * 0.014, 3);
          const mid = n2(wx * 0.11, wy * 0.11);
          const t = Math.min(1, Math.max(0, 1 - lo * 1.2 + (mid - 0.5) * 0.4));
          r = palA[ia] + (palB[ia] - palA[ia]) * t;
          g = palA[ia + 1] + (palB[ia + 1] - palA[ia + 1]) * t;
          b = palA[ia + 2] + (palB[ia + 2] - palA[ia + 2]) * t;
          bright *= 1 + 0.02 * Math.sin(wx * 0.2 + wy * 0.1 + lo * 8);
          if (hash2(px * 7, py * 3) < 0.0018) {
            r = 255;
            g = 255;
            b = 255;
            bright = 1;
          }
          break;
        }
        case Mat.ICE: {
          const lo = fbm(wx * 0.02, wy * 0.02, 3);
          const t = Math.min(1, Math.max(0, lo * 1.3 - 0.1));
          r = palA[ia] + (palB[ia] - palA[ia]) * t;
          g = palA[ia + 1] + (palB[ia + 1] - palA[ia + 1]) * t;
          b = palA[ia + 2] + (palB[ia + 2] - palA[ia + 2]) * t;
          if (dist <= CURB) {
            // Placa sobre la calzada: hielo negro, con el asfalto y sus líneas asomando debajo.
            const ai = Mat.ASPHALT * 3;
            const cover = 0.42 + 0.4 * lo;
            r = palA[ai] + (r - palA[ai]) * cover;
            g = palA[ai + 1] + (g - palA[ai + 1]) * cover;
            b = palA[ai + 2] + (b - palA[ai + 2]) * cover;
            const al = Math.abs(lat);
            const marked = (al > ROAD - 3.8 && al < ROAD - 2.0) || (al < 0.9 && ((s / 9) | 0) % 2 === 0);
            if (marked) {
              r += (line[0] - r) * 0.4;
              g += (line[1] - g) * 0.4;
              b += (line[2] - b) * 0.4;
            }
            const scratch = Math.abs(n2(wx * 0.07 + wy * 0.03, wy * 0.22) - 0.5);
            if (scratch < 0.013) {
              r += (255 - r) * 0.6;
              g += (255 - g) * 0.6;
              b += (255 - b) * 0.6;
            }
            bright *= 1 + 0.12 * (lo - 0.5);
            break;
          }
          const vein = 1 - Math.abs(2 * n2(wx * 0.04 + 5, wy * 0.014) - 1);
          if (vein > 0.97) {
            r += (255 - r) * 0.7;
            g += (255 - g) * 0.7;
            b += (255 - b) * 0.7;
          }
          bright *= 0.96 + 0.08 * n2(wx * 0.3, wy * 0.3);
          break;
        }
        case Mat.CONCRETE: {
          const lo = fbm(wx * 0.012, wy * 0.012, 3);
          const t = Math.min(1, Math.max(0, lo * 1.3 - 0.15));
          r = palA[ia] + (palB[ia] - palA[ia]) * t;
          g = palA[ia + 1] + (palB[ia + 1] - palA[ia + 1]) * t;
          b = palA[ia + 2] + (palB[ia + 2] - palA[ia + 2]) * t;
          if (px % 28 < 1 || py % 28 < 1) bright *= 0.78;
          bright *= 0.93 + 0.1 * hash2(px, py);
          break;
        }
        case Mat.WOOD:
        default: {
          const t = n2(wx * 0.5, wy * 0.05);
          r = palA[ia] + (palB[ia] - palA[ia]) * t;
          g = palA[ia + 1] + (palB[ia + 1] - palA[ia + 1]) * t;
          b = palA[ia + 2] + (palB[ia + 2] - palA[ia + 2]) * t;
          if (px % 7 === 0) bright *= 0.7;
          break;
        }
      }

      out[o] = r * bright * ambR;
      out[o + 1] = g * bright * ambG;
      out[o + 2] = b * bright * ambB;
      out[o + 3] = 255;
    }
  }
  return out;
}

/** Sombra suave de un prop sobre el suelo, desplazada en dirección opuesta al sol. */
function drawShadows(ctx: CanvasRenderingContext2D, theme: ThemeDef, decorations: Decoration[]) {
  const sun = theme.celestial?.angle ?? 2.15;
  const dirX = -Math.sin(sun);
  const dirY = Math.cos(sun);
  const night = theme.celestial?.kind === 'moon';
  const shadowColor = (k: number) => (night ? `rgba(4, 8, 20, ${0.4 * k})` : `rgba(16, 28, 24, ${0.36 * k})`);
  ctx.save();
  for (const d of decorations) {
    const spec = PROP_SHADOW[d.type];
    if (!spec) continue;
    const rx = spec.rx * d.scale;
    const ry = spec.ry * d.scale;
    const reach = spec.reach * d.scale;
    // Elipse con borde difuso: degradado radial dentro de un espacio escalado.
    const len = rx + reach * 0.5;
    ctx.save();
    ctx.translate(d.x + dirX * reach * 0.5, d.y + dirY * reach * 0.5);
    ctx.rotate(Math.atan2(dirY, dirX));
    ctx.scale(len, ry);
    const fade = ctx.createRadialGradient(0, 0, 0, 0, 0, 1);
    fade.addColorStop(0, shadowColor(1));
    fade.addColorStop(0.55, shadowColor(0.75));
    fade.addColorStop(1, shadowColor(0));
    ctx.fillStyle = fade;
    ctx.beginPath();
    ctx.arc(0, 0, 1, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
  ctx.restore();
}

/** Charcos de luz de farolas y rótulos, sumados al suelo para que brillen de noche. */
function drawLightPools(ctx: CanvasRenderingContext2D, decorations: Decoration[]) {
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (const d of decorations) {
    const pool = LIGHT_POOLS[d.type];
    if (!pool) continue;
    const r = pool.r * d.scale;
    const grad = ctx.createRadialGradient(d.x, d.y, 0, d.x, d.y, r);
    grad.addColorStop(0, `rgba(${pool.rgb}, ${pool.alpha})`);
    grad.addColorStop(0.55, `rgba(${pool.rgb}, ${pool.alpha * 0.32})`);
    grad.addColorStop(1, `rgba(${pool.rgb}, 0)`);
    ctx.fillStyle = grad;
    ctx.fillRect(d.x - r, d.y - r, r * 2, r * 2);
  }
  ctx.restore();
}

function drawStartLine(ctx: CanvasRenderingContext2D, track: TrackData) {
  const s = track.start;
  ctx.save();
  ctx.translate(s.x, s.y);
  ctx.rotate(s.angle);
  const cols = 14;
  const rows = 2;
  const w = WORLD.ROAD_HALF * 2;
  const cell = w / cols;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      ctx.fillStyle = (r + c) % 2 === 0 ? '#f4f0e2' : '#20292c';
      ctx.fillRect(-w / 2 + c * cell, -cell + r * cell, cell + 0.2, cell + 0.2);
    }
  }
  ctx.restore();
}

function drawBoostPad(ctx: CanvasRenderingContext2D, x: number, y: number, angle: number) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  const g = ctx.createLinearGradient(0, -22, 0, 22);
  g.addColorStop(0, '#ffe066');
  g.addColorStop(1, '#ea6a1e');
  ctx.fillStyle = 'rgba(20, 26, 28, 0.55)';
  ctx.beginPath();
  ctx.roundRect(-23, -21, 46, 42, 6);
  ctx.fill();
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.roundRect(-21, -19, 42, 38, 5);
  ctx.fill();
  ctx.fillStyle = '#1a2427';
  for (let i = -1; i <= 1; i++) {
    const oy = i * 10;
    ctx.beginPath();
    ctx.moveTo(-13, 7 + oy);
    ctx.lineTo(0, -5 + oy);
    ctx.lineTo(13, 7 + oy);
    ctx.lineTo(13, 12 + oy);
    ctx.lineTo(0, 0 + oy);
    ctx.lineTo(-13, 12 + oy);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
}

/** Decals, sombras y marcas pintadas encima del color base. Devuelve el mapa ya combinado. */
export async function paintDecals(base: Uint8ClampedArray<ArrayBuffer>, input: PaintInput): Promise<Uint8ClampedArray> {
  const canvas = document.createElement('canvas');
  canvas.width = MAP_SIZE;
  canvas.height = MAP_SIZE;
  const ctx = canvas.getContext('2d', { willReadFrequently: true })!;
  ctx.putImageData(new ImageData(base, MAP_SIZE, MAP_SIZE), 0, 0);
  drawShadows(ctx, input.theme, input.decorations);
  drawLightPools(ctx, input.decorations);
  drawStartLine(ctx, input.track);
  for (const pad of input.track.boostPads) drawBoostPad(ctx, pad.x, pad.y, pad.angle);
  await input.tick(0.9);
  return ctx.getImageData(0, 0, MAP_SIZE, MAP_SIZE).data;
}

/** Cadena de mipmaps por promedio de 2 x 2: devuelve [2048, 1024, 512, 256]. */
export function buildMips(base: Uint8ClampedArray): Uint8ClampedArray[] {
  const levels: Uint8ClampedArray[] = [base];
  let size = MAP_SIZE;
  let prev = base;
  for (let l = 1; l <= 3; l++) {
    const half = size >> 1;
    const next = new Uint8ClampedArray(half * half * 4);
    for (let y = 0; y < half; y++) {
      for (let x = 0; x < half; x++) {
        const a = ((y * 2) * size + x * 2) * 4;
        const b = a + 4;
        const c = a + size * 4;
        const d = c + 4;
        const o = (y * half + x) * 4;
        next[o] = (prev[a] + prev[b] + prev[c] + prev[d]) >> 2;
        next[o + 1] = (prev[a + 1] + prev[b + 1] + prev[c + 1] + prev[d + 1]) >> 2;
        next[o + 2] = (prev[a + 2] + prev[b + 2] + prev[c + 2] + prev[d + 2]) >> 2;
        next[o + 3] = 255;
      }
    }
    levels.push(next);
    prev = next;
    size = half;
  }
  return levels;
}
