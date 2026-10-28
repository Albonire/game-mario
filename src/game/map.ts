import { ISLAND, MAP_SIZE, WORLD, islandBoundary } from './track';
import type { TrackData } from './types';

export interface GameMap {
  size: number;
  canvas: HTMLCanvasElement;
  pixels: Uint8ClampedArray;
}

function mulberry(seed: number) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function islandPath(inset = 0) {
  const path = new Path2D();
  for (let i = 0; i <= 256; i++) {
    const a = (i / 256) * Math.PI * 2;
    const r = Math.max(120, islandBoundary(a) - inset);
    const x = ISLAND.cx + Math.cos(a) * r;
    const y = ISLAND.cy + Math.sin(a) * r * ISLAND.sy;
    if (i === 0) path.moveTo(x, y);
    else path.lineTo(x, y);
  }
  path.closePath();
  return path;
}

function trackPath(track: TrackData) {
  const path = new Path2D();
  track.fine.forEach((p, i) => (i === 0 ? path.moveTo(p.x, p.y) : path.lineTo(p.x, p.y)));
  path.closePath();
  return path;
}

function drawCheckeredStart(ctx: CanvasRenderingContext2D, track: TrackData) {
  const s = track.start;
  ctx.save();
  ctx.translate(s.x, s.y);
  ctx.rotate(s.angle);
  const cell = 7.5;
  const cols = 7;
  const rows = 3;
  const w = WORLD.ROAD_HALF * 2;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      ctx.fillStyle = (r + c) % 2 === 0 ? '#f4f0df' : '#202b2e';
      ctx.fillRect(-w / 2 + (c * w) / cols, -cell * 1.5 + r * cell, w / cols, cell);
    }
  }
  ctx.restore();
}

function drawBoostPad(ctx: CanvasRenderingContext2D, x: number, y: number, angle: number) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  const g = ctx.createLinearGradient(0, -20, 0, 20);
  g.addColorStop(0, '#ffd64d');
  g.addColorStop(1, '#e65d1d');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.roundRect(-20, -16, 40, 32, 7);
  ctx.fill();
  ctx.fillStyle = '#182327';
  for (let i = -1; i <= 1; i++) {
    ctx.beginPath();
    ctx.moveTo(-12, 8 + i * 7);
    ctx.lineTo(0, -3 + i * 7);
    ctx.lineTo(12, 8 + i * 7);
    ctx.lineTo(12, 12 + i * 7);
    ctx.lineTo(0, 2 + i * 7);
    ctx.lineTo(-12, 12 + i * 7);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
}

