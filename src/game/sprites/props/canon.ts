import { grid, prop, recolorBands, rock, type PropDef } from '../propKit';
import type { Palette, Voxels } from '../voxel';
import { archProp } from './arch';
import { branchTree } from './trees';

/** Props del Cañón del Sol: cactus, roca roja, mesas, un molino y un arco natural. */

const cactus = prop(
  0.3,
  3,
  (variant, rand, pal) => {
    const v = grid(pal, 40, 26, 140);
    v.normalRadius = 2;
    const main = pal.add('#3f8c4e');
    const dark = pal.add('#2a6a3b');
    const light = pal.add('#62ad61');
    const spine = pal.add('#f1e8c0');
    const bloom = pal.add('#f08aa6');
    const H = 94 + variant * 10;
    const R = 7;

    v.cylinder(0, H / 2, 0, R, H, 'y', main);
    v.ellipsoid(0, H, 0, R, 6, R, main);
    // Costillas verticales: alternan tono oscuro y claro alrededor del tronco.
    for (let k = 0; k < 10; k++) {
      const a = (k / 10) * Math.PI * 2;
      for (let y = 2; y < H + 4; y++) {
        const taper = y > H ? Math.sqrt(Math.max(0, 1 - ((y - H) / 6) ** 2)) : 1;
        v.set(Math.cos(a) * (R - 0.4) * taper, y, Math.sin(a) * (R - 0.4) * taper, k % 2 ? dark : light);
      }
    }
    const arms: Array<[number, number, number, number]> =
      variant === 0
        ? [
            [-1, 50, 20, 34],
            [1, 68, 18, 26],
          ]
        : variant === 1
          ? [[1, 58, 22, 40]]
          : [
              [-1, 42, 16, 22],
              [1, 60, 20, 36],
              [-1, 78, 14, 16],
            ];
    for (const [side, y, reach, rise] of arms) {
      const r = 4.6;
      const ex = side * (R + reach);
      v.tube(side * 4, y, 0, ex, y, 0, r, r, main);
      v.tube(ex, y, 0, ex, y + rise, 0, r, r - 0.4, main);
      v.ellipsoid(ex, y + rise + 2, 0, r - 0.4, 4, r - 0.4, main);
      for (const t of [-3, 0, 3]) {
        const z = -Math.sqrt(r * r - t * t) + 0.5;
        for (let yy = y + 1; yy < y + rise + 3; yy++) v.set(ex + t, yy, z, t === 0 ? dark : light);
      }
    }
    // Espinas: puntos claros repartidos por la cara visible.
    for (let i = 0; i < 70; i++) {
      const a = Math.PI + rand() * Math.PI;
      v.set(Math.cos(a) * R, 4 + rand() * (H - 6), Math.sin(a) * R, spine);
    }
    if (variant !== 1) v.ellipsoid(0, H + 6, -1, 2.4, 2.4, 2.4, bloom);
    return v;
  },
  3,
);

const barrel = prop(
  0.3,
  2,
  (variant, _rand, pal) => {
    const v = grid(pal, 26, 22, 40);
    v.normalRadius = 2;
    const main = pal.add('#4b9657');
    const dark = pal.add('#2f703f');
    const spine = pal.add('#f4e7ac');
    const yellow = pal.add('#f2c94c');
    const pink = pal.add('#ee7fa0');
    const rx = 12 + variant * 2;
    const ry = 10 + variant * 2;
    const body = (cx: number, cy: number, rxx: number, ryy: number) => {
      v.ellipsoid(cx, cy, 0, rxx, ryy, rxx, main);
      for (let k = 0; k < 14; k++) {
        const a = (k / 14) * Math.PI * 2;
        for (let t = -80; t <= 80; t += 4) {
          const phi = (t * Math.PI) / 180;
          const x = cx + Math.cos(a) * Math.cos(phi) * rxx;
          const z = Math.sin(a) * Math.cos(phi) * rxx;
          const y = cy + Math.sin(phi) * ryy;
          v.set(x, y, z, k % 2 ? dark : main);
          if (k % 2 === 0 && t % 16 === 0) v.set(x, y, z - 1, spine);
        }
      }
    };
    body(0, ry - 1, rx, ry);
    if (variant === 1) body(rx * 0.95, 6, 7, 6);
    for (let k = 0; k < 5; k++) {
      const a = (k / 5) * Math.PI * 2;
      v.ellipsoid(Math.cos(a) * 3.4, ry * 2 - 3, Math.sin(a) * 3.4, 1.8, 1.8, 1.8, variant ? pink : yellow);
    }
    return v;
  },
  5,
);

