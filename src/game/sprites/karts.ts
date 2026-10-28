import { hash2 } from '../terrain/noise';
import type { Pilot, PilotId } from '../types';
import { Palette, Voxels } from './voxel';

/** Tamaño de un voxel del kart en unidades del mundo (4 voxeles por unidad). */
export const VOXEL_UNITS = 0.25;

/** Rejilla del kart: ±24 de ancho, ±32 de largo y 46 de alto. */
const HALF_X = 24;
const HALF_Z = 32;
const HEIGHT = 46;

export interface KartPose {
  /** -1 (izquierda) a 1 (derecha): gira ruedas delanteras y cabeza. */
  steer: number;
}

export const NEUTRAL_POSE: KartPose = { steer: 0 };

function shade(hex: string, amt: number) {
  const n = parseInt(hex.replace('#', ''), 16);
  const f = (v: number) => Math.max(0, Math.min(255, v + amt));
  return `#${[f((n >> 16) & 255), f((n >> 8) & 255), f(n & 255)].map((v) => v.toString(16).padStart(2, '0')).join('')}`;
}

const DIGITS: Record<string, string[]> = {
  '0': ['111', '101', '101', '101', '111'],
  '1': ['010', '110', '010', '010', '111'],
  '2': ['111', '001', '111', '100', '111'],
  '3': ['111', '001', '111', '001', '111'],
  '4': ['101', '101', '111', '001', '001'],
  '5': ['111', '100', '111', '001', '111'],
  '6': ['111', '100', '111', '101', '111'],
  '7': ['111', '001', '001', '010', '010'],
  '8': ['111', '101', '111', '101', '111'],
  '9': ['111', '101', '111', '001', '111'],
};

/** Escribe un número en un plano vertical que mira hacia atrás (cara z = zPlane). */
function paintNumber(v: Voxels, text: string, cx: number, yTop: number, zPlane: number, c: number) {
  const width = text.length * 4 - 1;
  let x0 = cx - Math.floor(width / 2);
  for (const ch of text) {
    const rows = DIGITS[ch];
    if (rows) {
      for (let r = 0; r < 5; r++) {
        for (let col = 0; col < 3; col++) {
          // Visto desde atrás, la derecha de la pantalla es +x.
          if (rows[r][col] === '1') v.set(x0 + col, yTop - r, zPlane, c);
        }
      }
    }
    x0 += 4;
  }
}

function wheelModel(pal: Palette, r: number, w: number, tire: number, hub: number, rim: number): Voxels {
  const cy = Math.ceil(r) + 1;
  const m = new Voxels(pal, Math.ceil(w / 2) + 2, Math.ceil(r) + 2, cy * 2 + 1);
  m.cylinder(0, cy, 0, r, w, 'x', tire);
  // Banda de rodadura: aros más oscuros en los bordes del neumático.
  m.cylinder(0, cy, 0, r + 0.2, 1.2, 'x', rim);
  m.cylinder(w / 2 + 0.3, cy, 0, r * 0.55, 1.4, 'x', hub);
  m.cylinder(-w / 2 - 0.3, cy, 0, r * 0.55, 1.4, 'x', hub);
  m.cylinder(w / 2 + 0.9, cy, 0, r * 0.2, 1, 'x', rim);
  m.cylinder(-w / 2 - 0.9, cy, 0, r * 0.2, 1, 'x', rim);
  return m;
}

/** Corrige el origen vertical de un modelo local: su origen (y=0) queda en el suelo del kart. */
function wheelBaseY(r: number) {
  return -(Math.ceil(r) + 1);
}

interface Parts {
  pal: Palette;
  main: number;
  mainDark: number;
  mainLight: number;
  stripe: number;
  metal: number;
  metal2: number;
  tire: number;
  rim: number;
  hub: number;
  seat: number;
  black: number;
  white: number;
  glass: number;
}

function makeParts(pilot: Pilot): Parts {
  const pal = new Palette();
  return {
    pal,
    main: pal.add(pilot.color),
    mainDark: pal.add(shade(pilot.color, -52)),
    mainLight: pal.add(shade(pilot.color, 46)),
    stripe: pal.add('#f4efe0'),
    metal: pal.add('#2a3237'),
    metal2: pal.add('#59656b'),
    tire: pal.add('#1a2023'),
    rim: pal.add('#2f383c'),
    hub: pal.add('#b9c3c7'),
    seat: pal.add('#1d2428'),
    black: pal.add('#14181b'),
    white: pal.add('#f4f2ea'),
    glass: pal.add('#a9dbe8'),
  };
}

