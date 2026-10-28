import { grid, prop, type PropDef } from '../propKit';
import { archProp } from './arch';
import { branchTree } from './trees';

/** Props de la Cumbre Helada: pinos nevados, montículos, cristales de hielo, postes de telesilla y una cabaña. */

const SNOW = '#f6f9ff';
const SNOW_SHADE = '#d6e4f4';

const pine = prop(
  0.3,
  3,
  (variant, rand, pal) => {
    const v = grid(pal, 30, 30, 176);
    v.normalRadius = 2;
    const trunk = pal.add('#6b4a32');
    const trunkDark = pal.add('#4a3322');
    const green = ['#1d4f3a', '#276649', '#35805a'].map((c) => pal.add(c));
    const snow = [pal.add(SNOW), pal.add(SNOW_SHADE)];
    const tiers = 5 + variant;
    const H = 118 + variant * 16;
    const snowAmount = [0.38, 0.18, 0.72][variant];

    v.cylinder(0, H * 0.4, 0, 3.6, H * 0.8, 'y', trunk);
    v.ellipsoid(0, 3, 0, 6, 4, 6, trunkDark);
    for (let i = 0; i < tiers; i++) {
      const t = i / (tiers - 1);
      const y0 = 18 + t * (H - 48);
      const R = (23 - t * 14) * (0.95 + rand() * 0.1);
      const h = 25 - t * 6;
      const phase = rand() * 6;
      for (let dy = 0; dy < h; dy++) {
        const k = dy / h;
        const r = R * (1 - k) + 0.8;
        const y = y0 + dy;
        const reach = Math.ceil(r * 1.15) + 1;
        for (let z = -reach; z <= reach; z++) {
          for (let x = -reach; x <= reach; x++) {
            const a = Math.atan2(z, x);
            const rr = r * (1 + 0.12 * Math.cos(a * 6 + i * 1.7 + phase));
            if (x * x + z * z > rr * rr) continue;
            const edge = x * x + z * z > (rr - 1.8) * (rr - 1.8);
            const heavy = edge && rand() < snowAmount * (0.35 + k * 0.8);
            v.set(x, y, z, heavy ? snow[(x + z + dy) & 1] : green[(i + (dy > h * 0.5 ? 1 : 0)) % 3]);
          }
        }
      }
    }
    v.tube(0, H - 24, 0, 0, H, 0, 2.4, 0.6, green[2]);
    v.ellipsoid(0, H - 18, 0, 3, 3, 3, snow[0]);
    return v;
  },
  3,
);

const birch = prop(
  0.3,
  2,
  (variant, rand, pal) => {
    const v = grid(pal, 36, 24, 110);
    v.normalRadius = 2;
    const bark = [pal.add('#d9d9d1'), pal.add('#3a3a3c'), pal.add('#bdbdb6')] as [number, number, number];
    branchTree(v, rand, { bark, height: 62 + variant * 10, lean: variant ? 6 : -5, branches: 6, reach: 26, radius: 4, snow: pal.add(SNOW) });
    return v;
  },
  5,
);

const snowman = prop(
  0.2,
  1,
  (_variant, _rand, pal) => {
    const v = grid(pal, 20, 14, 60);
    const white = pal.add(SNOW);
    const coal = pal.add('#1d2227');
    const carrot = pal.add('#f08a2c');
    const scarf = pal.add('#d0453b');
    const stick = pal.add('#6b4a32');
    v.ellipsoid(0, 8, 0, 10, 8, 10, white);
    v.ellipsoid(0, 22, 0, 7.2, 7, 7.2, white);
    v.ellipsoid(0, 34, 0, 5.4, 5.4, 5.4, white);
    v.tube(0, 34, -4, 0, 33, -11, 1.3, 0.4, carrot);
    v.mirror((s) => {
      v.ellipsoid(s * 2.2, 36, -4.6, 0.9, 0.9, 0.9, coal);
      v.tube(s * 7, 24, 0, s * 17, 30, 0, 0.9, 0.5, stick);
    });
    for (let i = 0; i < 3; i++) v.ellipsoid(0, 24 - i * 4, -7, 0.9, 0.9, 0.9, coal);
    v.cylinder(0, 29, 0, 6.6, 3, 'y', scarf);
    v.box(3, 21, -7, 6, 28, -6, scarf);
    v.cylinder(0, 38.5, 0, 6.4, 1, 'y', coal);
    v.cylinder(0, 42, 0, 3.8, 6, 'y', coal);
    return v;
  },
  7,
);

