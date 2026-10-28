/**
 * Medidas del mundo en un solo sitio.
 *
 * Referencia de escala: 5 unidades = 1 metro. La calzada mide 52 u (10,4 m) y un kart
 * real mide unos 1,4 m, así que el kart ocupa 7 u (razón 0,135 frente a la calzada).
 * Los escenarios se dimensionan con la misma regla para que nada parezca de juguete.
 */
export const UNITS_PER_METER = 5;

export const KART = {
  /** Ancho visible del kart en unidades del mundo. */
  WIDTH: 7,
  /** Distancia mínima entre dos karts antes de empujarse. */
  COLLIDE: 7.5,
} as const;

export const PICKUP = {
  /** Radio de recogida de cajas sorpresa. */
  BOX_PLAYER: 9,
  BOX_AI: 7,
  /** Radio de recogida de latas de nitro. */
  CAN_PLAYER: 7.5,
  CAN_AI: 6.5,
  /** Una banana pisada. */
  BANANA: 5.5,
  /** Impacto de una bola de bolos. */
  BOWL: 6.5,
  /** Zona de turbo pintada en el asfalto. */
  BOOST_PAD: 22,
} as const;

export const PICKUP_WIDTH = {
  box: 7,
  can: 3.6,
  banana: 4,
  bowl: 4,
} as const;

/** Sectores en que se divide el bucle para validar vueltas (evita atajos grandes). */
export const SECTORS = 8;

/** Cámara de persecución. */
export const CAMERA = {
  /** Distancia detrás del jugador. */
  DIST: 36,
  /** Altura sobre el suelo. */
  HEIGHT: 21,
} as const;

/**
 * Sombra de cada prop sobre el suelo, en unidades del mundo para escala 1.
 * `rx` y `ry` son los semiejes de la base; `reach` es cuánto se alarga hacia el lado contrario al sol.
 */
export const PROP_SHADOW: Record<string, { rx: number; ry: number; reach: number }> = {
  palm: { rx: 7, ry: 5, reach: 20 },
  rock: { rx: 6, ry: 4, reach: 5 },
  bush: { rx: 5, ry: 3.5, reach: 3 },
  sign: { rx: 2, ry: 1.5, reach: 4 },
  lighthouse: { rx: 12, ry: 9, reach: 70 },
  cactus: { rx: 4, ry: 3, reach: 14 },
  cactus_barrel: { rx: 4, ry: 3, reach: 4 },
  rock_red: { rx: 7, ry: 5, reach: 5 },
  dead_tree: { rx: 6, ry: 4, reach: 14 },
  sign_skull: { rx: 2.4, ry: 1.6, reach: 5 },
  mesa_s: { rx: 44, ry: 24, reach: 70 },
  mesa_m: { rx: 66, ry: 34, reach: 100 },
  mesa_l: { rx: 92, ry: 46, reach: 140 },
  windmill: { rx: 12, ry: 9, reach: 36 },
  rock_arch: { rx: 44, ry: 14, reach: 56 },
  pine: { rx: 9, ry: 7, reach: 22 },
  pine_bare: { rx: 5, ry: 4, reach: 12 },
  snowman: { rx: 3, ry: 2.4, reach: 4 },
  mound: { rx: 11, ry: 7, reach: 3 },
  ice_crystal: { rx: 5, ry: 3.4, reach: 8 },
  pylon: { rx: 3, ry: 2, reach: 26 },
  cabin: { rx: 28, ry: 18, reach: 26 },
  tower_a: { rx: 46, ry: 28, reach: 40 },
  tower_b: { rx: 30, ry: 26, reach: 40 },
  tower_c: { rx: 60, ry: 38, reach: 60 },
  container: { rx: 30, ry: 12, reach: 6 },
  umbrella: { rx: 6, ry: 4, reach: 8 },
  tires: { rx: 8, ry: 5, reach: 5 },
  grandstand: { rx: 28, ry: 12, reach: 20 },
};

/**
 * Charcos de luz que las fuentes de luz proyectan en el suelo (se suman al color del mapa).
 * `r` es el radio en unidades del mundo para escala 1.
 */
export const LIGHT_POOLS: Record<string, { r: number; rgb: string; alpha: number }> = {
  lamp: { r: 46, rgb: '255, 206, 130', alpha: 0.55 },
  neon_sign: { r: 34, rgb: '255, 110, 210', alpha: 0.4 },
};