/** Pone el color `to` en el voxel más alto de cada columna de la región que tenga el color `from`. */
function paintTop(v: Voxels, x0: number, x1: number, z0: number, z1: number, from: number, to: number) {
  for (let z = z0; z <= z1; z++) {
    for (let x = x0; x <= x1; x++) {
      for (let y = HEIGHT - 1; y >= 0; y--) {
        const c = v.get(x, y, z);
        if (!c) continue;
        if (c === from) v.set(x, y, z, to);
        break;
      }
    }
  }
}

interface Style {
  hull: [number, number, number];
  hullY: number;
  noseZ: number;
  rearWheel: [number, number, number];
  frontWheel: [number, number, number];
  rearX: number;
  frontX: number;
}

const STYLES: Record<PilotId, Style> = {
  pingui: { hull: [9.2, 4.6, 18], hullY: 7, noseZ: 15, rearWheel: [5.2, 7, -13], frontWheel: [4.2, 5.5, 13], rearX: 13.2, frontX: 12.2 },
  nu: { hull: [11, 4.6, 17], hullY: 7.4, noseZ: 14, rearWheel: [5.2, 7.5, -13], frontWheel: [4.2, 5.5, 13], rearX: 13, frontX: 12 },
  draco: { hull: [7.4, 3.6, 21], hullY: 6.4, noseZ: 18, rearWheel: [5, 7, -14], frontWheel: [4, 5.5, 14], rearX: 12.6, frontX: 11.6 },
  pio: { hull: [7.6, 3.7, 19], hullY: 6.4, noseZ: 16, rearWheel: [4.4, 6, -13], frontWheel: [3.8, 5, 13], rearX: 11.8, frontX: 10.8 },
};

function buildChassis(v: Voxels, p: Parts, pilot: Pilot, st: Style, pose: KartPose) {
  const { hull, hullY, noseZ } = st;
  // Fondo y ejes.
  v.box(-9, 2, -17, 9, 4, 16, p.metal);
  v.box(-st.rearX, 3, st.rearWheel[2] - 1, st.rearX, 4, st.rearWheel[2] + 1, p.metal);
  v.box(-st.frontX, 3, st.frontWheel[2] - 1, st.frontX, 4, st.frontWheel[2] + 1, p.metal);

  // Casco principal y morro.
  v.ellipsoid(0, hullY, -1, hull[0], hull[1], hull[2], p.main);
  v.ellipsoid(0, hullY - 1, noseZ - 2, hull[0] * 0.72, hull[1] * 0.78, 7.5, p.main);
  v.ellipsoid(0, hullY, -1, hull[0] * 0.5, hull[1] * 0.5, hull[2] + 1, p.mainLight);
  // Hueco del habitáculo.
  v.box(-6, hullY + 1, -13, 6, hullY + 8, 1, 0);
  // Laterales más oscuros.
  v.mirror((s) => v.ellipsoid(s * (hull[0] - 0.8), hullY - 1.4, -3, 2.6, 2.6, 9, p.mainDark));
  // Franja central clara.
  paintTop(v, -1, 1, -hull[2], hull[2], p.mainLight, p.stripe);
  // Paragolpes delantero y trasero.
  v.box(-hull[0] + 1, 3, noseZ + 4, hull[0] - 1, 5, noseZ + 5, p.metal2);
  v.box(-hull[0] + 2, 3, -hull[2] - 2, hull[0] - 2, 5, -hull[2] - 1, p.metal2);
  // Faros delanteros.
  const lamp = p.pal.add('#fff3c4', 1);
  v.mirror((s) => v.ellipsoid(s * 4.6, hullY + 0.4, noseZ + 5, 1.6, 1.4, 1.2, lamp));

  // Motor y escape.
  v.box(-6, 5, -20, 6, 11, -14, p.metal);
  v.box(-5, 11, -19, 5, 12, -14, p.mainDark);
  v.mirror((s) => {
    v.cylinder(s * 3.6, 8, -21.5, 1.9, 5, 'z', p.metal2);
    v.cylinder(s * 3.6, 8, -23.6, 1.1, 1.2, 'z', p.black);
  });
  // Placa trasera con el dorsal.
  v.box(-6, 6, -21, 6, 12, -20, p.mainDark);
  paintNumber(v, pilot.number, 0, 11, -22, p.white);

  // Asiento.
  v.box(-6, hullY, -11, 6, hullY + 3, -2, p.seat);
  v.box(-6, hullY + 3, -12, 6, hullY + 11, -10, p.seat);
  v.box(-6, hullY + 11, -12, 6, hullY + 11, -10, p.metal2);

  // Volante.
  const wheelC = { y: hullY + 8, z: 6 };
  for (let a = 0; a < 24; a++) {
    const t = (a / 24) * Math.PI * 2;
    v.set(Math.round(Math.cos(t) * 3.4), Math.round(wheelC.y + Math.sin(t) * 2.6), Math.round(wheelC.z + Math.sin(t) * 1.4), p.black);
  }
  v.tube(0, wheelC.y - 1, wheelC.z, 0, hullY + 2, 10, 0.9, 0.9, p.metal);

  // Ruedas.
  const rear = wheelModel(p.pal, st.rearWheel[0], st.rearWheel[1], p.tire, p.hub, p.rim);
  const front = wheelModel(p.pal, st.frontWheel[0], st.frontWheel[1], p.tire, p.hub, p.rim);
  v.mirror((s) => {
    v.paste(rear, s * st.rearX, Math.round(st.rearWheel[0]) + wheelBaseY(st.rearWheel[0]), st.rearWheel[2], 0);
    // Las ruedas delanteras giran con el volante; la derecha e izquierda comparten el mismo giro.
    v.paste(front, s * st.frontX, Math.round(st.frontWheel[0]) + wheelBaseY(st.frontWheel[0]), st.frontWheel[2], pose.steer * 0.42);
  });
}

