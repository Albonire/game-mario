import { WORLD, angleDelta, clamp, MAP_SIZE } from './track';
import { DETAIL_STRENGTH, getDetailTextures } from './terrain/detail';
import { Detail, MAT_DETAIL } from './terrain/materials';
import type { WorldData } from './terrain/world';
import type { ThemeDef } from './themes';
import { SkyRenderer } from './sky';
import type { Camera } from './types';
import { VIEW } from './view';

const { CAM_H } = WORLD;

export class Mode7Renderer {
  private image: ImageData;
  private out32: Uint32Array;
  private lv32: Uint32Array[];
  private mat: Uint8Array;
  private theme: ThemeDef;
  private sky: SkyRenderer;
  private time = 0;
  private matDetail = Uint8Array.from(MAT_DETAIL);
  private strength: Float32Array;
  private detail: Uint8Array;

  constructor(world: WorldData) {
    this.theme = world.def.theme;
    this.mat = world.mat;
    this.lv32 = world.levels.map((l) => new Uint32Array(l.buffer, l.byteOffset, l.length >> 2));
    this.image = new ImageData(VIEW.W, VIEW.H - VIEW.HORIZON - 1);
    this.out32 = new Uint32Array(this.image.data.buffer);
    this.sky = new SkyRenderer(this.theme);
    this.strength = DETAIL_STRENGTH;
    this.detail = getDetailTextures();
  }

  private drawGround(ctx: CanvasRenderingContext2D, camera: Camera) {
    const { W, H, HORIZON, FOCAL } = VIEW;
    const { x: camX, y: camY, yaw } = camera;
    const dirX = Math.sin(yaw);
    const dirY = -Math.cos(yaw);
    const rightX = Math.cos(yaw);
    const rightY = Math.sin(yaw);
    const out = this.out32;
    const lv = this.lv32;
    const mat = this.mat;
    const matDetail = this.matDetail;
    const detail = this.detail;
    const strength = this.strength;
    const time = this.time;
    const theme = this.theme;
    const fogCfg = theme.fog;
    const [ambR, ambG, ambB] = theme.ambient;
    const sparkle = theme.water.sparkle * 70;
    const halfW = W / 2;
    const MASK = MAP_SIZE - 1;
    let o = 0;

    for (let sy = HORIZON + 1; sy < H; sy++) {
      const depth = sy - HORIZON;
      const z = (CAM_H * FOCAL) / depth;
      const stepX = z / FOCAL;
      const dz = (z * z) / (CAM_H * FOCAL);
      // Nivel de mipmap según la huella del píxel en el mapa (1 texel = 1 unidad).
      const footprint = Math.max(stepX, dz * 0.45);
      const level = footprint < 1.5 ? 0 : footprint < 3 ? 1 : footprint < 6 ? 2 : 3;
      const buf = lv[level];
      const lsz = MAP_SIZE >> level;
      const lmask = lsz - 1;
      const inv = 1 / (1 << level);
      const texPerPx = stepX * inv;
      const bilinear = texPerPx < 0.8;
      // Bilineal afilado: la transición entre texeles dura ~2,6 píxeles de pantalla, no un texel entero.
      const invSX = 1 / Math.min(1, texPerPx * 2.6);
      const invSY = 1 / Math.min(1, dz * inv * 2.6);
      const fog = clamp((z - fogCfg.start) / (fogCfg.end - fogCfg.start), 0, fogCfg.max);
      const keep = 1 - fog;
      const fr = fogCfg.color[0] * fog;
      const fg = fogCfg.color[1] * fog;
      const fb = fogCfg.color[2] * fog;
      const kr = keep * ambR;
      const kg = keep * ambG;
      const kb = keep * ambB;
      const detailAmp = z < 36 ? 1 : z > 130 ? 0 : 1 - (z - 36) / 94;
      const waterAmp = z < 70 ? 1 : z > 420 ? 0 : 1 - (z - 70) / 350;

      let wobble = 0;
      if (theme.heat > 0 && depth < 60) wobble = Math.sin(time * 2.4 + depth * 0.8) * theme.heat * (1 - depth / 60);
      const startX = camX + dirX * z - rightX * (halfW * stepX - wobble);
      const startY = camY + dirY * z - rightY * (halfW * stepX - wobble);
      const dx = rightX * stepX;
      const dy = rightY * stepX;
      let wx = startX;
      let wy = startY;

      for (let sx = 0; sx < W; sx++) {
        let r: number;
        let g: number;
        let b: number;

        if (bilinear) {
          const fx = wx * inv - 0.5;
          const fy = wy * inv - 0.5;
          const ix = Math.floor(fx);
          const iy = Math.floor(fy);
          let tx = (fx - ix - 0.5) * invSX + 0.5;
          let ty = (fy - iy - 0.5) * invSY + 0.5;
          tx = tx < 0 ? 0 : tx > 1 ? 1 : tx;
          ty = ty < 0 ? 0 : ty > 1 ? 1 : ty;
          const x0 = ix & lmask;
          const x1 = (ix + 1) & lmask;
          const y0 = (iy & lmask) * lsz;
          const y1 = ((iy + 1) & lmask) * lsz;
          const p00 = buf[y0 + x0];
          const p10 = buf[y0 + x1];
          const p01 = buf[y1 + x0];
          const p11 = buf[y1 + x1];
          const w00 = (1 - tx) * (1 - ty);
          const w10 = tx * (1 - ty);
          const w01 = (1 - tx) * ty;
          const w11 = tx * ty;
          r = (p00 & 255) * w00 + (p10 & 255) * w10 + (p01 & 255) * w01 + (p11 & 255) * w11;
          g = ((p00 >> 8) & 255) * w00 + ((p10 >> 8) & 255) * w10 + ((p01 >> 8) & 255) * w01 + ((p11 >> 8) & 255) * w11;
          b = ((p00 >> 16) & 255) * w00 + ((p10 >> 16) & 255) * w10 + ((p01 >> 16) & 255) * w01 + ((p11 >> 16) & 255) * w11;
        } else {
          const p = buf[((wy * inv) & lmask) * lsz + ((wx * inv) & lmask)];
          r = p & 255;
          g = (p >> 8) & 255;
          b = (p >> 16) & 255;
        }

        // Capa de detalle: textura fina por material, con desvanecimiento por distancia.
        if (detailAmp > 0 || waterAmp > 0) {
          const mi = ((wy & MASK) * MAP_SIZE) + (wx & MASK);
          const cls = matDetail[mat[mi]];
          if (cls === Detail.WATER || cls === Detail.FOAM) {
            if (waterAmp > 0) {
              const u1 = ((wx * 2 + time * 14) | 0) & 255;
              const v1 = ((wy * 2 + time * 9) | 0) & 255;
              const u2 = ((wx * 3 - time * 10) | 0) & 255;
              const v2 = ((wy * 3 + time * 12) | 0) & 255;
              const base = Detail.WATER << 16;
              const a = detail[base | (v1 << 8) | u1];
              const c = detail[base | (v2 << 8) | u2];
              let k = 1 + ((a + c - 256) / 256) * 0.16 * waterAmp;
              if (cls === Detail.FOAM) {
                const f = detail[(Detail.FOAM << 16) | (v2 << 8) | u1];
                k += ((f - 128) / 128) * 0.28 * waterAmp * (0.55 + 0.45 * Math.sin(time * 1.5 + wx * 0.04 + wy * 0.03));
              }
              r *= k;
              g *= k;
              b *= k;
              if (a > 238 && c > 228) {
                const glint = sparkle * waterAmp;
                r += glint;
                g += glint;
                b += glint * 0.9;
              }
            }
          } else if (detailAmp > 0) {
            const d = detail[(cls << 16) | ((((wy * 4) | 0) & 255) << 8) | (((wx * 4) | 0) & 255)];
            const k = 1 + ((d - 128) / 128) * strength[cls] * detailAmp;
            r *= k;
            g *= k;
            b *= k;
          }
        }

        const rr = r * kr + fr;
        const gg = g * kg + fg;
        const bb = b * kb + fb;
        out[o++] =
          0xff000000 |
          ((bb > 255 ? 255 : bb < 0 ? 0 : bb | 0) << 16) |
          ((gg > 255 ? 255 : gg < 0 ? 0 : gg | 0) << 8) |
          (rr > 255 ? 255 : rr < 0 ? 0 : rr | 0);
        wx += dx;
        wy += dy;
      }
    }
    ctx.putImageData(this.image, 0, HORIZON + 1);
  }

