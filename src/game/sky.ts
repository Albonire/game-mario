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

function parseHex(hex: string): [number, number, number] {
  const n = parseInt(hex.replace('#', ''), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/**
 * Cordillera de picos: cada cumbre tiene una cara iluminada a la izquierda y otra en sombra a la
 * derecha, barrancos que bajan en diagonal y una capa de nieve con borde dentado. Se calcula por
 * píxel una sola vez por tema.
 */
function drawMountainStrip(layer: LayerSpec, pw: number, S: number): HTMLCanvasElement {
  const height = Math.ceil(layer.height * S + 4 * S);
  const strip = makeCanvas(pw * 2, height);
  const w = Math.ceil(pw);
  const ctx = strip.getContext('2d')!;
  const img = ctx.createImageData(w, height);
  const data = img.data;
  const base = height;
  const peakH = layer.height * S;
  const rand = mulberry(layer.seed * 4801 + 17);

  interface Peak {
    x: number;
    h: number;
    half: number;
  }
  const peaks: Peak[] = [];
  for (let x = -40 * S; x < pw + 40 * S; ) {
    const r = rand();
    const h = peakH * (0.34 + 0.66 * Math.pow(rand(), 0.7));
    peaks.push({ x, h, half: h * (0.95 + r * 0.55) });
    x += (14 + rand() * 40) * S;
  }
  // Las cumbres del borde se repiten al otro lado para que la tira cierre sin costura.
  const first = peaks.filter((p) => p.x < 60 * S).map((p) => ({ ...p, x: p.x + pw }));
  const last = peaks.filter((p) => p.x > pw - 60 * S).map((p) => ({ ...p, x: p.x - pw }));
  peaks.push(...first, ...last);

  const rock = parseHex(layer.color);
  const snow = parseHex(layer.accent ?? '#ffffff');
  const alpha = Math.round((layer.alpha ?? 1) * 255);
  for (let x = 0; x < w; x++) {
    const t = x / pw;
    // Cumbre que domina esta columna y su altura (con dientes de sierra en la arista).
    let h = 0;
    let owner: Peak | null = null;
    for (const p of peaks) {
      const dx = Math.abs(x - p.x);
      if (dx > p.half) continue;
      const jag = (n2tp(t * 260, p.x * 0.01, 260, 256) - 0.5) * p.h * 0.1;
      const v = p.h * (1 - dx / p.half) + jag * (1 - dx / p.half);
      if (v > h) {
        h = v;
        owner = p;
      }
    }
    if (!owner || h < 1) continue;
    const lit = x < owner.x;
    const top = Math.max(0, Math.floor(base - h));
    const snowLine = owner.h * 0.6 + (n2tp(t * 190, owner.x * 0.02, 190, 256) - 0.5) * owner.h * 0.2;
    for (let y = top; y < base; y++) {
      const hy = base - y;
      // Barrancos: vetas oscuras que siguen la pendiente de la cara.
      const gully = n2tp(t * 150 + (lit ? 1 : -1) * y * 0.05, y * 0.12, 150, 256);
      const streak = gully > 0.62 ? 0.78 : gully < 0.28 ? 1.1 : 1;
      const depth = Math.min(1, (h - hy) / Math.max(1, owner.h * 0.9));
      const faceLight = (lit ? 1.1 : 0.74) * streak * (1 - depth * 0.1);
      let r = rock[0] * faceLight;
      let g = rock[1] * faceLight;
      let b = rock[2] * faceLight * (lit ? 1 : 1.08);
      if (layer.accent && hy > snowLine) {
        const k = lit ? 1 : 0.8;
        const sk = streak > 1 ? 1.03 : streak < 1 ? 0.92 : 1;
        r = snow[0] * k * sk;
        g = snow[1] * k * sk;
        b = Math.min(255, snow[2] * (lit ? 1 : 0.95) * sk);
      }
      // Bruma azulada que sube desde la base del valle.
      const fog = Math.max(0, 1 - hy / (peakH * 0.5)) * 0.4;
      r += (196 - r) * fog;
      g += (212 - g) * fog;
      b += (232 - b) * fog;
      const i = (y * w + x) * 4;
      data[i] = Math.min(255, r);
      data[i + 1] = Math.min(255, g);
      data[i + 2] = Math.min(255, b);
      data[i + 3] = alpha;
    }
  }
  ctx.putImageData(img, 0, 0);
  ctx.drawImage(strip, 0, 0, w, height, w, 0, w, height);
  return strip;
}

/** Dibuja la silueta de una capa de horizonte en una tira que cubre 360 grados dos veces. */
function drawLayerStrip(layer: LayerSpec, pw: number, S: number): HTMLCanvasElement {
  if (layer.kind === 'mountains') return drawMountainStrip(layer, pw, S);
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
        const island = clamp((v - 0.47) / 0.15, 0, 1);
        return layer.height * S * (0.05 + Math.pow(island, 0.75) * 0.95);
      }
      case 'dunes':
        return layer.height * S * (0.25 + 0.75 * ring(t, 6, layer.seed, 3));
      default:
        return 0;
    }
  };

  if (layer.kind === 'mesas') {
    // Mesas con talud, farallones escalonados y tapa plana, iluminadas desde la izquierda.
    const profile: Array<[number, number]> = [
      [-1.35, 0],
      [-1.04, 0.3],
      [-0.98, 0.3],
      [-0.95, 0.64],
      [-0.86, 0.66],
      [-0.84, 1],
      [-0.55, 1],
      [-0.3, 0.97],
      [0.15, 1],
      [0.5, 0.96],
      [0.82, 1],
      [0.86, 0.66],
      [0.95, 0.64],
      [0.98, 0.3],
      [1.04, 0.3],
      [1.35, 0],
    ];
    let x = 0;
    while (x < pw) {
      const w = (22 + rand() * 46) * S;
      const h = layer.height * S * (0.5 + rand() * 0.5);
      const cx = x + w * 1.35;
      const gap = (rand() * 50 + 4) * S;
      const pts = profile.map(([dx, dy], i) => [cx + dx * w, base - dy * h * (i > 4 && i < 11 ? 0.98 + rand() * 0.04 : 1)] as const);
      const draw = (shift: number) => {
        ctx.save();
        ctx.beginPath();
        pts.forEach(([px, py], i) => (i ? ctx.lineTo(px + shift, py) : ctx.moveTo(px + shift, py)));
        ctx.closePath();
        const grad = ctx.createLinearGradient(cx - w * 1.2 + shift, 0, cx + w * 1.2 + shift, 0);
        grad.addColorStop(0, shade(layer.color, 1.14));
        grad.addColorStop(0.55, layer.color);
        grad.addColorStop(1, shade(layer.color, 0.76));
        ctx.fillStyle = grad;
        ctx.fill();
        ctx.clip();
        // Estratos: vetas horizontales a distintas alturas.
        for (let y = base - h + 2 * S; y < base; y += (2.4 + rand() * 4) * S) {
          ctx.fillStyle = rand() < 0.5 ? 'rgba(40, 14, 8, 0.16)' : 'rgba(255, 220, 180, 0.1)';
          ctx.fillRect(cx - w * 1.4 + shift, y, w * 2.8, rand() < 0.4 ? 1.5 * S : S);
        }
        // Surcos verticales en el farallón.
        ctx.fillStyle = 'rgba(40, 14, 8, 0.14)';
        for (let k = 0; k < 5; k++) {
          const gx = cx + (rand() * 1.6 - 0.8) * w + shift;
          ctx.fillRect(gx, base - h * 0.95, 1.2 * S, h * 0.62);
        }
        if (layer.rim) {
          ctx.fillStyle = layer.rim;
          ctx.fillRect(cx - w * 0.86 + shift, base - h, w * 1.72, 1.4 * S);
        }
        ctx.restore();
      };
      draw(0);
      x += w * 2.7 + gap;
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
    // Perfil continuo columna a columna: islas y dunas.
    const heights = new Float32Array(Math.ceil(pw) + 2);
    for (let x = 0; x < heights.length; x++) heights[x] = heightAt(Math.min(x, pw));
    for (let x = 0; x < Math.ceil(pw); x++) {
      const h = heights[x];
      ctx.fillStyle = layer.color;
      ctx.fillRect(x, base - h, 1, h);
      if (layer.rim) {
        ctx.fillStyle = layer.rim;
        ctx.fillRect(x, base - h, 1, S);
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