/** Cuerpo del piloto: torso con chaqueta, arnés y brazos hacia el volante. */
function buildTorso(v: Voxels, p: Parts, suit: number, suitDark: number, hullY: number) {
  const baseY = hullY + 6;
  v.ellipsoid(0, baseY + 4.6, -6.2, 5.6, 5.6, 4.6, suit);
  v.ellipsoid(0, baseY + 8.8, -6.2, 6.4, 2.8, 4.2, suit);
  // Arnés cruzado y hebilla.
  v.mirror((s) => v.tube(s * 3.2, baseY + 9.6, -8.4, s * 1.2, baseY + 2, -8.8, 0.8, 0.8, p.black));
  v.box(-1, baseY + 5, -9, 1, baseY + 6, -9, p.metal2);
  // Brazos.
  v.mirror((s) => {
    v.tube(s * 6.2, baseY + 8.4, -6.4, s * 4.6, baseY + 5.4, -0.6, 2, 1.7, suit);
    v.tube(s * 4.6, baseY + 5.4, -0.6, s * 3.4, baseY + 5.2, 5.2, 1.7, 1.5, suit);
    v.ellipsoid(s * 3.3, baseY + 5.2, 6.4, 1.9, 1.9, 1.9, p.black);
    v.ellipsoid(s * 6.4, baseY + 9, -6.5, 2.4, 1.6, 2.4, suitDark);
  });
}

type HeadBuilder = (head: Voxels, p: Parts, pilot: Pilot) => void;

/** Cabeza local centrada en (0, cy, 0): +z es hacia delante. */
function headGrid(p: Parts): { v: Voxels; cy: number } {
  return { v: new Voxels(p.pal, 20, 16, 30), cy: 14 };
}

/** Casco con visera: cubre la parte superior y trasera, deja libre la cara. */
function helmet(head: Voxels, cy: number, color: number, trim: number, glass: number, black: number, size = 1) {
  const r = 7.4 * size;
  head.ellipsoidIf(0, cy + 1, -0.8, r, 6.6 * size, 7.6 * size, color, (_x, y, z) => y > cy - 0.8 && z < 3.6 + (y - cy) * 0.5);
  // Franja y ventilaciones.
  head.box(-1, Math.round(cy + 7.4 * size), -5, 1, Math.round(cy + 7.4 * size), 3, trim);
  head.mirror((s) => head.box(s * 3, Math.round(cy + 6.4 * size), -4, s * 4, Math.round(cy + 6.4 * size), -1, black));
  // Banda inferior del casco.
  head.ellipsoidIf(0, cy - 0.4, -1, r + 0.2, 1.4, 7.8 * size, trim, (_x, y, z) => z < 2.4 && Math.abs(y - (cy - 0.4)) < 1.2);
  // Visera levantada.
  head.ellipsoidIf(0, cy + 2.2, 3.2, 6.2 * size, 3.4 * size, 3 * size, glass, (_x, y, z) => z > 2.4 && y > cy + 1.6);
}

