import type { GameMap } from './map';
import type { Camera } from './types';
import { MAP_SIZE, WORLD, angleDelta, clamp } from './track';

const { W, H, HORIZON, CAM_H, FOCAL } = WORLD;
const TAU = Math.PI * 2;
const SUN_ANGLE = 2.15;
const HAZE = { r: 191, g: 224, b: 211 };

interface Cloud {
  angle: number;
  y: number;
  size: number;
  speed: number;
}

const CLOUDS: Cloud[] = [
  { angle: -2.7, y: 18, size: 18, speed: 0.4 },
  { angle: -1.6, y: 27, size: 12, speed: 0.6 },
  { angle: -0.5, y: 16, size: 22, speed: 0.3 },
  { angle: 0.6, y: 31, size: 13, speed: 0.5 },
  { angle: 1.5, y: 20, size: 17, speed: 0.35 },
  { angle: 2.6, y: 28, size: 10, speed: 0.5 },
];

export class Mode7Renderer {
  private data: ImageData;
  private buffer: Uint8ClampedArray;
  private time = 0;

  constructor(private map: GameMap) {
    this.data = new ImageData(W, H - HORIZON - 1);
    this.buffer = this.data.data;
  }

  private drawSky(ctx: CanvasRenderingContext2D, camera: Camera, time: number) {
    const sky = ctx.createLinearGradient(0, 0, 0, HORIZON + 14);
    sky.addColorStop(0, '#155d7a');
    sky.addColorStop(0.38, '#3e91a7');
    sky.addColorStop(0.7, '#8dc9c7');
    sky.addColorStop(1, '#e8e5bd');
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, W, HORIZON + 16);

    const sunRel = angleDelta(camera.yaw, SUN_ANGLE);
    if (Math.abs(sunRel) < 1.38) {
      const sx = W / 2 + Math.tan(sunRel) * FOCAL * 0.72;
      const sy = 25 + Math.abs(sunRel) * 7;
      const glow = ctx.createRadialGradient(sx, sy, 1, sx, sy, 42);
      glow.addColorStop(0, 'rgba(255, 249, 205, .95)');
      glow.addColorStop(0.22, 'rgba(255, 235, 164, .5)');
      glow.addColorStop(1, 'rgba(255, 226, 157, 0)');
      ctx.fillStyle = glow;
      ctx.fillRect(sx - 44, sy - 44, 88, 88);
      ctx.fillStyle = '#fff9d5';
      ctx.beginPath();
      ctx.arc(sx, sy, 8, 0, TAU);
      ctx.fill();
    }

    // Nubes en capas, con paralaje según el giro de la cámara.
    CLOUDS.forEach((cloud, i) => {
      const rel = angleDelta(camera.yaw, cloud.angle + Math.sin(time * 0.00005 + i) * 0.02);
      if (Math.abs(rel) > 1.5) return;
      const x = W / 2 + Math.tan(clamp(rel, -1.25, 1.25)) * FOCAL * 0.6;
      const y = cloud.y + Math.sin(time * 0.0004 + i) * 1.5;
      const s = cloud.size;
      ctx.fillStyle = i % 2 === 0 ? 'rgba(241, 244, 218, .32)' : 'rgba(230, 243, 238, .24)';
      ctx.beginPath();
      ctx.ellipse(x, y, s, s * 0.32, 0, 0, TAU);
      ctx.ellipse(x + s * 0.55, y + 1, s * 0.6, s * 0.24, 0, 0, TAU);
      ctx.ellipse(x - s * 0.6, y + 2, s * 0.55, s * 0.2, 0, 0, TAU);
      ctx.fill();
    });

    // Islas remotas en el horizonte.
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, HORIZON - 10, W, 11);
    ctx.clip();
    const shift = Math.sin(camera.yaw) * 30;
    ctx.fillStyle = 'rgba(103, 153, 142, .4)';
    ctx.beginPath();
    ctx.moveTo(-20 + shift, HORIZON + 1);
    for (let x = -20; x <= W + 20; x += 8) {
      const y = HORIZON - 2 - Math.sin(x * 0.035 + camera.yaw * 1.5) * 2 - Math.sin(x * 0.012) * 3;
      ctx.lineTo(x + shift, y);
    }
    ctx.lineTo(W + 20 + shift, HORIZON + 1);
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    // Bruma cálida sobre el mar.
    const haze = ctx.createLinearGradient(0, HORIZON - 8, 0, HORIZON + 16);
    haze.addColorStop(0, 'rgba(240, 232, 196, 0)');
    haze.addColorStop(0.55, 'rgba(235, 232, 204, .45)');
    haze.addColorStop(1, 'rgba(209, 231, 213, .1)');
    ctx.fillStyle = haze;
    ctx.fillRect(0, HORIZON - 8, W, 25);
  }

  private drawGround(ctx: CanvasRenderingContext2D, camera: Camera) {
    const { x: camX, y: camY, yaw } = camera;
    const dirX = Math.sin(yaw);
    const dirY = -Math.cos(yaw);
    const rightX = Math.cos(yaw);
    const rightY = Math.sin(yaw);
    const pixels = this.map.pixels;
    const out = this.buffer;
    let offset = 0;
    const halfW = W / 2;

    for (let sy = HORIZON + 1; sy < H; sy++) {
      const depth = sy - HORIZON;
      const z = (CAM_H * FOCAL) / depth;
      const step = z / FOCAL;
      const startX = camX + dirX * z - rightX * halfW * step;
      const startY = camY + dirY * z - rightY * halfW * step;
      const dx = rightX * step;
      const dy = rightY * step;
      const fog = clamp((z - 170) / 950, 0, 0.9);
      const fr = HAZE.r;
      const fg = HAZE.g;
      const fb = HAZE.b;
      const inv = 1 - fog;
      let wx = startX;
      let wy = startY;
      for (let sx = 0; sx < W; sx++) {
        const mx = (wx | 0) & (MAP_SIZE - 1);
        const my = (wy | 0) & (MAP_SIZE - 1);
        const src = (my * MAP_SIZE + mx) * 4;
        out[offset] = pixels[src] * inv + fr * fog;
        out[offset + 1] = pixels[src + 1] * inv + fg * fog;
        out[offset + 2] = pixels[src + 2] * inv + fb * fog;
        out[offset + 3] = 255;
        offset += 4;
        wx += dx;
        wy += dy;
      }
    }
    ctx.putImageData(this.data, 0, HORIZON + 1);
  }

  render(ctx: CanvasRenderingContext2D, camera: Camera, dt: number) {
    this.time += dt * 1000;
    ctx.imageSmoothingEnabled = false;
    this.drawSky(ctx, camera, this.time);
    this.drawGround(ctx, camera);
    // Banda luminosa exactamente en el horizonte.
    ctx.fillStyle = 'rgba(242, 238, 208, .35)';
    ctx.fillRect(0, HORIZON, W, 1);
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
  const scale = visible ? FOCAL / forward : 0;
  return {
    x: W / 2 + right * scale,
    y: HORIZON + CAM_H * scale,
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
  if (w < 0.7 || w > 900) return;
  const x = p.x - w / 2;
  const y = p.y - h - (opts.lift ?? 0) * p.scale;
  if (x > W + 10 || x + w < -10 || y > H + 8) return;
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
