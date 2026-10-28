import type { Achievement, Difficulty, ItemId, ItemInfo, Pilot, PilotId } from './types';
import pinguiPortrait from '../assets/pilots/pingui.jpg';
import nuPortrait from '../assets/pilots/nu.jpg';
import dracoPortrait from '../assets/pilots/draco.jpg';
import pioPortrait from '../assets/pilots/pio.jpg';

export const PILOTS: Pilot[] = [
  {
    id: 'pingui',
    name: 'Pingüi',
    animal: 'Pingüino',
    number: '01',
    color: '#f5c518',
    dark: '#8b6a00',
    soft: '#fff0a8',
    portrait: pinguiPortrait,
    tagline: 'Frío por fuera. Fuego por dentro.',
    role: 'El equilibrado',
    ability: 'Sangre fría',
    abilityDetail: 'Las latas de nitro rinden un 20 % más.',
    stats: { velocidad: 7, aceleracion: 8, agarre: 8, derrape: 7 },
    spec: { topSpeed: 1, accel: 1.03, turn: 0.99, driftCharge: 1, nitroGain: 1.2, boostBonus: 1 },
  },
  {
    id: 'nu',
    name: 'Ñu',
    animal: 'Ñu',
    number: '16',
    color: '#ff7a1a',
    dark: '#8a3800',
    soft: '#ffd0ad',
    portrait: nuPortrait,
    tagline: 'Si hay hueco, se ocupa.',
    role: 'El demoledor',
    ability: 'Estampida',
    abilityDetail: 'Velocidad punta un 5 % superior.',
    stats: { velocidad: 9, aceleracion: 6, agarre: 6, derrape: 6 },
    spec: { topSpeed: 1.05, accel: 0.94, turn: 0.94, driftCharge: 0.96, nitroGain: 1, boostBonus: 1 },
  },
  {
    id: 'draco',
    name: 'Draco',
    animal: 'Dragón',
    number: '07',
    color: '#2fb38a',
    dark: '#0e6048',
    soft: '#b9f5e1',
    portrait: dracoPortrait,
    tagline: 'La trazada perfecta escupe chispas.',
    role: 'El derrapador',
    ability: 'Escamas de dragón',
    abilityDetail: 'El derrape carga un 20 % más rápido.',
    stats: { velocidad: 6, aceleracion: 8, agarre: 9, derrape: 10 },
    spec: { topSpeed: 0.96, accel: 1.05, turn: 1, driftCharge: 1.2, nitroGain: 0.95, boostBonus: 1.05 },
  },
  {
    id: 'pio',
    name: 'Pío',
    animal: 'Paloma',
    number: '23',
    color: '#a35bd6',
    dark: '#57227e',
    soft: '#e6cff7',
    portrait: pioPortrait,
    tagline: 'Ligera en el aire, implacable en el asfalto.',
    role: 'La precisa',
    ability: 'Plumaje de seda',
    abilityDetail: 'Los mini-turbos duran un 25 % más.',
    stats: { velocidad: 7, aceleracion: 8, agarre: 8, derrape: 9 },
    spec: { topSpeed: 0.98, accel: 1, turn: 1.06, driftCharge: 1, nitroGain: 1, boostBonus: 1.25 },
  },
];

export const PILOT_BY_ID = Object.fromEntries(PILOTS.map((p) => [p.id, p])) as Record<PilotId, Pilot>;

export const DIFFICULTIES: Array<{
  id: Difficulty;
  label: string;
  description: string;
  aiBase: number;
  rubber: number;
  /** Fracción de la velocidad segura en curva que la IA se atreve a usar. */
  cornering: number;
}> = [
  { id: 'paseo', label: 'Paseo', description: 'Rivales relajados. Ideal para descubrir la isla.', aiBase: 118, rubber: 0.68, cornering: 0.86 },
  { id: 'piloto', label: 'Piloto', description: 'Duelo equilibrado. La experiencia recomendada.', aiBase: 134, rubber: 1, cornering: 0.95 },
  { id: 'leyenda', label: 'Leyenda', description: 'Ritmo de podio. Cada error se paga caro.', aiBase: 144, rubber: 1.25, cornering: 1.02 },
];