const HEADS: Record<PilotId, HeadBuilder> = {
  pingui(head, p, pilot) {
    const { cy } = { cy: 14 };
    const skin = p.pal.add('#1b1f26');
    const belly = p.pal.add('#f6f3ea');
    const beak = p.pal.add('#ffb41f');
    const beakDark = p.pal.add('#e07d10');
    const eye = p.pal.add('#0b0e12');
    const spark = p.pal.add('#ffffff', 1);
    head.ellipsoid(0, cy, 0, 6.2, 5.8, 6.2, skin);
    head.mirror((s) => {
      head.ellipsoid(s * 3.1, cy - 0.4, 3.6, 3.2, 3.6, 2.8, belly);
      head.ellipsoid(s * 6, cy - 1.6, 0.4, 1.6, 1.8, 2.4, belly);
      head.set(Math.round(s * 3.4), cy + 1, 6, eye);
      head.set(Math.round(s * 3.4), cy + 2, 6, eye);
      head.set(Math.round(s * 3.4), cy + 2, 7, spark);
    });
    head.ellipsoid(0, cy - 0.6, 7.4, 2.8, 1.5, 3.8, beak);
    head.ellipsoid(0, cy - 1.9, 6.8, 2.4, 0.9, 3, beakDark);
    helmet(head, cy, p.main, p.metal, p.glass, p.black);
    void pilot;
  },
  nu(head, p) {
    const { cy } = { cy: 14 };
    const skin = p.pal.add('#47525d');
    const snout = p.pal.add('#5b6874');
    const nose = p.pal.add('#16191d');
    const beard = p.pal.add('#14161a');
    const horn = p.pal.add('#2a2d33');
    const hornRing = p.pal.add('#4a4e57');
    const eye = p.pal.add('#ffb338', 1);
    const brow = p.pal.add('#1a1d21');
    head.ellipsoid(0, cy, 0.4, 5.6, 5.6, 6.4, skin);
    head.ellipsoid(0, cy - 1.6, 6.4, 3.6, 3.1, 4.4, snout);
    head.ellipsoid(0, cy - 1.2, 10, 2.6, 1.9, 1.5, nose);
    head.ellipsoid(0, cy - 5.2, 3.2, 2.4, 3, 2.6, beard);
    head.mirror((s) => {
      head.set(Math.round(s * 3.4), cy + 1.6, 5, eye);
      head.set(Math.round(s * 3.4), cy + 1.6, 6, eye);
      head.box(Math.round(s * 2.2), cy + 3, 5, Math.round(s * 4.6), cy + 3, 6, brow);
      // Orejas laterales.
      head.ellipsoid(s * 8.6, cy + 1.6, -1.4, 3.8, 0.9, 1.9, skin);
      // Cuernos: salen de los lados del casco, se abren y suben.
      head.curve(
        [
          [s * 6.2, cy + 3, -1.2],
          [s * 9.6, cy + 3.4, -1.8],
          [s * 12.6, cy + 5.4, -1.4],
          [s * 14.4, cy + 9.4, -0.4],
          [s * 14, cy + 13.4, 1],
        ],
        3.1,
        0.9,
        horn,
      );
      for (let i = 0; i < 3; i++) head.ellipsoid(s * (8.4 + i * 1.9), cy + 3.5 + i * 0.9, -1.8, 2.7 - i * 0.35, 2.7 - i * 0.35, 2.7 - i * 0.35, hornRing);
    });
    // Melena negra por la nuca, visible desde atrás.
    head.ellipsoid(0, cy - 2.6, -5.6, 2.8, 5.6, 2.4, beard);
    helmet(head, cy, p.main, p.metal, p.glass, p.black);
  },
  draco(head, p) {
    const { cy } = { cy: 14 };
    const skin = p.pal.add('#2fb38a');
    const skinDark = p.pal.add('#1f8a69');
    const jaw = p.pal.add('#eadfb8');
    const horn = p.pal.add('#efe3be');
    const eye = p.pal.add('#f5d142', 1);
    const slit = p.pal.add('#111413');
    head.ellipsoid(0, cy, 0, 5.8, 5.4, 6, skin);
    head.ellipsoid(0, cy - 1.6, 6.8, 3.7, 2.8, 5.4, skin);
    head.ellipsoid(0, cy - 3.6, 6.6, 3.1, 1.3, 4.6, jaw);
    head.ellipsoid(0, cy - 1.6, 11.4, 1.6, 1.2, 0.8, skinDark);
    head.mirror((s) => {
      head.ellipsoid(s * 3.4, cy + 2, 3.8, 1.9, 1.6, 1.5, skinDark);
      head.set(Math.round(s * 3.7), cy + 1.6, 5, eye);
      head.set(Math.round(s * 3.7), cy + 2.6, 5, eye);
      head.set(Math.round(s * 3.7), cy + 2.1, 6, slit);
      // Cuernos crema hacia atrás.
      head.tube(s * 3.2, cy + 5, -2, s * 5, cy + 8, -7.4, 1.7, 0.4, horn);
      // Espinas laterales de la mandíbula.
      head.tube(s * 5.6, cy - 1, 1.4, s * 8, cy - 2.4, 0, 1.2, 0.3, horn);
    });
    // Cresta de espinas por la nuca.
    for (let i = 0; i < 4; i++) {
      const z = -3.4 - i * 3;
      head.tube(0, cy + 5.6 - i * 1.1, z, 0, cy + 8.6 - i * 1.4, z - 1.2, 1.4 - i * 0.18, 0.3, i % 2 ? skinDark : horn);
    }
    helmet(head, cy, p.pal.add('#1fbfae'), p.metal, p.glass, p.black, 1.0);
  },
  pio(head, p) {
    const { cy } = { cy: 14 };
    const skin = p.pal.add('#a89fc4');
    const crest = p.pal.add('#8d82ae');
    const beak = p.pal.add('#efe4d2');
    const eye = p.pal.add('#ffb338', 1);
    const neck = p.pal.add('#7b4fd3');
    const neck2 = p.pal.add('#47c3c7');
    head.ellipsoid(0, cy, 0, 5.4, 5.6, 5.8, skin);
    head.ellipsoid(0, cy - 0.8, 6.4, 1.8, 1.5, 2.8, beak);
    head.mirror((s) => {
      head.set(Math.round(s * 3.4), cy + 1.4, 4.6, eye);
      head.set(Math.round(s * 3.4), cy + 2.4, 4.6, eye);
    });
    // Cuello iridiscente.
    for (let z = -6; z <= 5; z++) {
      for (let y = cy - 8; y <= cy - 3; y++) {
        for (let x = -6; x <= 6; x++) {
          const dx = x / 5.6;
          const dy = (y - (cy - 5.6)) / 2.8;
          const dz = (z + 0.6) / 5.4;
          if (dx * dx + dy * dy + dz * dz <= 1) head.set(x, y, z, hash2(x * 3, y * 7 + z) > 0.62 ? neck2 : neck);
        }
      }
    }
    // Cresta de plumas hacia atrás.
    head.curve(
      [
        [0, cy + 5, 0],
        [0, cy + 8, -3],
        [0, cy + 9, -7],
      ],
      1.6,
      0.4,
      crest,
    );
    head.mirror((s) => head.tube(s * 1.8, cy + 5.2, -1, s * 2.4, cy + 7.6, -6, 1.2, 0.3, crest));
    helmet(head, cy, p.main, p.metal, p.glass, p.black);
  },
};