const redRock = prop(
  0.3,
  3,
  (variant, rand, pal) => {
    const v = grid(pal, 32, 26, 44);
    const tones = ['#8d4630', '#a65a3d', '#bf7050', '#d58a63'].map((c) => pal.add(c));
    const shade = ['#6f3626', '#85452f', '#9a553c', '#b46c4b'].map((c) => pal.add(c));
    rock(v, 0, 10, 0, 18 + variant * 2, 10, 14, tones[0], rand, 0.3);
    rock(v, -4 + variant * 3, 18, 0, 13, 8, 10, tones[1], rand, 0.3);
    rock(v, 9, 8, -4, 9, 7, 8, tones[2], rand, 0.3);
    rock(v, -2, 25, -1, 8, 5, 6, tones[3], rand, 0.25);
    recolorBands(v, new Map(tones.map((t, i) => [t, shade[i]])), 4, variant);
    return v;
  },
  7,
);

const deadTree = prop(
  0.3,
  2,
  (variant, rand, pal) => {
    const v = grid(pal, 36, 24, 96);
    v.normalRadius = 2;
    const bark = [pal.add('#8c7a66'), pal.add('#5f5043'), pal.add('#b5a48c')] as [number, number, number];
    branchTree(v, rand, { bark, height: 54 + variant * 10, lean: (variant ? 8 : -6), branches: 5 + variant, reach: 26, radius: 4.8 });
    return v;
  },
  9,
);

const skullSign = prop(
  0.25,
  1,
  (_variant, _rand, pal) => {
    const v = grid(pal, 22, 8, 80);
    const wood = pal.add('#8a6842');
    const woodDark = pal.add('#5e4630');
    const bone = pal.add('#efe6d0');
    const boneShade = pal.add('#c9bda3');
    const hole = pal.add('#2a2320');
    v.box(-1, 0, -1, 1, 46, 1, woodDark);
    v.box(-14, 36, -2, 14, 46, -1, wood);
    v.box(-14, 36, -2, 14, 37, -1, woodDark);
    v.box(-14, 45, -2, 14, 46, -1, woodDark);
    // Cráneo de res sobre la tabla.
    v.ellipsoid(0, 56, -2, 6, 7, 4, bone);
    v.ellipsoid(0, 49, -3, 3.4, 5, 3, boneShade);
    v.mirror((s) => {
      v.tube(s * 5, 58, -2, s * 13, 60, -2, 1.9, 1.4, bone);
      v.tube(s * 13, 60, -2, s * 17, 69, -2, 1.4, 0.7, bone);
      v.ellipsoid(s * 2.4, 57, -5.5, 1.6, 1.8, 1, hole);
    });
    v.box(-1, 46, -5, 1, 48, -5, hole);
    return v;
  },
  11,
);

interface MesaSpec {
  rx: number;
  rz: number;
  h: number;
  talus: number;
}

