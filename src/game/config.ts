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

/** Ancho en unidades de cada tipo de prop (el alto sale del aspecto del sprite). */
export const PROP_WIDTH: Record<string, number> = {
  palm: 28,
  rock: 14,
  bush: 12,
  sign: 8,
  arch: 76,
  lighthouse: 58,
  bouy: 6,
};

export const PICKUP_WIDTH = {
  box: 7,
  can: 3.6,
  banana: 4,
  bowl: 4,
} as const;

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
};
