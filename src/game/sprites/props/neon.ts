import { grid, label, labelWidth, mix, prop, type PropDef } from '../propKit';
import type { Palette, Voxels } from '../voxel';
import { archProp } from './arch';

/** Props de Neón Nocturno: torres con ventanas encendidas, farolas, rótulos, conos y contenedores. */

const WINDOW_LIGHTS = ['#ffcf70', '#fff0b8', '#7ff3ff', '#ff7ad9', '#ffb35c'];

interface WindowGrid {
  x0: number;
  x1: number;
  y0: number;
  y1: number;
  /** Plano z de la fachada. */
  z: number;
  pitchX: number;
  pitchY: number;
  w: number;
  h: number;
  /** Probabilidad de que una ventana esté encendida. */
  lit: number;
  /** Probabilidad de que la luz sea cálida en vez de turquesa o rosa. */
  warm: number;
}

function addWindows(v: Voxels, pal: Palette, rand: () => number, o: WindowGrid) {
  const lights = WINDOW_LIGHTS.map((c) => pal.add(c, 1));
  const off = [pal.add('#161c3a'), pal.add('#1f2750')];
  for (let y = o.y0; y + o.h <= o.y1; y += o.pitchY) {
    for (let x = o.x0; x + o.w <= o.x1; x += o.pitchX) {
      const on = rand() < o.lit;
      const pick = rand() < o.warm ? Math.floor(rand() * 2) : 2 + Math.floor(rand() * 3);
      v.box(x, y, o.z, x + o.w - 1, y + o.h - 1, o.z, on ? lights[pick] : off[rand() < 0.5 ? 0 : 1]);
    }
  }
}

/** Cuerpo de torre con pilastras, cornisas por piso y ventanas en la fachada. */
function body(v: Voxels, pal: Palette, rand: () => number, hx: number, hz: number, y0: number, y1: number, wall: number, light: number, trim: number, win: Omit<WindowGrid, 'x0' | 'x1' | 'y0' | 'y1' | 'z'>) {
  v.box(-hx, y0, -hz, hx, y1, hz, wall);
  for (let x = -hx; x <= hx; x += win.pitchX) v.box(x, y0, -hz - 1, x, y1, -hz - 1, light);
  for (let y = y0 + win.pitchY; y < y1; y += win.pitchY) v.box(-hx, y - 1, -hz - 1, hx, y - 1, -hz - 1, trim);
  addWindows(v, pal, rand, { ...win, x0: -hx + 2, x1: hx - 1, y0: y0 + 4, y1: y1 - 4, z: -hz });
}

const towerA = prop(
  1.5,
  3,
  (variant, rand, pal) => {
    const hx = 28;
    const hz = 18;
    const h = 118 + variant * 12;
    const v = grid(pal, hx + 4, hz + 4, h + 40);
    v.normalRadius = 1;
    const wall = pal.add(['#4a5088', '#55407f', '#3d5a85'][variant]);
    const light = pal.add(['#5a62a0', '#68509a', '#4c6e9c'][variant]);
    const trim = pal.add('#8b93d6');
    const dark = pal.add('#272b4a');
    const neon = pal.add(['#ff4fb8', '#44f0ff', '#ffb02e'][variant], 1);
    const red = pal.add('#ff3b3b', 1);
    body(v, pal, rand, hx, hz, 0, h, wall, light, trim, { pitchX: 9, pitchY: 10, w: 5, h: 6, lit: 0.55, warm: 0.6 });
    v.box(-hx - 1, h, -hz - 1, hx + 1, h + 2, hz + 1, trim);
    v.box(-hx, h + 3, -hz - 1, hx, h + 4, -hz - 1, neon);
    v.box(-12, h + 2, -7, 8, h + 10, 7, dark);
    v.cylinder(16, h + 6, 0, 5, 8, 'y', dark);
    v.tube(-hx + 5, h + 2, 0, -hx + 5, h + 34, 0, 0.9, 0.5, trim);
    v.ellipsoid(-hx + 5, h + 35, 0, 1.6, 1.6, 1.6, red);
    return v;
  },
  3,
  { minLod: 1, far: 1100 },
);

