import { grid, label, mix, prop, rock, type PropDef } from '../propKit';

/** Props de la Isla del Faro. Voxel de 0,3 u salvo los grandes. */

const palm = prop(
  0.3,
  3,
  (variant, rand, pal) => {
    const v = grid(pal, 50, 50, 168);
    const trunkA = pal.add('#a9723f');
    const trunkB = pal.add('#835328');
    const trunkC = pal.add('#c58f55');
    const leaf = [pal.add('#1f6b43'), pal.add('#2a8352'), pal.add('#3b9d63'), pal.add('#58b774')];
    const nut = pal.add('#5a3a22');
    const nutLight = pal.add('#8a5b33');

    // Tronco curvo con anillos.
    const lean = (variant - 1) * 7 + (rand() - 0.5) * 4;
    const height = 100 + variant * 8;
    const pts: Array<[number, number, number]> = [];
    for (let i = 0; i <= 12; i++) {
      const t = i / 12;
      pts.push([lean * t * t, t * height, Math.sin(t * 2.4) * 3 * (variant === 2 ? -1 : 1)]);
    }
    for (let i = 0; i < pts.length - 1; i++) {
      const t = i / (pts.length - 1);
      const r = 4.6 - t * 1.9;
      const [x0, y0, z0] = pts[i];
      const [x1, y1, z1] = pts[i + 1];
      v.tube(x0, y0, z0, x1, y1, z1, r, r - 0.18, i % 2 ? trunkA : trunkB);
    }
    // Anillos claros del tronco.
    for (let k = 4; k < height - 6; k += 7) {
      const t = k / height;
      v.ellipsoid(lean * t * t, k, Math.sin(t * 2.4) * 3 * (variant === 2 ? -1 : 1), 4.9 - t * 1.9, 1.1, 4.9 - t * 1.9, trunkC);
    }
    // Base ensanchada.
    v.ellipsoid(0, 3, 0, 7, 4, 7, trunkB);

    const top: [number, number, number] = [pts[pts.length - 1][0], height, pts[pts.length - 1][2]];
    // Frondas en tres niveles regulares: arriba erguidas, en medio arqueadas y abajo colgantes.
    const tiers = [
      { count: 5, len: 30, rise: 26, droop: 8, color: leaf[3], leaflet: 8, offset: 0.3 },
      { count: 7, len: 40, rise: 15, droop: 22, color: leaf[2], leaflet: 11, offset: 0 },
      { count: 5, len: 34, rise: 3, droop: 32, color: leaf[1], leaflet: 10, offset: 0.55 },
    ];
    tiers.forEach((tier, ti) => {
      for (let f = 0; f < tier.count; f++) {
        const a = ((f + tier.offset + variant * 0.15) / tier.count) * Math.PI * 2;
        const dx = Math.cos(a);
        const dz = Math.sin(a);
        const len = tier.len * (0.92 + rand() * 0.16);
        const spine: Array<[number, number, number]> = [];
        for (let k = 0; k <= 7; k++) {
          const t = k / 7;
          spine.push([top[0] + dx * len * t, top[1] + tier.rise * Math.sin(t * Math.PI * 0.62) - tier.droop * t * t, top[2] + dz * len * t]);
        }
        v.curve(spine, 2.7, 1, ti === 0 ? leaf[3] : tier.color);
        for (let k = 1; k < spine.length; k++) {
          const [px, py, pz] = spine[k];
          const side = tier.leaflet * (1.05 - (k / spine.length) * 0.55);
          const fall = side * 0.5;
          v.tube(px, py, pz, px - dz * side, py - fall, pz + dx * side, 1.5, 0.55, tier.color);
          v.tube(px, py, pz, px + dz * side, py - fall, pz - dx * side, 1.5, 0.55, tier.color);
        }
      }
    });
    // Cocos bajo la corona.
    for (let c = 0; c < 4; c++) {
      const a = (c / 4) * Math.PI * 2 + variant;
      v.ellipsoid(top[0] + Math.cos(a) * 3.4, top[1] - 4 - (c % 2), top[2] + Math.sin(a) * 3.4, 2.5, 2.5, 2.5, c % 2 ? nut : nutLight);
    }
    return v;
  },
  3,
);

