
function makeCanvas(w: number, h: number) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
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

const propCache = new Map<string, HTMLCanvasElement>();

export type PropKind = 'box' | 'can' | 'banana' | 'bowl';

export function propSprite(kind: PropKind): HTMLCanvasElement {
  const hit = propCache.get(kind);
  if (hit) return hit;
  const sprite = kind === 'box' ? itemBox() : kind === 'can' ? nitroCan() : kind === 'banana' ? banana() : bowling();
  propCache.set(kind, sprite);
  return sprite;
}
