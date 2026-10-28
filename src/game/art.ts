import type { DecorationType } from './types';

function makeCanvas(w: number, h: number) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return c;
}

function ellipse(ctx: CanvasRenderingContext2D, x: number, y: number, rx: number, ry: number, fill: string) {
  ctx.fillStyle = fill;
  ctx.beginPath();
  ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
  ctx.fill();
}

function palm(): HTMLCanvasElement {
  const c = makeCanvas(72, 116);
  const ctx = c.getContext('2d')!;
  ctx.strokeStyle = '#9a6536';
  ctx.lineWidth = 8;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(37, 112);
  ctx.quadraticCurveTo(30, 82, 40, 54);
  ctx.stroke();
  ctx.strokeStyle = '#c78d50';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(38, 108);
  ctx.quadraticCurveTo(31, 80, 41, 56);
  ctx.stroke();
  for (let i = 0; i < 6; i++) {
    const y = 104 - i * 9;
    ctx.strokeStyle = i % 2 === 0 ? '#6c452a' : '#e1ad6b';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(31, y);
    ctx.lineTo(42, y - 4);
    ctx.stroke();
  }
  const leaves = [
    [40, 50, -62, 34],
    [40, 50, -20, 40],
    [40, 50, 20, 38],
    [40, 50, 64, 32],
    [40, 52, -104, 28],
    [40, 52, 108, 24],
    [40, 50, 150, 18],
  ] as const;
  leaves.forEach(([x, y, deg, len], i) => {
    const rad = (deg * Math.PI) / 180;
    ctx.strokeStyle = i % 2 ? '#2d7850' : '#246445';
    ctx.lineWidth = 7;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.quadraticCurveTo(
      x + Math.cos(rad) * len * 0.5,
      y + Math.sin(rad) * len * 0.5 - 8,
      x + Math.cos(rad) * len,
      y + Math.sin(rad) * len,
    );
    ctx.stroke();
    ctx.strokeStyle = '#4a9b63';
    ctx.lineWidth = 2;
    ctx.stroke();
  });
  ellipse(ctx, 35, 55, 5, 4, '#5d3c23');
  ellipse(ctx, 44, 55, 4, 4, '#8a5a2f');
  ellipse(ctx, 39, 59, 4, 4, '#6b4427');
  return c;
}

function rock(): HTMLCanvasElement {
  const c = makeCanvas(54, 36);
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = '#465552';
  ctx.beginPath();
  ctx.moveTo(4, 31);
  ctx.lineTo(12, 10);
  ctx.lineTo(27, 3);
  ctx.lineTo(46, 12);
  ctx.lineTo(51, 31);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#75847c';
  ctx.beginPath();
  ctx.moveTo(12, 10);
  ctx.lineTo(27, 3);
  ctx.lineTo(36, 14);
  ctx.lineTo(22, 20);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#9da89c';
  ctx.beginPath();
  ctx.moveTo(27, 3);
  ctx.lineTo(36, 14);
  ctx.lineTo(30, 17);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#2f413f';
  ctx.fillRect(6, 29, 44, 4);
  return c;
}

function bush(): HTMLCanvasElement {
  const c = makeCanvas(48, 34);
  const ctx = c.getContext('2d')!;
  ellipse(ctx, 15, 23, 13, 10, '#2a6f48');
  ellipse(ctx, 33, 22, 14, 11, '#317c4e');
  ellipse(ctx, 24, 15, 15, 12, '#3e925b');
  ellipse(ctx, 19, 12, 7, 6, '#5aae6d');
  ellipse(ctx, 35, 27, 8, 5, '#296843');
  return c;
}

function sign(): HTMLCanvasElement {
  const c = makeCanvas(28, 40);
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = '#d6c39a';
  ctx.fillRect(12, 18, 4, 21);
  ctx.fillStyle = '#1d2a2b';
  ctx.beginPath();
  ctx.roundRect(2, 2, 24, 20, 3);
  ctx.fill();
  ctx.strokeStyle = '#f4efe0';
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.fillStyle = '#ff8b40';
  ctx.beginPath();
  ctx.moveTo(8, 16);
  ctx.lineTo(14, 7);
  ctx.lineTo(20, 16);
  ctx.lineTo(17, 16);
  ctx.lineTo(14, 12);
  ctx.lineTo(11, 16);
  ctx.closePath();
  ctx.fill();
  return c;
}