const bush = prop(
  0.3,
  2,
  (variant, rand, pal) => {
    const v = grid(pal, 22, 18, 30);
    const g = [pal.add('#235f3d'), pal.add('#2e7a4b'), pal.add('#43975c'), pal.add('#67b574')];
    const blooms = [pal.add('#f2d45c'), pal.add('#f4f0e6'), pal.add('#e88aa8')];
    const blobs = 5 + variant;
    for (let i = 0; i < blobs; i++) {
      const a = (i / blobs) * Math.PI * 2;
      const r = 6 + rand() * 6;
      v.ellipsoid(Math.cos(a) * r, 7 + rand() * 4, Math.sin(a) * r * 0.7, 8 + rand() * 3, 7 + rand() * 3, 8 + rand() * 3, g[i % 3]);
    }
    v.ellipsoid(0, 12, 0, 10, 8, 9, g[2]);
    v.ellipsoid(-2, 16, -2, 6, 5, 5, g[3]);
    for (let i = 0; i < 6; i++) {
      const a = rand() * Math.PI * 2;
      v.ellipsoid(Math.cos(a) * (6 + rand() * 7), 8 + rand() * 9, -3 - rand() * 7, 1.4, 1.4, 1.4, blooms[(i + variant) % 3]);
    }
    return v;
  },
  5,
);

const rocks = prop(
  0.3,
  3,
  (variant, rand, pal) => {
    const v = grid(pal, 30, 24, 34);
    const base = pal.add('#6f7a72');
    const mid = pal.add('#88938a');
    const lite = pal.add('#a8b2a8');
    const dark = pal.add('#4a554f');
    const moss = pal.add('#4f8a54');
    rock(v, 0, 10, 0, 17 + variant * 2, 10 + variant, 13, base, rand, 0.35);
    rock(v, -9, 8, 3, 11, 8, 9, mid, rand, 0.3);
    rock(v, 11, 6, -3, 9, 6, 8, dark, rand, 0.3);
    rock(v, 1, 18, -1, 9, 6, 7, lite, rand, 0.3);
    if (variant === 1) v.ellipsoid(-2, 21, 0, 6, 2, 5, moss);
    return v;
  },
  7,
);

const sign = prop(
  0.25,
  1,
  (_variant, _rand, pal) => {
    const v = grid(pal, 18, 6, 56);
    const post = pal.add('#d8c79c');
    const face = pal.add('#1c2829');
    const rim = pal.add('#f4efe0');
    const arrow = pal.add('#ff8b40');
    v.box(-1, 0, 0, 1, 30, 1, post);
    v.box(-13, 28, -1, 13, 50, 0, rim);
    v.box(-12, 29, -2, 12, 49, -1, face);
    // Flecha hacia arriba.
    for (let i = 0; i < 9; i++) v.box(-(8 - i), 40 + i, -3, 8 - i, 40 + i, -3, arrow);
    v.box(-2, 32, -3, 2, 40, -3, arrow);
    return v;
  },
  9,
);

const lighthouse = prop(
  0.8,
  1,
  (_variant, rand, pal) => {
    const v = grid(pal, 44, 44, 200);
    const white = pal.add('#f2ecda');
    const whiteShade = pal.add('#d9d2bd');
    const red = pal.add('#cf4a37');
    const dark = pal.add('#263638');
    const glass = pal.add('#ffe77e', 1);
    const rockA = pal.add('#6a746d');
    const rockB = pal.add('#8a948a');
    // Rocas de la base.
    for (let i = 0; i < 9; i++) {
      const a = (i / 9) * Math.PI * 2;
      rock(v, Math.cos(a) * 24, 5, Math.sin(a) * 22, 13, 8, 12, i % 2 ? rockA : rockB, rand, 0.3);
    }
    // Fuste troncocónico con bandas.
    for (let y = 8; y < 142; y++) {
      const r = 15 - ((y - 8) / 134) * 6.5;
      const band = Math.floor((y - 8) / 27) % 2 === 0;
      v.cylinder(0, y, 0, r, 1.4, 'y', band ? white : red);
    }
    // Sombra lateral del fuste para dar volumen.
    for (let y = 8; y < 142; y += 1) {
      const r = 15 - ((y - 8) / 134) * 6.5;
      v.ellipsoid(r * 0.55, y, r * 0.2, r * 0.3, 0.8, r * 0.55, whiteShade);
    }
    // Puerta y ventanas.
    v.box(-3, 8, -15, 3, 22, -14, dark);
    for (const wy of [48, 84, 112]) v.box(-1, wy, -13, 1, wy + 6, -12, dark);
    // Galería y linterna.
    v.cylinder(0, 142, 0, 11.5, 3, 'y', dark);
    v.cylinder(0, 148, 0, 8, 10, 'y', glass);
    for (let k = 0; k < 4; k++) {
      const a = (k / 4) * Math.PI * 2 + Math.PI / 4;
      v.box(Math.round(Math.cos(a) * 8) - 1, 143, Math.round(Math.sin(a) * 8) - 1, Math.round(Math.cos(a) * 8) + 1, 154, Math.round(Math.sin(a) * 8) + 1, dark);
    }
    v.cylinder(0, 155, 0, 10, 2, 'y', dark);
    v.ellipsoid(0, 159, 0, 8.5, 6, 8.5, red);
    v.box(-1, 163, -1, 1, 172, 1, dark);
    return v;
  },
  11,
);