const towerB = prop(
  1.5,
  2,
  (variant, rand, pal) => {
    const hx = 17;
    const hz = 15;
    const h = 186 + variant * 18;
    const v = grid(pal, hx + 4, hz + 4, h + 56);
    v.normalRadius = 1;
    const wall = pal.add(variant ? '#35456f' : '#3b3f78');
    const light = pal.add(variant ? '#46588a' : '#4c5090');
    const trim = pal.add('#8b93d6');
    const dark = pal.add('#232846');
    const neon = pal.add(variant ? '#ff4fb8' : '#44f0ff', 1);
    const red = pal.add('#ff3b3b', 1);
    body(v, pal, rand, hx, hz, 0, h, wall, light, trim, { pitchX: 6, pitchY: 8, w: 3, h: 5, lit: 0.5, warm: 0.45 });
    // Remate escalonado con aro de neón.
    v.box(-hx - 1, h, -hz - 1, hx + 1, h + 2, hz + 1, trim);
    v.box(-hx + 3, h + 2, -hz + 3, hx - 3, h + 14, hz - 3, wall);
    v.box(-hx + 3, h + 8, -hz + 2, hx - 3, h + 9, -hz + 2, neon);
    v.box(-hx + 2, h + 14, -hz + 2, hx - 2, h + 15, hz - 2, trim);
    v.tube(0, h + 15, 0, 0, h + 52, 0, 1.1, 0.5, trim);
    v.ellipsoid(0, h + 53, 0, 1.8, 1.8, 1.8, red);
    v.box(-hx - 1, h - 12, -hz - 1, hx + 1, h - 11, -hz - 1, neon);
    void dark;
    return v;
  },
  5,
  { minLod: 1, far: 1300 },
);

const towerC = prop(
  1.5,
  2,
  (variant, rand, pal) => {
    const v = grid(pal, 38, 26, 226);
    v.normalRadius = 1;
    const wall = pal.add(variant ? '#4a3c78' : '#3f4a86');
    const light = pal.add(variant ? '#5a4a90' : '#4f5c9a');
    const trim = pal.add('#8b93d6');
    const cyan = pal.add('#44f0ff', 1);
    const pink = pal.add('#ff4fb8', 1);
    const red = pal.add('#ff3b3b', 1);
    const tiers: Array<[number, number, number, number]> = [
      [34, 22, 0, 78],
      [26, 17, 78, 128],
      [16, 12, 128, 168],
    ];
    tiers.forEach(([hx, hz, y0, y1], i) => {
      body(v, pal, rand, hx, hz, y0, y1, wall, light, trim, { pitchX: 9, pitchY: 10, w: 5, h: 6, lit: 0.7, warm: 0.75 });
      v.box(-hx - 1, y1, -hz - 1, hx + 1, y1 + 2, hz + 1, trim);
      v.box(-hx - 1, y1 + 3, -hz - 1, hx + 1, y1 + 3, -hz - 1, i % 2 ? pink : cyan);
    });
    v.box(-8, 171, -6, 8, 190, 6, wall);
    v.box(-7, 188, -7, 7, 189, -7, cyan);
    v.tube(0, 190, 0, 0, 216, 0, 1.6, 0.5, trim);
    v.ellipsoid(0, 217, 0, 2, 2, 2, red);
    return v;
  },
  7,
  { minLod: 1, far: 1500 },
);

const lamp = prop(
  0.3,
  1,
  (_variant, _rand, pal) => {
    const v = grid(pal, 24, 6, 104);
    v.normalRadius = 2;
    const steel = pal.add('#3a4058');
    const dark = pal.add('#222638');
    const globe = pal.add('#fff0c0', 1);
    v.box(-3, 0, -3, 3, 6, 3, dark);
    v.tube(0, 4, 0, 0, 84, 0, 2.2, 1.6, steel);
    v.mirror((s) => {
      v.curve(
        [
          [0, 84, 0],
          [s * 6, 90, 0],
          [s * 13, 92, 0],
          [s * 18, 90, 0],
        ],
        1.3,
        1.1,
        steel,
      );
      v.ellipsoid(s * 18, 87, 0, 3.4, 3.4, 3.4, globe);
      v.cylinder(s * 18, 91.5, 0, 3, 1.4, 'y', dark);
    });
    return v;
  },
  9,
  { glow: { y: 27, r: 38, rgb: '255, 214, 140', alpha: 0.5 } },
);

const SIGN_STYLES = [
  { text: 'HOTEL', size: 2, border: '#ff4fb8', ink: '#44f0ff' },
  { text: 'BAR', size: 3, border: '#44f0ff', ink: '#ff4fb8' },
  { text: 'TAXI', size: 2, border: '#ffcf3d', ink: '#ffcf3d' },
];

