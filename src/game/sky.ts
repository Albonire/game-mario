import { mulberry } from '../utils/rng';
import { n2tp } from './terrain/noise';
import type { CloudSpec, LayerSpec, ThemeDef } from './themes';
import { angleDelta, clamp } from './track';
import type { Camera } from './types';
import { VIEW } from './view';

const TAU = Math.PI * 2;
/** Píxeles lógicos por radián en el centro de la pantalla (FOCAL del diseño original). */
const LOGICAL_FOCAL = 160;
/** Rumbo visible a cada lado del centro, un poco más que el campo de visión real (45 grados). */
const SPAN = 0.82;
const BANDS = 16;

function makeCanvas(w: number, h: number) {
  const c = document.createElement('canvas');
  c.width = Math.max(1, Math.ceil(w));
  c.height = Math.max(1, Math.ceil(h));
  return c;
}

/** Ruido 1D en el círculo: se repite exactamente cada vuelta, sin costura. */
function ring(t: number, freq: number, seed: number, octaves = 3) {
  let sum = 0;
  let amp = 0.5;
  let norm = 0;
  let f = freq;
  for (let i = 0; i < octaves; i++) {
    sum += n2tp(t * f, (seed * 13 + i * 31) % 250, f, 256) * amp;
    norm += amp;
    amp *= 0.5;
    f *= 2;
  }
  return sum / norm;
}

function shade(hex: string, k: number) {
  const n = parseInt(hex.replace('#', ''), 16);
  const f = (v: number) => Math.max(0, Math.min(255, Math.round(v * k)));
  return `rgb(${f((n >> 16) & 255)},${f((n >> 8) & 255)},${f(n & 255)})`;
}

/** Dibuja la silueta de una capa de horizonte en una tira que cubre 360 grados dos veces. */
function drawLayerStrip(layer: LayerSpec, pw: number, S: number): HTMLCanvasElement {
  const height = Math.ceil(layer.height * S + 4 * S);
  const strip = makeCanvas(pw * 2, height);
  const ctx = strip.getContext('2d')!;
  const base = strip.height;
  const rand = mulberry(layer.seed * 7919);
  ctx.globalAlpha = layer.alpha ?? 1;
  ctx.fillStyle = layer.color;

  const heightAt = (x: number): number => {
    const t = x / pw;
    switch (layer.kind) {
      case 'islands': {
        const v = ring(t, 5, layer.seed, 3);
        const island = Math.max(0, (v - 0.52) / 0.48);
        return layer.height * S * (0.12 + Math.pow(island, 0.8) * 0.9);
      }
      case 'dunes':
        return layer.height * S * (0.25 + 0.75 * ring(t, 6, layer.seed, 3));
      case 'mountains': {
        const v = ring(t, 4, layer.seed, 4);
        const ridge = 1 - Math.abs(2 * v - 1);
        return layer.height * S * (0.18 + 0.82 * Math.pow(ridge, 1.35));
      }
      default:
        return 0;
    }
  };

  if (layer.kind === 'mesas') {
    let x = 0;
    while (x < pw) {
      const w = (34 + rand() * 90) * S;
      const gap = (rand() * 60 + 8) * S;
      const h = layer.height * S * (0.45 + rand() * 0.55);
      const slope = 4 * S;
      ctx.fillStyle = layer.color;
      ctx.beginPath();
      ctx.moveTo(x, base);
      ctx.lineTo(x + slope, base - h);
      ctx.lineTo(x + w - slope, base - h);
      ctx.lineTo(x + w, base);
      ctx.closePath();
      ctx.fill();
      // Estratos y cara iluminada.
      ctx.fillStyle = shade(layer.color, 0.78);
      for (let y = base - h + 3 * S; y < base; y += (3 + rand() * 5) * S) ctx.fillRect(x + slope * 0.4, y, w - slope * 0.8, S);
      if (layer.rim) {
        ctx.fillStyle = layer.rim;
        ctx.fillRect(x + slope, base - h, w - slope * 2, 1.5 * S);
      }
      x += w + gap;
    }
  } else if (layer.kind === 'skyline') {
    let x = 0;
    while (x < pw) {
      const w = (7 + rand() * 16) * S;
      const tall = Math.pow(rand(), 1.6);
      const h = layer.height * S * (0.22 + 0.78 * tall);
      const right = Math.min(w, pw - x);
      ctx.fillStyle = layer.color;
      ctx.fillRect(x, base - h, right, h);
      if (layer.rim) {
        ctx.fillStyle = layer.rim;
        ctx.fillRect(x, base - h, right, S);
      }
      if (tall > 0.7 && right > 5 * S) {
        ctx.fillStyle = layer.color;
        ctx.fillRect(x + right / 2, base - h - 5 * S, S, 5 * S);
      }
      if (layer.accent) {
        const lit = [layer.accent, '#ffd98a', '#8be9ff'];
        for (let wy = base - h + 3 * S; wy < base - 2 * S; wy += 3.4 * S) {
          for (let wx = x + 1.5 * S; wx < x + right - 1.5 * S; wx += 2.8 * S) {
            if (rand() < 0.38) {
              ctx.fillStyle = lit[Math.floor(rand() * lit.length)];
              ctx.fillRect(wx, wy, 1.4 * S, 1.8 * S);
            }
          }
        }
      }
      x += w + (rand() < 0.3 ? rand() * 5 * S : 0);
    }
  } else {
    // Perfil continuo columna a columna: islas, dunas y montañas.
    const heights = new Float32Array(Math.ceil(pw) + 2);
    for (let x = 0; x < heights.length; x++) heights[x] = heightAt(Math.min(x, pw));
    for (let x = 0; x < Math.ceil(pw); x++) {
      const h = heights[x];
      const slope = heights[x + 1] - heights[x];
      const lit = slope < 0 ? 1.12 : 0.88;
      ctx.fillStyle = layer.kind === 'mountains' ? shade(layer.color, lit) : layer.color;
      ctx.fillRect(x, base - h, 1.2, h);
      if (layer.kind === 'mountains' && layer.accent && h > layer.height * S * 0.66) {
        const cap = (h - layer.height * S * 0.66) * 1.2;
        ctx.fillStyle = slope < 0 ? layer.accent : shade(layer.accent, 0.82);
        ctx.fillRect(x, base - h, 1.2, cap);
      }
      if (layer.rim && layer.kind !== 'mountains') {
        ctx.fillStyle = layer.rim;
        ctx.fillRect(x, base - h, 1.2, S);
      }
    }
  }
  // Duplicado para que cualquier ventana de rumbo sea contigua.
  ctx.globalAlpha = 1;
  ctx.drawImage(strip, 0, 0, pw, height, pw, 0, pw, height);
  return strip;
}