function buoy(): HTMLCanvasElement {
  const c = makeCanvas(20, 28);
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = '#27383b';
  ctx.fillRect(4, 20, 12, 5);
  ctx.fillStyle = '#e5543c';
  ctx.beginPath();
  ctx.moveTo(10, 2);
  ctx.lineTo(18, 20);
  ctx.lineTo(2, 20);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#f1e7d2';
  ctx.fillRect(5, 13, 10, 4);
  ctx.fillStyle = '#ffe98c';
  ctx.fillRect(8, 0, 4, 5);
  return c;
}

function lighthouse(): HTMLCanvasElement {
  const c = makeCanvas(92, 170);
  const ctx = c.getContext('2d')!;
  const beam = ctx.createLinearGradient(46, 28, 90, 70);
  beam.addColorStop(0, 'rgba(255, 243, 170, .5)');
  beam.addColorStop(1, 'rgba(255, 243, 170, 0)');
  ctx.fillStyle = beam;
  ctx.beginPath();
  ctx.moveTo(49, 30);
  ctx.lineTo(92, 42);
  ctx.lineTo(92, 84);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#53605b';
  for (let i = 0; i < 6; i++) {
    ellipse(ctx, 18 + i * 12, 158 - (i % 2) * 4, 13, 8, i % 2 ? '#5f6d66' : '#727e73');
  }
  ctx.fillStyle = '#f1ead8';
  ctx.beginPath();
  ctx.moveTo(31, 146);
  ctx.lineTo(37, 48);
  ctx.lineTo(57, 48);
  ctx.lineTo(64, 146);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#cf4a37';
  for (let i = 0; i < 4; i++) {
    const y = 62 + i * 22;
    ctx.fillStyle = i % 2 === 0 ? '#cf4a37' : '#ece5d3';
    ctx.beginPath();
    ctx.moveTo(36 - i * 0.7, y);
    ctx.lineTo(58 + i * 0.7, y);
    ctx.lineTo(59 + i * 0.8, y + 11);
    ctx.lineTo(35 - i * 0.8, y + 11);
    ctx.closePath();
    ctx.fill();
  }
  ctx.fillStyle = '#263638';
  ctx.fillRect(31, 44, 30, 6);
  ctx.fillStyle = '#ffe77e';
  ctx.fillRect(39, 30, 16, 14);
  ctx.fillStyle = '#fff6bd';
  ctx.fillRect(42, 32, 10, 10);
  ctx.fillStyle = '#263638';
  ctx.beginPath();
  ctx.moveTo(34, 30);
  ctx.lineTo(46, 18);
  ctx.lineTo(59, 30);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#e5543c';
  ctx.fillRect(44, 12, 4, 8);
  const glow = ctx.createRadialGradient(46, 37, 3, 46, 37, 32);
  glow.addColorStop(0, 'rgba(255, 246, 180, .6)');
  glow.addColorStop(1, 'rgba(255, 246, 180, 0)');
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(46, 37, 32, 0, Math.PI * 2);
  ctx.fill();
  return c;
}

function arch(): HTMLCanvasElement {
  const c = makeCanvas(160, 112);
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = '#263437';
  ctx.fillRect(12, 28, 13, 82);
  ctx.fillRect(135, 28, 13, 82);
  ctx.fillStyle = '#e9e2ce';
  ctx.fillRect(14, 30, 5, 78);
  ctx.fillRect(137, 30, 5, 78);
  ctx.fillStyle = '#1c282b';
  ctx.beginPath();
  ctx.roundRect(5, 12, 150, 28, 4);
  ctx.fill();
  ctx.fillStyle = '#d9f45a';
  ctx.fillRect(5, 12, 150, 4);
  for (let x = 10; x < 152; x += 12) {
    for (let row = 0; row < 2; row++) {
      ctx.fillStyle = (Math.floor(x / 12) + row) % 2 === 0 ? '#f4efe1' : '#172225';
      ctx.fillRect(x, 24 + row * 7, 12, 7);
    }
  }
  ctx.fillStyle = '#f7f2e3';
  ctx.font = 'bold 12px monospace';
  ctx.textAlign = 'center';
  ctx.fillText('FARO', 80, 22);
  ctx.fillStyle = '#ff8a3d';
  ctx.beginPath();
  ctx.moveTo(5, 12);
  ctx.lineTo(0, 4);
  ctx.lineTo(15, 8);
  ctx.fill();
  return c;
}