/** Mesa: talud arenoso, paredes con estratos que retroceden en escalones y una tapa oscura. */
function buildMesa(pal: Palette, rand: () => number, s: MesaSpec): Voxels {
  const half = Math.ceil(s.rx * 1.75);
  const halfZ = Math.ceil(s.rz * 1.75);
  const v = grid(pal, half, halfZ, s.h + 4);
  v.normalRadius = 2;
  const bands = ['#a9573a', '#bd6a49', '#cc7b57', '#9a4a32', '#d38c63', '#b4603f'].map((c) => pal.add(c));
  const bandsDark = ['#7f3d29', '#92492f', '#a15a40', '#74351f', '#a66845', '#8a452c'].map((c) => pal.add(c));
  const sandy = ['#c98a5e', '#dba274', '#b87650'].map((c) => pal.add(c));
  const cap = pal.add('#8a4a33');
  const phase = [rand() * 6, rand() * 6, rand() * 6];
  const talusH = s.h * s.talus;
  const ledgeH = (s.h - talusH) / 4;
  // Lo que no depende de la altura se calcula una vez por columna.
  const cols = (half * 2 + 1) * (halfZ * 2 + 1);
  const colD = new Float32Array(cols);
  const colA = new Float32Array(cols);
  const colWob = new Float32Array(cols);
  const colSin4 = new Float32Array(cols);
  const colCos4 = new Float32Array(cols);
  const colGroove = new Uint8Array(cols);
  let ci = 0;
  for (let z = -halfZ; z <= halfZ; z++) {
    for (let x = -half; x <= half; x++, ci++) {
      const nx = x / s.rx;
      const nz = z / s.rz;
      const a = Math.atan2(nz, nx);
      colD[ci] = Math.hypot(nx, nz);
      colA[ci] = a;
      colWob[ci] = 1 + 0.12 * Math.sin(3 * a + phase[0]) + 0.08 * Math.sin(5 * a + phase[1]) + 0.04 * Math.sin(9 * a + phase[2]);
      colSin4[ci] = Math.sin(4 * a);
      colCos4[ci] = Math.cos(4 * a);
      colGroove[ci] = Math.sin(a * 13 + phase[1]) > 0.82 ? 1 : 0;
    }
  }
  for (let y = 0; y < s.h; y++) {
    const inTalus = y < talusH;
    const t = inTalus ? 1 - y / talusH : 0;
    const grow = 1 + t * t * 0.42;
    const ledge = inTalus ? 0 : Math.floor((y - talusH) / ledgeH);
    const shrink = inTalus ? 0 : ledge * 0.04 + ((y - talusH) / (s.h - talusH)) * 0.03;
    const base = grow - shrink;
    const sy = Math.sin(y * 0.45);
    const cy = Math.cos(y * 0.45);
    ci = 0;
    for (let z = -halfZ; z <= halfZ; z++) {
      for (let x = -half; x <= half; x++, ci++) {
        const d = colD[ci];
        if (d > base * 1.32) continue;
        const lim = base * (colWob[ci] + 0.025 * (sy * colCos4[ci] + cy * colSin4[ci]));
        if (d > lim) continue;
        let c: number;
        if (inTalus) {
          c = sandy[(Math.floor(y / 3) + Math.floor(colA[ci] * 2 + 9)) % 3];
        } else {
          const bi = (Math.floor((y + phase[2]) / 4) + (d > lim * 0.9 ? 0 : 1)) % bands.length;
          c = colGroove[ci] && d > lim * 0.9 ? bandsDark[bi] : bands[bi];
          if (y >= s.h - 3) c = cap;
        }
        v.set(x, y, z, c);
      }
    }
  }
  return v;
}

const MESA_FAR = 1100;

const mesaSmall = prop(1.3, 2, (_variant, rand, pal) => buildMesa(pal, rand, { rx: 30, rz: 22, h: 40, talus: 0.35 }), 13, { minLod: 1, far: MESA_FAR });
const mesaMedium = prop(1.4, 2, (_variant, rand, pal) => buildMesa(pal, rand, { rx: 44, rz: 30, h: 56, talus: 0.3 }), 17, { minLod: 1, far: MESA_FAR });
const mesaLarge = prop(1.5, 1, (_variant, rand, pal) => buildMesa(pal, rand, { rx: 58, rz: 38, h: 78, talus: 0.28 }), 19, { minLod: 1, far: 1500 });

const windmill = prop(
  0.5,
  1,
  (_variant, _rand, pal) => {
    const v = grid(pal, 48, 26, 150);
    v.normalRadius = 2;
    const steel = pal.add('#aab4b8');
    const dark = pal.add('#6c777c');
    const rust = pal.add('#a2573a');
    const blade = pal.add('#ded8c6');
    const tip = pal.add('#c2452f');
    const wood = pal.add('#8a6a46');
    const woodDark = pal.add('#5e4630');
    const topY = 92;

    // Torre de celosía con cuatro patas que se estrechan.
    const leg = (sx: number, sz: number, y: number) => {
      const k = y / topY;
      return [sx * (14 - 9 * k), y, sz * (14 - 9 * k)] as const;
    };
    for (const sx of [-1, 1]) {
      for (const sz of [-1, 1]) {
        const [x0, y0, z0] = leg(sx, sz, 0);
        const [x1, y1, z1] = leg(sx, sz, topY);
        v.tube(x0, y0, z0, x1, y1, z1, 1.6, 1.2, steel);
      }
    }
    for (let y = 14; y < topY; y += 14) {
      const pairs: Array<[number, number, number, number]> = [
        [-1, -1, 1, -1],
        [1, -1, 1, 1],
        [1, 1, -1, 1],
        [-1, 1, -1, -1],
      ];
      for (const [ax, az, bx, bz] of pairs) {
        const a = leg(ax, az, y);
        const b = leg(bx, bz, y);
        v.tube(a[0], a[1], a[2], b[0], b[1], b[2], 0.9, 0.9, dark);
        const c = leg(bx, bz, Math.min(topY, y + 14));
        v.tube(a[0], a[1], a[2], c[0], c[1], c[2], 0.7, 0.7, dark);
      }
    }
    v.box(-7, topY, -7, 7, topY + 2, 7, dark);
    v.ellipsoid(0, topY + 8, 0, 6, 6, 9, rust);
    v.ellipsoid(0, topY + 8, -9, 3.2, 3.2, 3, dark);
    // Rueda: aros y aspas.
    const cy = topY + 16;
    const wheelZ = -11;
    const R = 34;
    for (let i = 0; i < 48; i++) {
      const a0 = (i / 48) * Math.PI * 2;
      const a1 = ((i + 1) / 48) * Math.PI * 2;
      v.tube(Math.cos(a0) * R, cy + Math.sin(a0) * R, wheelZ, Math.cos(a1) * R, cy + Math.sin(a1) * R, wheelZ, 1.1, 1.1, steel);
      v.tube(Math.cos(a0) * 19, cy + Math.sin(a0) * 19, wheelZ, Math.cos(a1) * 19, cy + Math.sin(a1) * 19, wheelZ, 0.8, 0.8, steel);
    }
    v.tube(0, topY + 12, -9, 0, cy, wheelZ, 2, 2, dark);
    for (let k = 0; k < 16; k++) {
      const a = (k / 16) * Math.PI * 2;
      v.tube(Math.cos(a) * 3, cy + Math.sin(a) * 3, wheelZ, Math.cos(a) * R, cy + Math.sin(a) * R, wheelZ, 0.9, 0.9, dark);
      // Aspa: placa estrecha entre los dos aros.
      const ca = Math.cos(a);
      const sa = Math.sin(a);
      for (let r = 20; r < R - 1; r += 1.2) {
        v.ellipsoid(ca * r, cy + sa * r, wheelZ - 1, 1.5, 1.5, 0.7, k % 4 === 0 ? tip : blade);
      }
    }
    // Cola.
    v.box(-1, topY + 5, 8, 1, topY + 20, 26, steel);
    // Depósito de madera.
    v.cylinder(30, 10, 8, 10, 20, 'y', wood);
    for (const y of [3, 10, 17]) v.cylinder(30, y, 8, 10.4, 1, 'y', woodDark);
    v.cylinder(30, 21, 8, 10, 2, 'y', woodDark);
    return v;
  },
  23,
  { minLod: 1, far: 1100 },
);