export const DIFFICULTY_BY_ID = Object.fromEntries(DIFFICULTIES.map((d) => [d.id, d])) as Record<
  Difficulty,
  (typeof DIFFICULTIES)[number]
>;

export const ITEMS: Record<ItemId, ItemInfo> = {
  turbo: {
    id: 'turbo',
    name: 'Turbo fuego',
    short: 'TURBO',
    description: '1,7 s de empuje extra. Quema la recta.',
    tone: '#ff8a2a',
  },
  banana: {
    id: 'banana',
    name: 'Banana trampa',
    short: 'BANANA',
    description: 'Se deja atrás. Quien la pise, gira.',
    tone: '#f5d53d',
  },
  bowling: {
    id: 'bowling',
    name: 'Bola de bolos',
    short: 'BOLA',
    description: 'Rueda en línea recta y desestabiliza.',
    tone: '#7a8cff',
  },
};

export const BOX_WEIGHTS: Record<'front' | 'mid' | 'back', ItemId[]> = {
  front: ['banana', 'banana', 'turbo', 'bowling'],
  mid: ['turbo', 'banana', 'bowling', 'turbo', 'bowling'],
  back: ['turbo', 'turbo', 'bowling', 'turbo', 'banana'],
};

export const ACHIEVEMENTS: Achievement[] = [
  {
    id: 'first-drift',
    name: 'Primera chispa',
    description: 'Carga y suelta un mini-turbo derrapando.',
    icon: 'spark',
    target: 1,
  },
  {
    id: 'nitro-user',
    name: 'Nitrómano',
    description: 'Vacía una lata de nitro con la tecla N.',
    icon: 'nitro',
    target: 1,
  },
  {
    id: 'box-hunter',
    name: 'Cazador de cajas',
    description: 'Recoge 5 cajas sorpresa en una sola carrera.',
    icon: 'box',
    target: 5,
  },
  {
    id: 'lap-machine',
    name: 'Vuelta de relojero',
    description: 'Completa una vuelta en menos de 38 segundos.',
    icon: 'clock',
    target: 1,
  },
  {
    id: 'sweeper',
    name: 'Barrido perfecto',
    description: 'Adelanta a los tres rivales en una carrera.',
    icon: 'overtake',
    target: 3,
  },
  {
    id: 'champion',
    name: 'Rey de la isla',
    description: 'Gana una carrera de 3 vueltas.',
    icon: 'trophy',
    target: 1,
  },
];

export const ACHIEVEMENT_BY_ID = Object.fromEntries(ACHIEVEMENTS.map((a) => [a.id, a])) as Record<
  string,
  Achievement
>;

export const CONTROLS = [
  { action: 'Acelerar', keyboard: '↑ / W', gamepad: 'Gatillo derecho', touch: 'Automático' },
  { action: 'Frenar', keyboard: '↓ / S', gamepad: 'Gatillo izquierdo', touch: 'FRE' },
  { action: 'Girar', keyboard: '← → / A D', gamepad: 'Stick izquierdo', touch: '◄ ►' },
  { action: 'Derrapar', keyboard: 'Shift', gamepad: 'Botón A', touch: 'DER' },
  { action: 'Usar objeto', keyboard: 'Espacio', gamepad: 'Botón B', touch: 'OBJ' },
  { action: 'Nitro', keyboard: 'N / X', gamepad: 'Botón X', touch: 'NIT' },
];

export const TRACK_FACTS = [
  { label: 'Longitud', value: '1,86 km' },
  { label: 'Curvas', value: '12' },
  { label: 'Anchura', value: '10,4 m' },
  { label: 'Récord de la isla', value: '00:33.8' },
];

export const TRACK_SECTORS = [
  { id: '01', name: 'Muelle de salida', note: 'Recta corta y primera frenada.' },
  { id: '02', name: 'Curva del Faro', note: 'Un derrape largo a derechas.' },
  { id: '03', name: 'Chicane de arena', note: 'Dos giros ciegos entre palmeras.' },
  { id: '04', name: 'Mirador', note: 'La recta más rápida de la isla.' },
];