function drawStarsStrip(count: number, pw: number, S: number, rows: number): HTMLCanvasElement {
  const strip = makeCanvas(pw * 2, rows);
  const ctx = strip.getContext('2d')!;
  const rand = mulberry(4242);
  for (let i = 0; i < count; i++) {
    const x = rand() * pw;
    const y = Math.pow(rand(), 1.25) * rows * 0.92;
    const a = 0.35 + rand() * 0.65;
    const size = rand() > 0.93 ? 1.6 * S : S;
    ctx.fillStyle = `rgba(255, 252, 235, ${a})`;
    ctx.fillRect(x, y, size, size);
    ctx.fillRect(x + pw, y, size, size);
  }
  return strip;
}

export class SkyRenderer {
  private base: HTMLCanvasElement;
  private haze: HTMLCanvasElement;
  private layers: HTMLCanvasElement[];
  private stars: HTMLCanvasElement | null = null;
  private clouds: Array<{ angle: number; y: number; size: number; speed: number }> = [];
  private pw: number;

  constructor(private theme: ThemeDef) {
    const { W, HORIZON, S } = VIEW;
    this.pw = Math.round(TAU * LOGICAL_FOCAL * S);

    this.base = makeCanvas(W, HORIZON + 2);
    const bctx = this.base.getContext('2d')!;
    const sky = bctx.createLinearGradient(0, 0, 0, HORIZON + 14 * S);
    for (const stop of theme.sky) sky.addColorStop(stop.at, stop.color);
    bctx.fillStyle = sky;
    bctx.fillRect(0, 0, W, HORIZON + 2);

    this.haze = makeCanvas(W, 25 * S);
    const hctx = this.haze.getContext('2d')!;
    const haze = hctx.createLinearGradient(0, 0, 0, this.haze.height);
    haze.addColorStop(0, `${theme.haze.color}0)`);
    haze.addColorStop(0.55, `${theme.haze.color}${theme.haze.alpha})`);
    haze.addColorStop(1, `${theme.haze.color}${theme.haze.alpha * 0.2})`);
    hctx.fillStyle = haze;
    hctx.fillRect(0, 0, W, this.haze.height);

    this.layers = theme.layers.map((l) => drawLayerStrip(l, this.pw, S));
    if (theme.stars > 0) this.stars = drawStarsStrip(theme.stars, this.pw, S, HORIZON);

    if (theme.clouds) {
      const spec: CloudSpec = theme.clouds;
      const rand = mulberry(spec.seed * 101);
      for (let i = 0; i < spec.count; i++) {
        this.clouds.push({
          angle: (i / spec.count) * TAU + rand() * 0.5,
          y: spec.minY + rand() * (spec.maxY - spec.minY),
          size: 10 + rand() * 14,
          speed: 0.3 + rand() * 0.3,
        });
      }
    }
  }

