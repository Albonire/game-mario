/**
 * Motor voxel mínimo para generar sprites. Se modela con primitivas en una rejilla 3D y se
 * renderiza por salpicado (splat) con z-buffer, sombreado por normal suave, oclusión
 * ambiental y contorno de 1 px. Todo corre al cargar; en juego solo se dibujan los cuadros.
 *
 * Ejes del modelo: x = derecha del kart, y = arriba, z = hacia delante.
 */

export type RGB = [number, number, number];

export interface PaletteEntry {
  rgb: RGB;
  /** Fracción de luz propia (ojos, faros): ignora el sombreado. */
  emissive: number;
}

export function hexToRgb(hex: string): RGB {
  const n = parseInt(hex.replace('#', ''), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

export class Palette {
  readonly entries: PaletteEntry[] = [{ rgb: [0, 0, 0], emissive: 0 }];
  add(hex: string, emissive = 0): number {
    this.entries.push({ rgb: hexToRgb(hex), emissive });
    return this.entries.length - 1;
  }
}

export interface SurfaceVoxel {
  x: number;
  y: number;
  z: number;
  c: number;
  nx: number;
  ny: number;
  nz: number;
  ao: number;
}

export class Voxels {
  readonly data: Uint8Array;
  private surface: SurfaceVoxel[] | null = null;

  /** `half` es el semiancho de la rejilla en cada eje horizontal; `height` el alto total. */
  constructor(
    readonly palette: Palette,
    readonly halfX: number,
    readonly halfZ: number,
    readonly height: number,
  ) {
    this.sx = halfX * 2 + 1;
    this.sz = halfZ * 2 + 1;
    this.data = new Uint8Array(this.sx * this.height * this.sz);
  }

  readonly sx: number;
  readonly sz: number;

  private index(x: number, y: number, z: number) {
    return ((y * this.sz + (z + this.halfZ)) * this.sx) + (x + this.halfX);
  }

  inside(x: number, y: number, z: number) {
    return x >= -this.halfX && x <= this.halfX && z >= -this.halfZ && z <= this.halfZ && y >= 0 && y < this.height;
  }

  get(x: number, y: number, z: number): number {
    return this.inside(x, y, z) ? this.data[this.index(x, y, z)] : 0;
  }

  /** Escribe un voxel. Las coordenadas se redondean: un índice fraccionario se perdería en silencio. */
  set(x: number, y: number, z: number, c: number) {
    x = Math.round(x);
    y = Math.round(y);
    z = Math.round(z);
    if (this.inside(x, y, z)) {
      this.data[this.index(x, y, z)] = c;
      this.surface = null;
    }
  }

  /** Caja con esquinas inclusivas. */
  box(x0: number, y0: number, z0: number, x1: number, y1: number, z1: number, c: number) {
    for (let y = Math.min(y0, y1); y <= Math.max(y0, y1); y++) {
      for (let z = Math.min(z0, z1); z <= Math.max(z0, z1); z++) {
        for (let x = Math.min(x0, x1); x <= Math.max(x0, x1); x++) this.set(x, y, z, c);
      }
    }
  }

  ellipsoid(cx: number, cy: number, cz: number, rx: number, ry: number, rz: number, c: number) {
    for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++) {
      for (let z = Math.floor(cz - rz); z <= Math.ceil(cz + rz); z++) {
        for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) {
          const dx = (x - cx) / rx;
          const dy = (y - cy) / ry;
          const dz = (z - cz) / rz;
          if (dx * dx + dy * dy + dz * dz <= 1) this.set(x, y, z, c);
        }
      }
    }
  }

  /** Elipsoide que solo escribe donde `keep` devuelve verdadero (cascos, cuernos con huecos). */
  ellipsoidIf(
    cx: number,
    cy: number,
    cz: number,
    rx: number,
    ry: number,
    rz: number,
    c: number,
    keep: (x: number, y: number, z: number) => boolean,
  ) {
    for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++) {
      for (let z = Math.floor(cz - rz); z <= Math.ceil(cz + rz); z++) {
        for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) {
          const dx = (x - cx) / rx;
          const dy = (y - cy) / ry;
          const dz = (z - cz) / rz;
          if (dx * dx + dy * dy + dz * dz <= 1 && keep(x, y, z)) this.set(x, y, z, c);
        }
      }
    }
  }

  /**
   * Pega otro modelo girado `yaw` radianes sobre el eje vertical, con su origen en (ox, oy, oz).
   * Usa mapeo inverso para que el giro no deje huecos. Los voxeles vacíos del origen no borran nada.
   */
  paste(src: Voxels, ox: number, oy: number, oz: number, yaw: number, k = 1) {
    const cos = Math.cos(yaw);
    const sin = Math.sin(yaw);
    const reach = Math.ceil(Math.hypot(src.halfX, src.halfZ) * k) + 1;
    const top = Math.ceil(src.height * k);
    for (let y = 0; y < top; y++) {
      const sy = Math.floor(y / k);
      for (let dz = -reach; dz <= reach; dz++) {
        for (let dx = -reach; dx <= reach; dx++) {
          const sx = Math.round((dx * cos - dz * sin) / k);
          const sz = Math.round((dx * sin + dz * cos) / k);
          const c = src.get(sx, sy, sz);
          if (c) this.set(ox + dx, oy + y, oz + dz, c);
        }
      }
    }
  }

  /** Cilindro de eje `axis` y radio r, de longitud `len` centrado en (cx, cy, cz). */
  cylinder(cx: number, cy: number, cz: number, r: number, len: number, axis: 'x' | 'y' | 'z', c: number) {
    const h = len / 2;
    const rx = axis === 'x' ? h : r;
    const ry = axis === 'y' ? h : r;
    const rz = axis === 'z' ? h : r;
    for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++) {
      for (let z = Math.floor(cz - rz); z <= Math.ceil(cz + rz); z++) {
        for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) {
          const a = axis === 'x' ? y - cy : axis === 'y' ? x - cx : x - cx;
          const b = axis === 'x' ? z - cz : axis === 'y' ? z - cz : y - cy;
          const along = axis === 'x' ? x - cx : axis === 'y' ? y - cy : z - cz;
          if (a * a + b * b <= r * r && Math.abs(along) <= h) this.set(x, y, z, c);
        }
      }
    }
  }

  /** Cápsula entre dos puntos con radio que varía de r0 a r1 (cuernos, colas, brazos). */
  tube(x0: number, y0: number, z0: number, x1: number, y1: number, z1: number, r0: number, r1: number, c: number) {
    const len = Math.hypot(x1 - x0, y1 - y0, z1 - z0);
    const steps = Math.max(2, Math.ceil(len * 1.6));
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const r = r0 + (r1 - r0) * t;
      this.ellipsoid(x0 + (x1 - x0) * t, y0 + (y1 - y0) * t, z0 + (z1 - z0) * t, r, r, r, c);
    }
  }

  /** Curva suave por varios puntos con radio decreciente. */
  curve(points: Array<[number, number, number]>, r0: number, r1: number, c: number) {
    for (let i = 0; i < points.length - 1; i++) {
      const ta = i / (points.length - 1);
      const tb = (i + 1) / (points.length - 1);
      const a = points[i];
      const b = points[i + 1];
      this.tube(a[0], a[1], a[2], b[0], b[1], b[2], r0 + (r1 - r0) * ta, r0 + (r1 - r0) * tb, c);
    }
  }

  /** Ejecuta `build` con el signo lateral +1 y -1 para modelar piezas simétricas una sola vez. */
  mirror(build: (side: 1 | -1) => void) {
    build(1);
    build(-1);
  }

  /** Cuenta voxeles ocupados (para pruebas y presupuesto). */
  count() {
    let n = 0;
    for (const v of this.data) if (v) n++;
    return n;
  }

  /** Voxeles visibles con normal suave y oclusión ambiental. Se calcula una vez. */
  getSurface(): SurfaceVoxel[] {
    if (this.surface) return this.surface;
    const out: SurfaceVoxel[] = [];
    const faces: Array<[number, number, number]> = [
      [1, 0, 0],
      [-1, 0, 0],
      [0, 1, 0],
      [0, -1, 0],
      [0, 0, 1],
      [0, 0, -1],
    ];
    for (let y = 0; y < this.height; y++) {
      for (let z = -this.halfZ; z <= this.halfZ; z++) {
        for (let x = -this.halfX; x <= this.halfX; x++) {
          const c = this.get(x, y, z);
          if (!c) continue;
          let exposed = false;
          for (const [fx, fy, fz] of faces) {
            if (!this.get(x + fx, y + fy, z + fz)) {
              exposed = true;
              break;
            }
          }
          if (!exposed) continue;
          // Normal suave: dirección opuesta a la masa en un entorno de radio 2.
          let sx = 0;
          let sy = 0;
          let sz = 0;
          let filled = 0;
          for (let dy = -3; dy <= 3; dy++) {
            for (let dz = -3; dz <= 3; dz++) {
              for (let dx = -3; dx <= 3; dx++) {
                if (!dx && !dy && !dz) continue;
                if (this.get(x + dx, y + dy, z + dz)) {
                  const w = 1 / (1 + dx * dx + dy * dy + dz * dz);
                  sx -= dx * w;
                  sy -= dy * w;
                  sz -= dz * w;
                  if (Math.abs(dx) <= 1 && Math.abs(dy) <= 1 && Math.abs(dz) <= 1) filled++;
                }
              }
            }
          }
          let len = Math.hypot(sx, sy, sz);
          if (len < 1e-4) {
            // Voxel aislado: usa la cara expuesta.
            for (const [fx, fy, fz] of faces) {
              if (!this.get(x + fx, y + fy, z + fz)) {
                sx += fx;
                sy += fy;
                sz += fz;
              }
            }
            len = Math.hypot(sx, sy, sz) || 1;
          }
          out.push({ x, y, z, c, nx: sx / len, ny: sy / len, nz: sz / len, ao: Math.max(0.55, Math.min(1, 1 - (filled - 10) * 0.045)) });
        }
      }
    }
    this.surface = out;
    return out;
  }
}