const rockArch = prop(
  1.2,
  1,
  (_variant, rand, pal) => {
    const v = grid(pal, 58, 24, 74);
    v.normalRadius = 2;
    const tones = ['#8d4630', '#a65a3d', '#bf7050', '#d58a63', '#a65a3d', '#8d4630'].map((c) => pal.add(c));
    const phase = rand() * 6;
    for (let y = 0; y < 72; y++) {
      for (let z = -22; z <= 22; z++) {
        for (let x = -56; x <= 56; x++) {
          const outer = (x / 54) ** 2 + (y / 66) ** 2;
          const inner = (x / 27) ** 2 + (y / 44) ** 2;
          const wob = 1 + 0.06 * Math.sin(x * 0.2 + phase) + 0.05 * Math.sin(y * 0.25 + z * 0.1);
          if (outer > wob || inner < 1) continue;
          const depth = 17 * (1 - 0.3 * (y / 66)) + 3 * Math.sin(x * 0.12 + phase);
          if (Math.abs(z) > depth) continue;
          v.set(x, y, z, tones[(Math.floor(y / 6) + (Math.abs(z) > depth - 3 ? 1 : 0)) % tones.length]);
        }
      }
    }
    return v;
  },
  29,
  { minLod: 1, far: 1100 },
);

const archCanon = archProp(
  {
    pylon: ['#a9573a', '#8d4630'],
    pylonLight: '#d98c63',
    beam: '#5e4630',
    trim: '#f0b94a',
    checkA: '#f4efe0',
    checkB: '#2a2320',
    flag: '#c2452f',
    ornament: (v, pal) => {
      // Sol de latón sobre la viga.
      const gold = pal.add('#f2c14e');
      const ray = pal.add('#e08a2c');
      const wood = pal.add('#5e4630');
      v.box(-1, 52, -5, 1, 58, -5, wood);
      v.ellipsoid(0, 66, -6, 8, 8, 1.6, gold);
      for (let k = 0; k < 12; k++) {
        const a = (k / 12) * Math.PI * 2;
        v.tube(Math.cos(a) * 10, 66 + Math.sin(a) * 10, -6, Math.cos(a) * 15, 66 + Math.sin(a) * 15, -6, 1.1, 0.5, ray);
      }
    },
  },
  31,
);

export const CANON_PROPS: Record<string, PropDef> = {
  cactus,
  cactus_barrel: barrel,
  rock_red: redRock,
  dead_tree: deadTree,
  sign_skull: skullSign,
  mesa_s: mesaSmall,
  mesa_m: mesaMedium,
  mesa_l: mesaLarge,
  windmill,
  rock_arch: rockArch,
  arch_canon: archCanon,
};
