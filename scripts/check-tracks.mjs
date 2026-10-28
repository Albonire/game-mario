/**
 * Valida la geometría de todas las pistas registradas y las proporciones del mundo.
 * Uso: npm run check:tracks   (sale con código 1 si algo falla)
 */
import { build } from 'esbuild';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const bundle = await build({
  stdin: {
    contents:
      "export * from './src/game/track'; export * from './src/game/tracks'; export * from './src/game/config';",
    resolveDir: root,
    loader: 'ts',
  },
  bundle: true,
  format: 'esm',
  platform: 'node',
  write: false,
  logLevel: 'error',
});
const mod = await import(`data:text/javascript;base64,${Buffer.from(bundle.outputFiles[0].text).toString('base64')}`);
const { TRACK_DEFS, getTrack, localRadii, WORLD, KART, MAP_SIZE, TRACK_STEP } = mod;

let failures = 0;
const fail = (id, msg) => {
  failures++;
  console.log(`  FALLA  ${id}: ${msg}`);
};

console.log('Proporciones del mundo');
const ratio = KART.WIDTH / (WORLD.ROAD_HALF * 2);
console.log(`  kart / calzada = ${ratio.toFixed(3)} (objetivo 0,125 a 0,145)`);
if (ratio < 0.125 || ratio > 0.145) fail('mundo', `razón kart/calzada ${ratio.toFixed(3)} fuera de rango`);

console.log('\nPistas');
console.log('  id        largo   R min  curvas  recta  separación  margen  salida recta');
for (const def of TRACK_DEFS) {
  const track = getTrack(def.id);
  const pts = track.points;
  const n = pts.length;
  const stats = track.stats;

  // Cierre del bucle.
  const gap = Math.hypot(pts[0].x - pts[n - 1].x, pts[0].y - pts[n - 1].y);
  if (gap > TRACK_STEP * 2) fail(def.id, `el bucle no cierra (hueco de ${gap.toFixed(1)} u)`);

  if (stats.length < 4300 || stats.length > 6300) fail(def.id, `largo ${Math.round(stats.length)} u fuera de 4 300 a 6 300`);
  if (stats.minRadius < 45) fail(def.id, `radio mínimo ${stats.minRadius.toFixed(1)} u (< 45)`);
  if (stats.corners < 3) fail(def.id, `solo ${stats.corners} curvas`);

  // Separación entre tramos no vecinos.
  const skip = Math.round(320 / TRACK_STEP);
  let minGap = Infinity;
  for (let a = 0; a < n; a += 2) {
    for (let b = a + skip; b < n; b += 2) {
      if (Math.min(b - a, n - (b - a)) < skip) continue;
      const d = Math.hypot(pts[a].x - pts[b].x, pts[a].y - pts[b].y);
      if (d < minGap) minGap = d;
    }
  }
  if (minGap < 200) fail(def.id, `dos tramos quedan a ${Math.round(minGap)} u (< 200)`);

  // Margen respecto al borde del mapa.
  let margin = Infinity;
  for (const p of pts) margin = Math.min(margin, p.x, p.y, MAP_SIZE - p.x, MAP_SIZE - p.y);
  if (margin < 180) fail(def.id, `el trazado se acerca a ${Math.round(margin)} u del borde del mapa`);

  // La parrilla (hasta ~130 u por delante de la salida) no puede tener curvas cerradas.
  const radii = localRadii(pts);
  const ahead = Math.round(130 / TRACK_STEP);
  const behind = Math.round(40 / TRACK_STEP);
  let startRadius = Infinity;
  for (let k = -behind; k <= ahead; k++) startRadius = Math.min(startRadius, radii[(k + n) % n]);
  if (startRadius < 150) fail(def.id, `la parrilla tiene una curva cerrada (radio mínimo ${Math.round(startRadius)} u, mínimo 150)`);

  // Cajas, latas y bananas sobre la calzada.
  const onRoad = (list, what) => {
    for (const q of list) {
      let best = Infinity;
      for (const p of pts) best = Math.min(best, Math.hypot(q.x - p.x, q.y - p.y));
      if (best > WORLD.ROAD_HALF - 5) fail(def.id, `${what} a ${best.toFixed(1)} u del eje (fuera de la calzada)`);
    }
  };
  onRoad(track.itemBoxes, 'caja');
  onRoad(track.nitroCans, 'lata');
  onRoad(track.bananas, 'banana');
  for (const pad of track.boostPads) {
    if (pad.progress < 0.08 || pad.progress > 0.95) fail(def.id, `turbo en ${pad.progress}: demasiado cerca de la salida`);
  }

  console.log(
    `  ${def.id.padEnd(8)} ${String(Math.round(stats.length)).padStart(6)} ${stats.minRadius.toFixed(0).padStart(6)} ${String(stats.corners).padStart(7)} ${String(Math.round(stats.longestStraight)).padStart(6)} ${String(Math.round(minGap)).padStart(11)} ${String(Math.round(margin)).padStart(7)} ${String(Math.round(startRadius)).padStart(12)}`,
  );
}

console.log(failures ? `\n${failures} comprobación(es) fallida(s).` : '\nTodo en orden.');
process.exit(failures ? 1 : 0);