export interface RenderOptions {
  /** Giro del modelo respecto a la cámara, en radianes (0 = visto desde atrás). */
  yaw: number;
  /** Elevación de la cámara sobre el horizonte, en radianes. */
  pitch: number;
  /** Píxeles por voxel. */
  scale: number;
  /** Tamaño del cuadro. */
  width: number;
  height: number;
  /** Fila del cuadro donde cae el origen del suelo. */
  groundY: number;
  /** Luz: vector hacia la fuente en coordenadas de cámara. */
  light?: [number, number, number];
  outline?: RGB;
}

const DEFAULT_LIGHT: [number, number, number] = [-0.42, 0.8, -0.44];
const OUTLINE: RGB = [10, 14, 22];

/** Renderiza el modelo en un cuadro RGBA con fondo transparente. */
export function renderVoxels(model: Voxels, opts: RenderOptions): ImageData {
  const { width: W, height: H, scale } = opts;
  const light = opts.light ?? DEFAULT_LIGHT;
  const ll = Math.hypot(...light);
  const lx = light[0] / ll;
  const ly = light[1] / ll;
  const lz = light[2] / ll;
  const outline = opts.outline ?? OUTLINE;
  const color = new Uint8ClampedArray(W * H * 4);
  const depth = new Float32Array(W * H).fill(Infinity);
  const sy = Math.sin(opts.yaw);
  const cy = Math.cos(opts.yaw);
  const sp = Math.sin(opts.pitch);
  const cp = Math.cos(opts.pitch);
  const surface = model.getSurface();
  const palette = model.palette.entries;
  const splat = Math.max(1, Math.ceil(scale * 1.12));
  const originX = W / 2;

  for (const v of surface) {
    // Normal en coordenadas de cámara (v hacia arriba, w hacia lejos).
    const nzc = -v.nx * sy + v.nz * cy;
    const nwd = nzc * cp - v.ny * sp;
    // Las caras que miran con fuerza hacia el lado contrario a la cámara quedan tapadas.
    if (nwd > 0.72) continue;
    const nxc = v.nx * cy + v.nz * sy;
    const nvy = v.ny * cp + nzc * sp;

    // Giro sobre el eje vertical y luego inclinación de cámara.
    const xc = v.x * cy + v.z * sy;
    const zc = -v.x * sy + v.z * cy;
    const vy = v.y * cp + zc * sp;
    const wd = zc * cp - v.y * sp;
    const px = Math.round(originX + xc * scale - splat / 2);
    const py = Math.round(opts.groundY - vy * scale - splat / 2);
    if (px < -splat || py < -splat || px >= W || py >= H) continue;

    const lambert = Math.max(0, nxc * lx + nvy * ly + nwd * lz);
    const rim = Math.max(0, nxc * 0.55 + nvy * 0.25 + nwd * 0.62) * 0.12;
    const pal = palette[v.c];
    const lit = pal.emissive > 0 ? 1 : Math.round(Math.min(1, (0.5 + 0.62 * lambert + rim) * (0.5 + 0.5 * v.ao)) * 4) / 4;
    // Sombras frías y luces cálidas.
    const k = 0.34 + 0.9 * lit;
    const cool = (1 - lit) * 0.22;
    const warm = Math.max(0, lit - 0.8) * 0.28;
    const em = pal.emissive;
    const r = Math.min(255, pal.rgb[0] * k * (1 - cool * 0.7) + warm * 40 + em * 255 * 0.3);
    const g = Math.min(255, pal.rgb[1] * k * (1 - cool * 0.35) + warm * 22 + em * 255 * 0.3);
    const b = Math.min(255, pal.rgb[2] * k * (1 + cool * 0.45) + em * 255 * 0.2);

    for (let oy = 0; oy < splat; oy++) {
      const y = py + oy;
      if (y < 0 || y >= H) continue;
      for (let ox = 0; ox < splat; ox++) {
        const x = px + ox;
        if (x < 0 || x >= W) continue;
        const i = y * W + x;
        if (wd < depth[i]) {
          depth[i] = wd;
          const o = i * 4;
          color[o] = r;
          color[o + 1] = g;
          color[o + 2] = b;
          color[o + 3] = 255;
        }
      }
    }
  }

  // Contorno exterior de 1 px y líneas internas donde la profundidad salta.
  const edge = 2.6;
  const pending: number[] = [];
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const i = y * W + x;
      if (color[i * 4 + 3] === 0) {
        const near =
          (x > 0 && color[(i - 1) * 4 + 3] > 0) ||
          (x < W - 1 && color[(i + 1) * 4 + 3] > 0) ||
          (y > 0 && color[(i - W) * 4 + 3] > 0) ||
          (y < H - 1 && color[(i + W) * 4 + 3] > 0);
        if (near) pending.push(i * 4);
      } else {
        const d = depth[i];
        const closer =
          (x > 0 && color[(i - 1) * 4 + 3] > 0 && d - depth[i - 1] > edge) ||
          (x < W - 1 && color[(i + 1) * 4 + 3] > 0 && d - depth[i + 1] > edge) ||
          (y > 0 && color[(i - W) * 4 + 3] > 0 && d - depth[i - W] > edge) ||
          (y < H - 1 && color[(i + W) * 4 + 3] > 0 && d - depth[i + W] > edge);
        if (closer) {
          const o = i * 4;
          color[o] *= 0.55;
          color[o + 1] *= 0.55;
          color[o + 2] *= 0.6;
        }
      }
    }
  }
  for (const o of pending) {
    color[o] = outline[0];
    color[o + 1] = outline[1];
    color[o + 2] = outline[2];
    color[o + 3] = 235;
  }
  return new ImageData(color, W, H);
}
