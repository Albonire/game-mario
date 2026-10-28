import type { PropDef } from '../propKit';
import { CANON_PROPS } from './canon';
import { CUMBRE_PROPS } from './cumbre';
import { FARO_PROPS } from './faro';
import { NEON_PROPS } from './neon';
import { TRACKSIDE_PROPS } from './trackside';

/** Registro de todos los props de escenario por tipo. */
export const PROPS: Record<string, PropDef> = {
  ...FARO_PROPS,
  ...CANON_PROPS,
  ...CUMBRE_PROPS,
  ...NEON_PROPS,
  ...TRACKSIDE_PROPS,
};