const buoy = prop(
  0.15,
  1,
  (_variant, _rand, pal) => {
    const v = grid(pal, 12, 12, 40);
    const red = pal.add('#e5543c');
    const white = pal.add('#f4efe0');
    const dark = pal.add('#27383b');
    const lamp = pal.add('#ffe98c', 1);
    v.cylinder(0, 3, 0, 9, 5, 'y', dark);
    for (let y = 6; y < 26; y++) {
      const r = 8 - (y - 6) * 0.3;
      v.cylinder(0, y, 0, r, 1.4, 'y', Math.floor((y - 6) / 6) % 2 ? white : red);
    }
    v.cylinder(0, 27, 0, 3, 3, 'y', dark);
    v.ellipsoid(0, 32, 0, 3, 3.5, 3, lamp);
    return v;
  },
  13,
);

const arch = prop(
  0.4,
  1,
  (_variant, _rand, pal) => {
    const v = grid(pal, 100, 8, 56);
    const pylon = pal.add('#263437');
    const pale = pal.add('#e9e2ce');
    const lime = pal.add('#d9f45a');
    const dark = pal.add('#1c282b');
    const cream = pal.add('#f4efe1');
    const orange = pal.add('#ff8a3d');
    v.mirror((s) => {
      v.box(s * 84, 0, -4, s * 94, 40, 4, pylon);
      v.box(s * 85, 2, -5, s * 87, 38, -4, pale);
    });
    v.box(-96, 36, -5, 96, 52, 5, dark);
    v.box(-96, 50, -6, 96, 52, 6, lime);
    // Franja de cuadros.
    for (let x = -94; x < 94; x += 6) {
      for (let r = 0; r < 2; r++) {
        const on = (Math.floor((x + 94) / 6) + r) % 2 === 0;
        v.box(x, 38 + r * 5, -6, x + 5, 42 + r * 5, -6, on ? cream : dark);
      }
    }
    v.mirror((s) => v.box(s * 94, 44, -6, s * 98, 50, 6, orange));
    return v;
  },
  15,
);

const sailboat = prop(
  0.3,
  2,
  (variant, _rand, pal) => {
    const v = grid(pal, 36, 10, 96);
    v.normalRadius = 2;
    const hull = pal.add(variant ? '#27466e' : '#d8483a');
    const stripe = pal.add('#f4efe0');
    const deck = pal.add('#b98a52');
    const sail = pal.add(variant ? '#f2a64a' : '#f6f1e2');
    const jib = pal.add(variant ? '#f6f1e2' : '#e9e3cf');
    const mast = pal.add('#6f5a46');
    const flag = pal.add('#d8483a');
    v.ellipsoidIf(0, 6, 0, 24, 7, 8, hull, (_x, y) => y <= 8);
    v.box(-20, 8, -1, 20, 8, 1, deck);
    for (let x = -22; x <= 22; x++) v.set(x, 6, -Math.round(7.2 * Math.sqrt(Math.max(0, 1 - (x / 24) ** 2))), stripe);
    v.tube(0, 8, 0, 0, 78, 0, 1.1, 0.7, mast);
    for (let y = 12; y <= 74; y++) {
      const w = Math.round((76 - y) * 0.36);
      v.box(2, y, -1, 2 + w, y, 1, sail);
      const j = Math.round((72 - y) * 0.26);
      if (y < 68) v.box(-2 - j, y, -1, -2, y, 1, jib);
    }
    v.box(0, 78, 0, 6, 80, 0, flag);
    return v;
  },
  17,
  { bob: 0.7, far: 1100 },
);

const umbrella = prop(
  0.25,
  2,
  (variant, _rand, pal) => {
    const v = grid(pal, 24, 20, 64);
    v.normalRadius = 2;
    const pole = pal.add('#e9e2d0');
    const a = pal.add(variant ? '#2f8fd0' : '#d8483a');
    const b = pal.add('#f6f1e2');
    const towel = pal.add(variant ? '#f2c14e' : '#2f8fd0');
    v.tube(0, 0, 0, 1, 48, 0, 1.2, 1, pole);
    for (let z = -19; z <= 19; z++) {
      for (let x = -19; x <= 19; x++) {
        const r = Math.hypot(x, z);
        if (r > 19) continue;
        const y = 47 + Math.round((1 - (r / 19) ** 2) * 10);
        const c = Math.floor((Math.atan2(z, x) + Math.PI) / (Math.PI / 4)) % 2 ? a : b;
        v.set(x, y, z, c);
        v.set(x, y - 1, z, c);
      }
    }
    v.box(-14, 0, -16, 6, 0, -6, towel);
    return v;
  },
  19,
);

export const FARO_PROPS: Record<string, PropDef> = {
  sailboat,
  umbrella,
  palm,
  bush,
  rock: rocks,
  sign,
  lighthouse,
  bouy: buoy,
  arch,
};

// Reservado para rótulos con la fuente de voxeles en otros props.
void label;
void mix;