const mound = prop(
  0.3,
  2,
  (variant, _rand, pal) => {
    const v = grid(pal, 30, 22, 26);
    v.normalRadius = 2;
    const white = pal.add(SNOW);
    const shade = pal.add(SNOW_SHADE);
    const stone = pal.add('#7d8798');
    v.ellipsoid(0, 3, 0, 24, 11, 15, shade);
    v.ellipsoid(-3, 5, -1, 19, 11, 12, white);
    v.ellipsoid(10, 4, 3, 12, 7, 8, white);
    if (variant === 1) {
      v.ellipsoid(-6, 9, -9, 5, 4, 3, stone);
      v.ellipsoid(2, 8, -10, 3.4, 3, 2.4, stone);
    }
    return v;
  },
  9,
);

const crystal = prop(
  0.25,
  2,
  (variant, rand, pal) => {
    const v = grid(pal, 24, 18, 72);
    const tones = ['#b9e6ff', '#8ccaf0', '#e8f8ff'].map((c) => pal.add(c));
    const count = 5 + variant * 2;
    for (let i = 0; i < count; i++) {
      const a = (i / count) * Math.PI * 2 + rand();
      const r = 3 + rand() * 9;
      const h = 22 + rand() * (30 + variant * 8);
      const bx = Math.cos(a) * r;
      const bz = Math.sin(a) * r * 0.7;
      v.tube(bx, 0, bz, bx + Math.cos(a) * h * 0.25, h, bz + Math.sin(a) * h * 0.18, 3.6 - i * 0.12, 0.5, tones[i % 3]);
    }
    return v;
  },
  11,
);

const pylon = prop(
  0.3,
  1,
  (_variant, _rand, pal) => {
    const v = grid(pal, 38, 8, 150);
    v.normalRadius = 2;
    const pole = pal.add('#2f5a46');
    const steel = pal.add('#79858f');
    const cable = pal.add('#262b30');
    const concrete = pal.add('#a9b1ba');
    const chair = pal.add('#e0662f');
    const white = pal.add(SNOW);
    v.box(-5, 0, -5, 5, 6, 5, concrete);
    v.tube(0, 4, 0, 0, 116, 0, 2.8, 2.2, pole);
    v.box(-24, 112, -2, 24, 116, 2, steel);
    v.box(-24, 116, -2, 24, 117, 2, white);
    for (const x of [-19, 19]) {
      v.cylinder(x, 120, 0, 4, 3, 'z', steel);
      v.box(x - 1, 114, -1, x + 1, 120, 1, steel);
    }
    v.mirror((s) => {
      v.curve(
        [
          [s * 19, 123, 0],
          [s * 26, 120, 0],
          [s * 33, 116, 0],
          [s * 38, 112, 0],
        ],
        0.9,
        0.9,
        cable,
      );
    });
    // Una silla colgada del cable.
    v.tube(30, 118, 0, 30, 100, 0, 0.7, 0.7, steel);
    v.box(25, 97, -3, 35, 99, 3, chair);
    v.box(25, 99, 3, 35, 108, 3, chair);
    v.box(24, 98, -3, 24, 104, 3, steel);
    v.box(36, 98, -3, 36, 104, 3, steel);
    return v;
  },
  13,
);