/** Accesorios del kart propios de cada piloto (cola, alerón, defensa...). */
function buildExtras(v: Voxels, p: Parts, pilot: Pilot, st: Style) {
  const hullY = st.hullY;
  switch (pilot.id) {
    case 'pingui': {
      const tail = p.pal.add('#14181b');
      v.ellipsoid(0, hullY + 4, -13.4, 2.6, 1.4, 3.6, tail);
      // Franjas blancas laterales.
      v.mirror((s) => v.box(s * 9, hullY + 1, -10, s * 9, hullY + 2, 8, p.stripe));
      // Alerón redondeado.
      v.box(-9, hullY + 9, -21, 9, hullY + 10, -18, p.mainDark);
      v.mirror((s) => v.box(s * 8, hullY + 5, -20, s * 8, hullY + 9, -19, p.metal));
      break;
    }
    case 'nu': {
      const bar = p.pal.add('#101215');
      // Defensa de toro delantera.
      v.mirror((s) => {
        v.tube(s * 8, 4, st.noseZ + 5, s * 8, 10, st.noseZ + 7, 1.1, 1.1, bar);
      });
      v.tube(-8, 10, st.noseZ + 7, 8, 10, st.noseZ + 7, 1.1, 1.1, bar);
      v.tube(-8, 6.5, st.noseZ + 6, 8, 6.5, st.noseZ + 6, 1, 1, bar);
      // Tubos de escape verticales.
      v.mirror((s) => v.cylinder(s * 9, hullY + 7, -16, 1.5, 9, 'y', p.metal2));
      v.mirror((s) => v.cylinder(s * 9, hullY + 12, -16, 1.1, 1.2, 'y', p.black));
      break;
    }
    case 'draco': {
      const fin = p.pal.add('#14b8a6');
      const cream = p.pal.add('#eadfb8');
      const skin = p.pal.add('#2fb38a');
      // Aleta trasera alta.
      v.box(-1, hullY + 4, -22, 1, hullY + 13, -17, fin);
      v.box(-1, hullY + 13, -22, 1, hullY + 14, -19, p.mainLight);
      // Aletas laterales.
      v.mirror((s) => {
        for (let i = 0; i < 4; i++) v.box(s * (8.5 + i * 0.6), hullY + 1 + i, -8 - i * 2, s * (9.5 + i * 0.6), hullY + 2 + i, -4 - i * 2, fin);
      });
      // Cola de dragón con espinas.
      v.curve(
        [
          [0, hullY + 3, -12],
          [0, hullY + 2, -20],
          [0, hullY + 1.5, -27],
          [0, hullY + 3.5, -31],
        ],
        3.2,
        1,
        skin,
      );
      for (let i = 0; i < 4; i++) v.tube(0, hullY + 4.6 - i * 0.4, -14 - i * 5, 0, hullY + 7.4 - i * 0.8, -15 - i * 5, 1.1, 0.25, i % 2 ? cream : fin);
      break;
    }
    case 'pio': {
      const lav = p.pal.add('#cdbcf0');
      const purple = p.pal.add('#8b52d8');
      const deep = p.pal.add('#57227e');
      const tip = p.pal.add('#f2eaff');
      // Alerón de plumas: abanico detrás del asiento.
      for (let i = 0; i < 7; i++) {
        const a = -0.9 + (i / 6) * 1.8;
        const x1 = Math.sin(a) * 15;
        const y1 = hullY + 12 + Math.cos(a) * 3;
        const col = i % 3 === 0 ? deep : i % 3 === 1 ? purple : lav;
        v.tube(Math.sin(a) * 3, hullY + 6, -13, x1, y1, -22, 1.6, 0.6, col);
        v.ellipsoid(x1, y1, -22.4, 1, 1, 1.2, tip);
      }
      // Alas plegadas a los lados del asiento.
      v.mirror((s) => {
        v.ellipsoid(s * 8.6, hullY + 10, -8, 1.9, 6.2, 7.4, purple);
        v.ellipsoid(s * 9, hullY + 7, -12, 1.5, 3, 4.4, lav);
      });
      // Plumas de la cola.
      for (let i = -1; i <= 1; i++) v.tube(i * 2.4, hullY + 4.4, -13, i * 3, hullY + 2.4, -25, 1.5, 0.6, i === 0 ? tip : lav);
      break;
    }
  }
}