const neonSign = prop(
  0.25,
  3,
  (variant, _rand, pal) => {
    const style = SIGN_STYLES[variant];
    const v = grid(pal, 34, 6, 124);
    v.normalRadius = 1;
    const pole = pal.add('#2b3042');
    const board = pal.add('#10142c');
    const border = pal.add(style.border, 1);
    const ink = pal.add(style.ink, 1);
    const w = labelWidth(style.text, style.size);
    const hw = Math.ceil(w / 2) + 4;
    const bh = 5 * style.size + 8;
    const y0 = 62;
    v.box(-2, 0, -1, 2, 8, 1, pole);
    v.box(-1, 0, -1, 1, y0, 1, pole);
    v.box(-hw, y0, -3, hw, y0 + bh, -2, board);
    v.box(-hw, y0, -4, hw, y0, -4, border);
    v.box(-hw, y0 + bh, -4, hw, y0 + bh, -4, border);
    v.box(-hw, y0, -4, -hw, y0 + bh, -4, border);
    v.box(hw, y0, -4, hw, y0 + bh, -4, border);
    label(v, style.text, -Math.floor(w / 2), y0 + bh - 4, -4, ink, style.size);
    return v;
  },
  11,
  { glow: { y: 22, r: 30, rgb: '255, 110, 210', alpha: 0.32 }, noFlip: true },
);

const cone = prop(
  0.16,
  1,
  (_variant, _rand, pal) => {
    const v = grid(pal, 10, 10, 26);
    const orange = pal.add('#f0661e');
    const white = pal.add('#f2efe6');
    const base = pal.add('#22252e');
    v.box(-8, 0, -8, 8, 1, 8, base);
    for (let y = 2; y < 24; y++) {
      const r = 6.2 - ((y - 2) / 22) * 4.6;
      v.cylinder(0, y, 0, r, 1, 'y', y >= 9 && y < 14 ? white : orange);
    }
    return v;
  },
  13,
);

const CONTAINERS = ['#b8412f', '#2f5fa8', '#2a8f8a', '#d9822b'];

const container = prop(
  0.6,
  3,
  (variant, rand, pal) => {
    const v = grid(pal, 40, 14, 44);
    v.normalRadius = 1;
    const colors = CONTAINERS.map((c) => pal.add(c));
    const dark = CONTAINERS.map((c) => pal.add(mix(c, '#000000', 0.28)));
    const frame = pal.add('#2a2e3c');
    const a = Math.floor(rand() * CONTAINERS.length);
    const b = (a + 1 + variant) % CONTAINERS.length;
    const box = (y0: number, c: number, d: number, shift: number) => {
      v.box(-36 + shift, y0, -12, 36 + shift, y0 + 19, 12, c);
      // Corrugado: surcos verticales en la cara frontal.
      for (let x = -35 + shift; x <= 35 + shift; x += 2) v.box(x, y0 + 1, -13, x, y0 + 17, -13, d);
      v.box(-36 + shift, y0, -13, 36 + shift, y0, -13, frame);
      v.box(-36 + shift, y0 + 19, -13, 36 + shift, y0 + 19, -13, frame);
    };
    box(0, colors[a], dark[a], 0);
    if (variant > 0) box(20, colors[b], dark[b], variant === 2 ? 9 : 0);
    return v;
  },
  15,
);

const archNeon = archProp(
  {
    pylon: ['#2a2f55', '#1c2040'],
    pylonLight: '#3a4170',
    beam: '#171b38',
    trim: '#ff4fb8',
    checkA: '#e8fbff',
    checkB: '#171b38',
    flag: '#44f0ff',
    glowing: true,
    text: { value: 'TUX', color: '#ffcf3d' },
    ornament: (v, pal) => {
      const cyan = pal.add('#44f0ff', 1);
      v.mirror((s) => {
        v.box(s * 85, 2, -6, s * 86, 38, -6, cyan);
        v.box(s * 92, 2, -6, s * 93, 38, -6, cyan);
      });
    },
  },
  17,
  { noFlip: true },
);

export const NEON_PROPS: Record<string, PropDef> = {
  tower_a: towerA,
  tower_b: towerB,
  tower_c: towerC,
  lamp,
  neon_sign: neonSign,
  cone,
  container,
  arch_neon: archNeon,
};