function drawLighthouseCliff(ctx: CanvasRenderingContext2D, x: number, y: number) {
  ctx.save();
  ctx.fillStyle = '#dcc489';
  ctx.beginPath();
  ctx.arc(x, y, 74, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#59605a';
  for (let i = 0; i < 9; i++) {
    const a = (i / 9) * Math.PI * 2;
    ctx.beginPath();
    ctx.arc(x + Math.cos(a) * 52, y + Math.sin(a) * 46, 12 + (i % 3) * 5, 0, Math.PI * 2);
    ctx.fill();
  }
  const glow = ctx.createRadialGradient(x + 10, y - 32, 8, x + 10, y - 32, 130);
  glow.addColorStop(0, 'rgba(255, 242, 170, .7)');
  glow.addColorStop(1, 'rgba(255, 242, 170, 0)');
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(x, y, 130, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

export function createGameMap(track: TrackData): GameMap {
  const canvas = document.createElement('canvas');
  canvas.width = MAP_SIZE;
  canvas.height = MAP_SIZE;
  const ctx = canvas.getContext('2d', { willReadFrequently: true })!;
  const rand = mulberry(2401);

  // Mar profundo y textura de olas.
  const sea = ctx.createRadialGradient(MAP_SIZE * 0.43, MAP_SIZE * 0.32, 100, MAP_SIZE / 2, MAP_SIZE / 2, MAP_SIZE * 0.78);
  sea.addColorStop(0, '#1a8798');
  sea.addColorStop(0.45, '#0d6b7d');
  sea.addColorStop(1, '#06424f');
  ctx.fillStyle = sea;
  ctx.fillRect(0, 0, MAP_SIZE, MAP_SIZE);
  for (let i = 0; i < 260; i++) {
    const x = rand() * MAP_SIZE;
    const y = rand() * MAP_SIZE;
    const w = 14 + rand() * 84;
    ctx.strokeStyle = `rgba(194, 247, 235, ${0.05 + rand() * 0.16})`;
    ctx.lineWidth = 1 + rand() * 2;
    ctx.beginPath();
    ctx.arc(x, y, w, Math.PI * 0.1, Math.PI * 0.42);
    ctx.stroke();
  }
  // Destellos de corriente.
  for (let i = 0; i < 240; i++) {
    ctx.fillStyle = `rgba(160, 236, 222, ${rand() * 0.12})`;
    ctx.fillRect(rand() * MAP_SIZE, rand() * MAP_SIZE, 2 + rand() * 12, 1 + rand() * 2);
  }

  // Isla: arena, espuma y pradera.
  const coast = islandPath();
  ctx.save();
  ctx.shadowColor = 'rgba(0, 35, 42, .55)';
  ctx.shadowBlur = 26;
  ctx.fillStyle = '#d7c18b';
  ctx.fill(coast);
  ctx.restore();
  ctx.strokeStyle = 'rgba(240, 252, 236, .65)';
  ctx.lineWidth = 13;
  ctx.stroke(coast);
  ctx.strokeStyle = 'rgba(196, 242, 232, .3)';
  ctx.lineWidth = 28;
  ctx.stroke(coast);
  ctx.strokeStyle = '#f0dda8';
  ctx.lineWidth = 46;
  ctx.stroke(coast);
  const sandPath = islandPath(44);
  ctx.fillStyle = '#e8d49d';
  ctx.fill(sandPath);
  ctx.fillStyle = '#3b8854';
  ctx.fill(islandPath(86));

  // Pradera a cuadros, recortada a la isla.
  ctx.save();
  ctx.clip(islandPath(86));
  const tile = 58;
  for (let y = 0; y < MAP_SIZE; y += tile) {
    for (let x = 0; x < MAP_SIZE; x += tile) {
      const alt = (Math.floor(x / tile) + Math.floor(y / tile)) % 2 === 0;
      ctx.fillStyle = alt ? 'rgba(103, 179, 102, .34)' : 'rgba(30, 105, 70, .2)';
      ctx.fillRect(x, y, tile, tile);
    }
  }
  for (let i = 0; i < 5200; i++) {
    ctx.fillStyle = rand() > 0.5 ? 'rgba(174, 219, 133, .28)' : 'rgba(20, 79, 54, .35)';
    ctx.fillRect(rand() * MAP_SIZE, rand() * MAP_SIZE, 2, 2 + rand() * 3);
  }
  // Manchas de tierra y flores.
  for (let i = 0; i < 80; i++) {
    const x = rand() * MAP_SIZE;
    const y = rand() * MAP_SIZE;
    ctx.fillStyle = rand() > 0.6 ? 'rgba(220, 197, 142, .3)' : 'rgba(246, 215, 116, .18)';
    ctx.beginPath();
    ctx.ellipse(x, y, 8 + rand() * 34, 5 + rand() * 20, rand() * Math.PI, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();

  // Textura de la playa.
  ctx.save();
  ctx.clip(islandPath());
  for (let i = 0; i < 2200; i++) {
    const a = rand() * Math.PI * 2;
    const r = islandBoundary(a) - rand() * 84;
    const x = ISLAND.cx + Math.cos(a) * r;
    const y = ISLAND.cy + Math.sin(a) * r * ISLAND.sy;
    ctx.fillStyle = rand() > 0.5 ? 'rgba(255, 247, 214, .5)' : 'rgba(148, 123, 77, .28)';
    ctx.fillRect(x, y, 1 + rand() * 3, 1 + rand() * 2);
  }
  ctx.restore();

  // El circuito: bordillo rojo y blanco + asfalto.
  const road = trackPath(track);
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  ctx.strokeStyle = 'rgba(60, 54, 42, .22)';
  ctx.lineWidth = WORLD.CURB_HALF * 2 + 12;
  ctx.stroke(road);
  ctx.strokeStyle = '#b84638';
  ctx.lineWidth = WORLD.CURB_HALF * 2;
  ctx.stroke(road);
  ctx.setLineDash([16, 16]);
  ctx.strokeStyle = '#f2ecda';
  ctx.stroke(road);
  ctx.setLineDash([]);
  ctx.strokeStyle = '#333d40';
  ctx.lineWidth = WORLD.ROAD_HALF * 2;
  ctx.stroke(road);
  ctx.strokeStyle = '#475256';
  ctx.lineWidth = WORLD.ROAD_HALF * 2 - 4;
  ctx.stroke(road);
  ctx.strokeStyle = '#354044';
  ctx.lineWidth = WORLD.ROAD_HALF * 2 - 10;
  ctx.stroke(road);

  // Grano del asfalto y gomas.
  for (let i = 0; i < track.points.length; i += 2) {
    const p = track.points[i];
    for (let n = 0; n < 4; n++) {
      const lane = (rand() * 2 - 1) * (WORLD.ROAD_HALF - 4);
      ctx.fillStyle = rand() > 0.52 ? 'rgba(126, 139, 138, .32)' : 'rgba(12, 19, 21, .36)';
      ctx.fillRect(p.x + p.nx * lane, p.y + p.ny * lane, 1 + rand() * 3, 1 + rand() * 2);
    }
    if (i % 8 === 0) {
      ctx.strokeStyle = 'rgba(16, 22, 24, .18)';
      ctx.lineWidth = 4 + rand() * 4;
      ctx.beginPath();
      ctx.moveTo(p.x + p.nx * 7, p.y + p.ny * 7);
      ctx.lineTo(p.x + p.nx * 9 + p.ny * 20, p.y + p.ny * 9 - p.nx * 20);
      ctx.stroke();
    }
  }

  drawCheckeredStart(ctx, track);
  drawBoostPad(ctx, track.boostPads[0].x, track.boostPads[0].y, track.points[Math.round(track.boostPads[0].progress * track.points.length)].angle);
  drawBoostPad(ctx, track.boostPads[1].x, track.boostPads[1].y, track.points[Math.round(track.boostPads[1].progress * track.points.length)].angle);
  drawLighthouseCliff(ctx, track.lighthouse.x, track.lighthouse.y);

  // Muelle de madera junto a la salida.
  const dock = track.points[Math.floor(track.points.length * 0.955)];
  ctx.save();
  ctx.translate(dock.x, dock.y);
  ctx.rotate(dock.angle + Math.PI / 2);
  ctx.fillStyle = '#8b5d33';
  ctx.fillRect(38, -64, 12, 118);
  ctx.fillStyle = 'rgba(255, 223, 174, .22)';
  for (let y = -60; y < 48; y += 12) ctx.fillRect(40, y, 8, 3);
  ctx.restore();

  // Viñeta suave del terreno.
  const vignette = ctx.createRadialGradient(MAP_SIZE / 2, MAP_SIZE / 2, 420, MAP_SIZE / 2, MAP_SIZE / 2, 1150);
  vignette.addColorStop(0, 'rgba(0, 0, 0, 0)');
  vignette.addColorStop(1, 'rgba(4, 28, 33, .42)');
  ctx.fillStyle = vignette;
  ctx.fillRect(0, 0, MAP_SIZE, MAP_SIZE);

  const image = ctx.getImageData(0, 0, MAP_SIZE, MAP_SIZE);
  return { size: MAP_SIZE, canvas, pixels: image.data };
}