const cabin = prop(
  0.5,
  1,
  (_variant, _rand, pal) => {
    const v = grid(pal, 46, 34, 84);
    v.normalRadius = 2;
    const logA = pal.add('#8b5a2f');
    const logB = pal.add('#744a26');
    const roof = pal.add('#4d3a30');
    const stone = pal.add('#7d6f66');
    const door = pal.add('#5e3a22');
    const frame = pal.add('#d9c7a3');
    const dark = pal.add('#2b2420');
    const white = pal.add(SNOW);
    const shade = pal.add(SNOW_SHADE);
    const glass = pal.add('#ffd27a', 1);
    const smoke = pal.add('#dfe6ee');

    v.ellipsoid(0, 1, 0, 46, 3, 31, shade);
    v.ellipsoid(0, 2, 0, 42, 3, 28, white);
    for (let y = 2; y < 30; y++) {
      const c = y % 4 < 2 ? logA : logB;
      v.box(-34, y, -22, 34, y, 22, c);
      v.box(-36, y, -24, -34, y, 24, c);
      v.box(34, y, -24, 36, y, 24, c);
    }
    // Techo a dos aguas con nieve y alero.
    for (let z = -27; z <= 27; z++) {
      const ry = 29 + Math.round((27 - Math.abs(z)) * 0.8);
      for (let x = -40; x <= 40; x++) {
        v.box(x, ry - 1, z, x, ry, z, roof);
        v.box(x, ry + 1, z, x, ry + 3, z, Math.abs(z) < 5 ? white : shade);
      }
    }
    // Chimenea con nieve y humo.
    v.box(18, 36, 2, 26, 60, 10, stone);
    v.box(17, 60, 1, 27, 62, 11, white);
    v.ellipsoid(22, 68, 6, 3.4, 3, 3, smoke);
    v.ellipsoid(24, 74, 7, 4, 3.6, 3.4, smoke);
    v.ellipsoid(27, 81, 8, 3.4, 2.6, 3, smoke);
    // Puerta, ventanas encendidas y porche.
    v.box(-6, 2, -23, 6, 22, -23, frame);
    v.box(-5, 2, -24, 5, 21, -24, door);
    for (const sx of [-1, 1]) {
      const cx = sx * 21;
      v.box(cx - 8, 10, -23, cx + 8, 21, -23, frame);
      v.box(cx - 7, 11, -24, cx + 7, 20, -24, glass);
      v.box(cx - 7, 15, -25, cx + 7, 16, -25, dark);
      v.box(cx, 11, -25, cx, 20, -25, dark);
    }
    v.box(-14, 2, -31, 14, 3, -24, logB);
    v.box(-14, 2, -31, -13, 24, -30, logA);
    v.box(13, 2, -31, 14, 24, -30, logA);
    v.box(-15, 24, -32, 15, 25, -24, roof);
    v.box(-15, 26, -32, 15, 27, -24, white);
    return v;
  },
  15,
  { minLod: 1, far: 1100 },
);

const archSnow = archProp(
  {
    pylon: ['#d6453b', '#f4f6fa'],
    pylonLight: '#ffffff',
    beam: '#e6eef8',
    trim: '#3f8fe0',
    checkA: '#1f2a44',
    checkB: '#f4f6fa',
    flag: '#3f8fe0',
    ornament: (v, pal) => {
      const white = pal.add(SNOW);
      const green = pal.add('#276649');
      v.mirror((s) => v.ellipsoid(s * 89, 41, 0, 7, 2.4, 6, white));
      v.ellipsoid(0, 53, 0, 80, 1.6, 6.4, white);
      // Guirnalda de pino sobre los pilares.
      v.mirror((s) => {
        for (let y = 8; y < 36; y += 6) v.ellipsoid(s * 89, y, -5, 3, 2, 1.6, green);
      });
    },
  },
  17,
);

export const CUMBRE_PROPS: Record<string, PropDef> = {
  pine,
  pine_bare: birch,
  snowman,
  mound,
  ice_crystal: crystal,
  pylon,
  cabin,
  arch_snow: archSnow,
};
