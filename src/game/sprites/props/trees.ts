import type { Voxels } from '../voxel';

type P = [number, number, number];

export interface BranchTreeOptions {
  /** Corteza: tono principal, oscuro y claro. */
  bark: [number, number, number];
  height: number;
  /** Desvío horizontal de la copa respecto a la base. */
  lean: number;
  branches: number;
  /** Longitud de las ramas más bajas. */
  reach: number;
  radius: number;
  /** Color de la nieve sobre las ramas, si la hay. */
  snow?: number;
}

/** Árbol sin hojas: tronco curvo, ramas que suben y ramitas. Sirve para troncos secos y abedules de invierno. */
export function branchTree(v: Voxels, rand: () => number, o: BranchTreeOptions) {
  const [barkA, barkB, barkC] = o.bark;
  const pts: P[] = [];
  for (let i = 0; i <= 10; i++) {
    const t = i / 10;
    pts.push([o.lean * t * t, t * o.height, Math.sin(t * 3.1) * 3]);
  }
  for (let i = 0; i < 10; i++) {
    const r = o.radius * (1 - (i / 10) * 0.55);
    v.tube(...pts[i], ...pts[i + 1], r, r * 0.9, i % 3 === 0 ? barkB : barkA);
  }
  v.ellipsoid(0, 3, 0, o.radius * 1.5, 4, o.radius * 1.5, barkB);

  for (let b = 0; b < o.branches; b++) {
    const t = 0.3 + (b / o.branches) * 0.6;
    const [bx, by, bz] = pts[Math.min(9, Math.floor(t * 10))];
    const dir = b % 2 ? 1 : -1;
    const len = o.reach * (1 - t * 0.45) * (0.8 + rand() * 0.4);
    const rise = 6 + rand() * 10;
    const drift = (rand() - 0.5) * 8;
    const mid: P = [bx + dir * len * 0.55, by + rise * 0.6, bz + drift * 0.5];
    const tip: P = [bx + dir * len, by + rise, bz + drift];
    v.tube(bx, by, bz, ...mid, o.radius * 0.5, o.radius * 0.38, barkC);
    v.tube(...mid, ...tip, o.radius * 0.38, o.radius * 0.2, barkC);
    for (let k = 0; k < 2; k++) {
      v.tube(mid[0], mid[1], mid[2], mid[0] + dir * len * 0.3, mid[1] + 8 + k * 3, mid[2] + (k ? 4 : -4), o.radius * 0.25, o.radius * 0.12, barkC);
    }
    if (o.snow) v.ellipsoid(tip[0], tip[1] + 1.2, tip[2], 3.2, 1.2, 2, o.snow);
  }

  const top = pts[10];
  v.tube(...top, top[0] + 5, top[1] + 14, top[2] + 2, o.radius * 0.5, o.radius * 0.18, barkC);
  v.tube(...top, top[0] - 6, top[1] + 11, top[2] - 2, o.radius * 0.45, o.radius * 0.16, barkC);
}
