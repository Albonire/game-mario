import { DETAIL_COUNT, Detail } from './materials';
import { hash2, n2t, n2tp } from './noise';

const N = 256;

/** Cuánto modula cada clase el color (fracción). El agua se resuelve aparte. */
export const DETAIL_STRENGTH = Float32Array.from([
  0.2, // ASPHALT
  0.16, // CONCRETE
  0.22, // GRASS
  0.13, // SAND
  0.2, // ROCK
  0.09, // SNOW
  0.11, // ICE
  0, // WATER
  0, // FOAM
  0.16, // WOOD
]);

const TAU = Math.PI * 2;

function smooth(a: number, b: number, v: number) {
  const t = Math.min(1, Math.max(0, (v - a) / (b - a)));
  return t * t * (3 - 2 * t);
}

/**
 * Texturas de detalle de 256 x 256 en mosaico, una por clase de material.
 * Cada una cubre 64 unidades del mundo (4 texeles por unidad), así que sirven para
 * dar grano de cerca; el render las desvanece con la distancia.
 */
let cached: Uint8Array | null = null;

/** Las texturas se generan una sola vez, la primera vez que se necesitan (~100 ms). */
export function getDetailTextures(): Uint8Array {
  if (!cached) cached = buildDetailTextures();
  return cached;
}

function buildDetailTextures(): Uint8Array {
  const out = new Uint8Array(DETAIL_COUNT * N * N);
  const put = (cls: number, x: number, y: number, v: number) => {
    out[(cls << 16) | (y << 8) | x] = Math.max(0, Math.min(255, Math.round(128 + (v - 0.5) * 255)));
  };
  const grain = (x: number, y: number, a: number, b: number, c: number) =>
    0.5 * n2t((x / N) * a, (y / N) * a, a) + 0.3 * n2t((x / N) * b + 3.3, (y / N) * b, b) + 0.2 * n2t((x / N) * c, (y / N) * c + 7.1, c);

  for (let y = 0; y < N; y++) {
    for (let x = 0; x < N; x++) {
      const h = hash2(x * 13 + 5, y * 7 + 1);

      // Asfalto: grano fino con algún bache.
      let v = grain(x, y, 64, 32, 16);
      if (h < 0.035) v *= 0.45;
      else if (h > 0.985) v = Math.min(1, v + 0.3);
      put(Detail.ASPHALT, x, y, v);

      // Hormigón: grano más grueso.
      v = grain(x, y, 32, 16, 8);
      if (h < 0.02) v *= 0.55;
      put(Detail.CONCRETE, x, y, v);

      // Hierba: briznas alargadas.
      v = 0.55 * n2tp((x / N) * 96, (y / N) * 24, 96, 24) + 0.3 * n2tp((x / N) * 48, (y / N) * 12, 48, 12) + 0.15 * h;
      put(Detail.GRASS, x, y, v);

      // Arena: rizos suaves y grano.
      const ripple = 0.5 + 0.5 * Math.sin(TAU * ((3 * x) / N + (2 * y) / N + 0.7 * n2t((x / N) * 8, (y / N) * 8, 8)));
      put(Detail.SAND, x, y, 0.55 * ripple + 0.3 * grain(x, y, 64, 32, 16) + 0.15 * h);

      // Roca y tierra: vetas y grietas.
      const ridge = 1 - Math.abs(2 * n2t((x / N) * 12, (y / N) * 12, 12) - 1);
      v = 0.45 * ridge + 0.55 * grain(x, y, 48, 24, 12);
      if (ridge > 0.965) v *= 0.4;
      put(Detail.ROCK, x, y, v);

      // Nieve: muy suave con destellos sueltos.
      v = 0.42 + 0.3 * n2t((x / N) * 24, (y / N) * 24, 24) + 0.15 * n2t((x / N) * 64, (y / N) * 64, 64);
      if (hash2(x * 3 + 9, y * 11 + 2) > 0.995) v = 1;
      put(Detail.SNOW, x, y, v);

      // Hielo: vetas largas y grietas claras.
      const streak = n2tp((x / N) * 4, (y / N) * 20, 4, 20);
      const crack = 1 - Math.abs(2 * n2t((x / N) * 10 + 4, (y / N) * 10, 10) - 1);
      v = 0.4 + 0.35 * streak + 0.2 * grain(x, y, 32, 16, 8);
      if (crack > 0.975) v = 1;
      put(Detail.ICE, x, y, v);

      // Agua: líneas de brillo finas donde se cruzan las crestas.
      const r1 = 1 - Math.abs(2 * n2t((x / N) * 14, (y / N) * 14, 14) - 1);
      const r2 = 1 - Math.abs(2 * n2t((x / N) * 9 + 5, (y / N) * 9, 9) - 1);
      v = 0.3 + 0.7 * Math.pow(Math.max(r1, r2 * 0.92), 6) + 0.15 * n2t((x / N) * 32, (y / N) * 32, 32) - 0.1;
      put(Detail.WATER, x, y, v);

      // Espuma: manchas encajadas.
      const f = 0.5 * n2t((x / N) * 24, (y / N) * 24, 24) + 0.3 * n2t((x / N) * 48, (y / N) * 48, 48) + 0.2 * n2t((x / N) * 96, (y / N) * 96, 96);
      put(Detail.FOAM, x, y, smooth(0.42, 0.62, f));

      // Madera: tablas con juntas.
      v = 0.35 + 0.4 * n2tp((x / N) * 3, (y / N) * 64, 3, 64) + 0.25 * h;
      if (y % 32 < 2) v = 0.05;
      put(Detail.WOOD, x, y, v);
    }
  }
  return out;
}