/** Chaqueta y sombra de la chaqueta por piloto: contrastan con el chasis. */
const SUITS: Record<PilotId, [string, string]> = {
  pingui: ['#1d232b', '#0d1014'],
  nu: ['#3b2c26', '#1f1714'],
  draco: ['#0f4a52', '#072a30'],
  pio: ['#d6c6f6', '#9f86d8'],
};

const HEAD_SCALE = 1.22;

/** Genera el modelo voxel completo de un piloto en su kart. */
export function buildKartModel(pilot: Pilot, pose: KartPose = NEUTRAL_POSE): Voxels {
  const p = makeParts(pilot);
  const st = STYLES[pilot.id];
  const v = new Voxels(p.pal, HALF_X, HALF_Z, HEIGHT);
  buildChassis(v, p, pilot, st, pose);
  const outfit = SUITS[pilot.id];
  const suit = p.pal.add(outfit[0]);
  const suitDark = p.pal.add(outfit[1]);
  buildTorso(v, p, suit, suitDark, st.hullY);
  const { v: head, cy } = headGrid(p);
  HEADS[pilot.id](head, p, pilot);
  // Cabeza grande (proporción de mascota) asentada sobre los hombros; gira con el volante.
  v.paste(head, 0, Math.round(st.hullY + 16.5 - cy * HEAD_SCALE), -4, -pose.steer * 0.32, HEAD_SCALE);
  buildExtras(v, p, pilot, st);
  return v;
}
