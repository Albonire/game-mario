/**
 * Resolución interna de la carrera. El suelo Mode 7 se calcula por píxel en JavaScript,
 * así que el coste crece con el área: en Chromium sin GPU, 320x180 cuesta ~0,7 ms,
 * 640x360 ~2,7 ms con capa de detalle y 960x540 ~6 ms.
 */
export type QualityTier = 'alta' | 'media' | 'baja';
export type QualityChoice = QualityTier | 'auto';

export interface ViewSpec {
  tier: QualityTier;
  W: number;
  H: number;
  /** Fila del horizonte. */
  HORIZON: number;
  /** Distancia focal en píxeles. */
  FOCAL: number;
  /** Factor frente al lienzo lógico de 320x180 con el que se dibujó el arte original. */
  S: number;
}

export const TIER_ORDER: QualityTier[] = ['alta', 'media', 'baja'];
export const TIER_WIDTH: Record<QualityTier, number> = { alta: 640, media: 480, baja: 320 };
export const TIER_LABEL: Record<QualityTier, string> = { alta: 'Alta', media: 'Media', baja: 'Baja' };

/** Proporción del horizonte respecto al alto (62 de 180 en el diseño original). */
const HORIZON_RATIO = 62 / 180;

function fill(view: ViewSpec, tier: QualityTier) {
  const W = TIER_WIDTH[tier];
  const H = (W * 9) / 16;
  view.tier = tier;
  view.W = W;
  view.H = H;
  view.HORIZON = Math.round(H * HORIZON_RATIO);
  view.FOCAL = W / 2;
  view.S = W / 320;
  return view;
}

/**
 * Vista activa. Es un objeto único que se muta al cambiar de nivel; el motor, el suelo y el
 * cielo leen siempre de aquí y no guardan copias de W, H, HORIZON ni FOCAL.
 */
export const VIEW: ViewSpec = fill({ tier: 'alta', W: 0, H: 0, HORIZON: 0, FOCAL: 0, S: 1 }, 'alta');

export function setTier(tier: QualityTier): ViewSpec {
  return fill(VIEW, tier);
}

export function defaultTier(): QualityTier {
  if (typeof window === 'undefined') return 'alta';
  const coarse = window.matchMedia?.('(pointer: coarse)').matches || navigator.maxTouchPoints > 0;
  return coarse ? 'media' : 'alta';
}

/** Un nivel por debajo del actual, o null si ya está en el mínimo. */
export function lowerTier(tier: QualityTier): QualityTier | null {
  const i = TIER_ORDER.indexOf(tier);
  return i < TIER_ORDER.length - 1 ? TIER_ORDER[i + 1] : null;
}