  private panorama(ctx: CanvasRenderingContext2D, strip: HTMLCanvasElement, yaw: number, y: number) {
    const { W, FOCAL } = VIEW;
    const perRad = this.pw / TAU;
    const step = (SPAN * 2) / BANDS;
    for (let i = 0; i < BANDS; i++) {
      const r0 = -SPAN + i * step;
      const r1 = r0 + step;
      const x0 = W / 2 + FOCAL * Math.tan(r0);
      const x1 = W / 2 + FOCAL * Math.tan(r1);
      let src = (((yaw + r0) % TAU) + TAU) % TAU * perRad;
      src = Math.max(0, Math.min(this.pw - 1, src));
      ctx.drawImage(strip, src, 0, step * perRad, strip.height, Math.floor(x0), y, Math.ceil(x1 - Math.floor(x0)) + 1, strip.height);
    }
  }

  draw(ctx: CanvasRenderingContext2D, camera: Camera, time: number) {
    const { W, HORIZON, FOCAL, S } = VIEW;
    const yaw = camera.yaw;
    ctx.drawImage(this.base, 0, 0);
    if (this.stars) this.panorama(ctx, this.stars, yaw, 0);

    const sun = this.theme.celestial;
    if (sun) {
      const rel = angleDelta(yaw, sun.angle);
      if (Math.abs(rel) < 1.38) {
        const sx = W / 2 + Math.tan(rel) * FOCAL * 0.9;
        const sy = (sun.height + Math.abs(rel) * 7) * S;
        const glowR = 42 * S;
        const glow = ctx.createRadialGradient(sx, sy, 1, sx, sy, glowR);
        glow.addColorStop(0, `${sun.glow}.9)`);
        glow.addColorStop(0.25, `${sun.glow}.42)`);
        glow.addColorStop(1, `${sun.glow}0)`);
        ctx.fillStyle = glow;
        ctx.fillRect(sx - glowR, sy - glowR, glowR * 2, glowR * 2);
        ctx.fillStyle = sun.color;
        ctx.beginPath();
        ctx.arc(sx, sy, sun.size * S, 0, TAU);
        ctx.fill();
        if (sun.kind === 'moon') {
          ctx.fillStyle = 'rgba(120, 132, 160, 0.35)';
          for (const [cx, cy, cr] of [
            [-2.4, -1.8, 1.7],
            [2, 1.2, 1.3],
            [-0.6, 3, 1],
          ]) {
            ctx.beginPath();
            ctx.arc(sx + cx * S, sy + cy * S, cr * S, 0, TAU);
            ctx.fill();
          }
        }
      }
    }

    const cloud = this.theme.clouds;
    if (cloud) {
      ctx.save();
      ctx.scale(S, S);
      this.clouds.forEach((c, i) => {
        const rel = angleDelta(yaw, c.angle + Math.sin(time * 0.05 + i) * 0.02);
        if (Math.abs(rel) > 1.5) return;
        const x = W / S / 2 + Math.tan(clamp(rel, -1.25, 1.25)) * LOGICAL_FOCAL * 0.6;
        const y = c.y + Math.sin(time * 0.4 + i) * 1.5;
        const s = c.size;
        ctx.fillStyle = `${cloud.color}${i % 2 === 0 ? cloud.alpha : cloud.alpha * 0.75})`;
        ctx.beginPath();
        ctx.ellipse(x, y, s, s * 0.32, 0, 0, TAU);
        ctx.ellipse(x + s * 0.55, y + 1, s * 0.6, s * 0.24, 0, 0, TAU);
        ctx.ellipse(x - s * 0.6, y + 2, s * 0.55, s * 0.2, 0, 0, TAU);
        ctx.fill();
      });
      ctx.restore();
    }

    for (const strip of this.layers) this.panorama(ctx, strip, yaw, HORIZON + 1 - strip.height);
    ctx.drawImage(this.haze, 0, HORIZON - 8 * S);
  }
}