function itemBox(): HTMLCanvasElement {
  const c = makeCanvas(44, 44);
  const ctx = c.getContext('2d')!;
  const glow = ctx.createRadialGradient(22, 22, 2, 22, 22, 22);
  glow.addColorStop(0, 'rgba(225, 248, 207, .65)');
  glow.addColorStop(0.65, 'rgba(74, 226, 191, .25)');
  glow.addColorStop(1, 'rgba(74, 226, 191, 0)');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, 44, 44);
  ctx.save();
  ctx.translate(22, 22);
  ctx.rotate(0.1);
  ctx.fillStyle = 'rgba(10, 32, 33, .8)';
  ctx.strokeStyle = '#e9ff9a';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(-14, -14, 28, 28, 5);
  ctx.fill();
  ctx.stroke();
  ctx.strokeStyle = 'rgba(160, 255, 224, .7)';
  ctx.lineWidth = 1;
  ctx.strokeRect(-9, -9, 18, 18);
  ctx.fillStyle = '#e9ff9a';
  ctx.font = 'bold 20px monospace';
  ctx.textAlign = 'center';
  ctx.fillText('?', 0, 8);
  ctx.fillStyle = 'rgba(255, 255, 255, .8)';
  ctx.fillRect(-12, -11, 3, 3);
  ctx.restore();
  return c;
}

function nitroCan(): HTMLCanvasElement {
  const c = makeCanvas(26, 36);
  const ctx = c.getContext('2d')!;
  ctx.save();
  ctx.translate(13, 18);
  ctx.rotate(-0.08);
  const g = ctx.createLinearGradient(-8, 0, 8, 0);
  g.addColorStop(0, '#14556d');
  g.addColorStop(0.5, '#57d9ea');
  g.addColorStop(1, '#12627e');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.roundRect(-8, -14, 16, 27, 4);
  ctx.fill();
  ctx.fillStyle = '#d7f8f1';
  ctx.fillRect(-6, -16, 12, 4);
  ctx.fillStyle = '#ffd95a';
  ctx.beginPath();
  ctx.moveTo(2, -10);
  ctx.lineTo(-5, 1);
  ctx.lineTo(0, 1);
  ctx.lineTo(-2, 10);
  ctx.lineTo(6, -2);
  ctx.lineTo(1, -2);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
  return c;
}

function banana(): HTMLCanvasElement {
  const c = makeCanvas(32, 20);
  const ctx = c.getContext('2d')!;
  ctx.strokeStyle = '#d5a51f';
  ctx.lineWidth = 8;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.arc(16, 4, 11, 0.18, Math.PI - 0.18);
  ctx.stroke();
  ctx.strokeStyle = '#ffe34d';
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.arc(16, 4, 11, 0.2, Math.PI - 0.2);
  ctx.stroke();
  ctx.fillStyle = '#5c4a19';
  ctx.fillRect(3, 6, 4, 3);
  ctx.fillRect(26, 6, 3, 3);
  return c;
}

function bowling(): HTMLCanvasElement {
  const c = makeCanvas(28, 28);
  const ctx = c.getContext('2d')!;
  const g = ctx.createRadialGradient(10, 9, 2, 14, 14, 14);
  g.addColorStop(0, '#b9c4ff');
  g.addColorStop(0.5, '#6374d8');
  g.addColorStop(1, '#283680');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(14, 14, 13, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#1b224d';
  ctx.beginPath();
  ctx.arc(10, 9, 2, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(16, 7, 2, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(13, 13, 2, 0, Math.PI * 2);
  ctx.fill();
  return c;
}

const cache = new Map<string, HTMLCanvasElement>();

export function getSprite(type: Exclude<DecorationType, 'palm'> | 'palm'): HTMLCanvasElement {
  const key = type;
  if (cache.has(key)) return cache.get(key)!;
  let sprite: HTMLCanvasElement;
  switch (type) {
    case 'palm':
      sprite = palm();
      break;
    case 'rock':
      sprite = rock();
      break;
    case 'bush':
      sprite = bush();
      break;
    case 'sign':
      sprite = sign();
      break;
    case 'arch':
      sprite = arch();
      break;
    case 'lighthouse':
      sprite = lighthouse();
      break;
    case 'bouy':
      sprite = buoy();
      break;
    default:
      sprite = rock();
  }
  cache.set(key, sprite);
  return sprite;
}

const propCache = new Map<string, HTMLCanvasElement>();

export type PropKind = 'arch' | 'box' | 'can' | 'banana' | 'bowl';

export function propSprite(kind: PropKind): HTMLCanvasElement {
  const hit = propCache.get(kind);
  if (hit) return hit;
  const sprite =
    kind === 'arch'
      ? arch()
      : kind === 'box'
        ? itemBox()
        : kind === 'can'
          ? nitroCan()
          : kind === 'banana'
            ? banana()
            : bowling();
  propCache.set(kind, sprite);
  return sprite;
}
