import { grid, prop, type PropDef } from '../propKit';

/** Elementos de circuito comunes a todas las pistas: barrera de neumáticos y gradas de salida. */

const tires = prop(
  0.2,
  2,
  (variant, _rand, pal) => {
    const v = grid(pal, 42, 14, 44);
    v.normalRadius = 2;
    const red = pal.add('#d8392f');
    const white = pal.add('#f1eee4');
    const hole = pal.add('#14161c');
    const tire = (cx: number, cy: number, color: number) => {
      v.ellipsoid(cx, cy, 0, 12, 6.4, 12, color);
      v.ellipsoid(cx, cy + 4.6, 0, 6, 2.4, 6, hole);
    };
    const a = variant === 0 ? red : white;
    const b = variant === 0 ? white : red;
    for (const x of [-24, 0, 24]) tire(x, 6.4, x === 0 ? b : a);
    for (const x of [-12, 12]) tire(x, 17.6, x < 0 ? b : a);
    tire(0, 28.8, a);
    return v;
  },
  3,
);

const stand = prop(
  0.5,
  2,
  (variant, rand, pal) => {
    const v = grid(pal, 44, 16, 64);
    v.normalRadius = 2;
    const metal = pal.add('#6b7480');
    const dark = pal.add('#2b303a');
    const step = pal.add(variant ? '#9aa3ad' : '#b7ac96');
    const roof = pal.add(variant ? '#d8392f' : '#2f6fb0');
    const trim = pal.add('#f1eee4');
    const crowd = ['#e8c14a', '#d8392f', '#3f8fe0', '#f1eee4', '#63b46a', '#e88aa8', '#2b303a', '#f08a2c'].map((c) => pal.add(c));
    const skin = [pal.add('#e8b890'), pal.add('#b57a52'), pal.add('#7a4e32')];

    // Pared de fondo: el público no se ve a través de la estructura.
    v.box(-40, 0, 14, 40, 42, 15, dark);
    // Gradas: tres escalones que suben hacia atrás, con público de distinta altura.
    for (let k = 0; k < 3; k++) {
      const z0 = -10 + k * 8;
      v.box(-38, 0, z0, 38, 6 + k * 7, z0 + 7, step);
      const top = 7 + k * 7;
      for (let x = -35; x <= 35; x += 4) {
        if (rand() < 0.14) continue;
        const px = x + Math.round((rand() - 0.5) * 2);
        const tall = rand() < 0.3 ? 1 : 0;
        const shirt = crowd[Math.floor(rand() * crowd.length)];
        v.ellipsoid(px, top + 2.4 + tall, z0 + 3, 1.9, 2.6 + tall, 1.6, shirt);
        v.ellipsoid(px, top + 5.6 + tall * 2, z0 + 3, 1.5, 1.6, 1.5, skin[Math.floor(rand() * skin.length)]);
        if (rand() < 0.16) v.tube(px + 2, top + 4, z0 + 3, px + 3, top + 9, z0 + 3, 0.6, 0.6, skin[0]);
      }
    }
    // Cubierta sobre dos postes con franja.
    for (const x of [-40, 40]) v.box(x - 1, 0, 8, x + 1, 44, 10, metal);
    v.box(-44, 44, -2, 44, 46, 16, roof);
    v.box(-44, 44, -3, 44, 46, -3, trim);
    // Valla frontal con franjas.
    v.box(-38, 0, -12, 38, 5, -11, dark);
    for (let x = -38; x < 38; x += 8) v.box(x, 1, -13, x + 3, 4, -13, x % 16 === 0 ? trim : roof);
    return v;
  },
  5,
  { minLod: 1 },
);

export const TRACKSIDE_PROPS: Record<string, PropDef> = {
  tires,
  grandstand: stand,
};