  render(ctx: CanvasRenderingContext2D, camera: Camera, dt: number) {
    this.time += dt;
    ctx.imageSmoothingEnabled = false;
    this.sky.draw(ctx, camera, this.time);
    this.drawGround(ctx, camera);
  }
}

export interface Projected {
  x: number;
  y: number;
  scale: number;
  forward: number;
  right: number;
  visible: boolean;
}

export function project(camera: Camera, x: number, y: number): Projected {
  const dx = x - camera.x;
  const dy = y - camera.y;
  const forward = dx * Math.sin(camera.yaw) + dy * -Math.cos(camera.yaw);
  const right = dx * Math.cos(camera.yaw) + dy * Math.sin(camera.yaw);
  const visible = forward > 3.5;
  const scale = visible ? VIEW.FOCAL / forward : 0;
  return {
    x: VIEW.W / 2 + right * scale,
    y: VIEW.HORIZON + CAM_H * scale,
    scale,
    forward,
    right,
    visible,
  };
}

export function drawWorldSprite(
  ctx: CanvasRenderingContext2D,
  sprite: HTMLCanvasElement,
  camera: Camera,
  worldX: number,
  worldY: number,
  widthUnits: number,
  opts: { alpha?: number; flip?: number; lift?: number } = {},
) {
  const p = project(camera, worldX, worldY);
  if (!p.visible) return;
  const w = widthUnits * p.scale;
  const h = w * (sprite.height / sprite.width);
  if (w < 0.7 || w > 1800) return;
  const x = p.x - w / 2;
  const y = p.y - h - (opts.lift ?? 0) * p.scale;
  if (x > VIEW.W + 10 || x + w < -10 || y > VIEW.H + 8) return;
  ctx.save();
  if (opts.alpha !== undefined) ctx.globalAlpha = opts.alpha;
  if (opts.flip) {
    ctx.translate(p.x, y);
    ctx.scale(-1, 1);
    ctx.drawImage(sprite, -w / 2, 0, w, h);
  } else {
    ctx.drawImage(sprite, x, y, w, h);
  }
  ctx.restore();
}

export { angleDelta };
