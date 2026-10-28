import { NEON_THEME } from '../themes';
import { Mat } from '../terrain/materials';
import type { TrackDef } from './types';

/** Neón Nocturno: circuito urbano de ángulos rectos entre torres, con el canal del puerto fuera de la acera. */
export const NEON: TrackDef = {
  id: 'neon',
  name: 'Neón Nocturno',
  tagline: 'Esquinas de noventa grados, farolas y charcos entre torres.',
  laps: 3,
  layout: {
    kind: 'rounded',
    points: [
      { x: 1560, y: 1700, r: 90 },
      { x: 1560, y: 1420, r: 60 },
      { x: 1800, y: 1420, r: 60 },
      { x: 1800, y: 720, r: 90 },
      { x: 1440, y: 720, r: 60 },
      { x: 1280, y: 880, r: 60 },
      { x: 1280, y: 1060, r: 60 },
      { x: 1000, y: 1060, r: 60 },
      { x: 1000, y: 430, r: 80 },
      { x: 700, y: 430, r: 50 },
      { x: 700, y: 560, r: 50 },
      { x: 380, y: 560, r: 90 },
      { x: 380, y: 1700, r: 90 },
    ],
  },
  startAt: 'auto',
  terrain: { kind: 'ribbon', radius: 190, wobble: 0.12, seed: 4 },
  patches: [
    { from: 0.1, to: 0.12, mat: Mat.WET, lat: [-26, 4] },
    { from: 0.35, to: 0.37, mat: Mat.WET, lat: [-4, 26] },
    { from: 0.63, to: 0.66, mat: Mat.WET, lat: [-26, 12] },
  ],
  blobs: [
    { x: 880, y: 1380, r: 120, mat: Mat.WET, seed: 4 },
    { x: 1580, y: 1090, r: 70, mat: Mat.WET, seed: 6 },
  ],
  boostPads: [0.22, 0.5, 0.84],
  scenery: [
    {
      types: [['tires', 1]],
      every: 14,
      offsetMin: 44,
      offsetMax: 50,
      chance: 0.92,
      minMargin: 8,
      scale: [1, 1],
      corners: { maxRadius: 230 },
    },
    {
      types: [['lamp', 1]],
      every: 60,
      offsetMin: 43,
      offsetMax: 48,
      chance: 1,
      minMargin: 12,
      scale: [1, 1],
    },
    {
      types: [
        ['tower_a', 3],
        ['tower_b', 3],
        ['tower_c', 2],
        ['container', 1],
      ],
      every: 84,
      offsetMin: 96,
      offsetMax: 168,
      chance: 1,
      minMargin: 20,
      scale: [0.85, 1.25],
    },
    {
      types: [
        ['neon_sign', 1],
        ['cone', 1],
      ],
      every: 150,
      offsetMin: 54,
      offsetMax: 76,
      chance: 0.9,
      minMargin: 20,
      scale: [0.9, 1.15],
      cluster: { chance: 0.4, count: [1, 3], spread: 14, types: ['cone'], scale: [0.9, 1.1] },
    },
  ],
  startside: [
    { type: 'grandstand', along: 120, lateral: 58, scale: 0.9 },
    { type: 'grandstand', along: 120, lateral: -58, scale: 0.9 },
  ],
  landmarks: [
    { type: 'tower_c', x: 880, y: 1380, scale: 1.8 },
    { type: 'tower_a', x: 1120, y: 1500, scale: 1.4 },
    { type: 'tower_b', x: 640, y: 1260, scale: 1.5 },
  ],
  theme: NEON_THEME,
};
