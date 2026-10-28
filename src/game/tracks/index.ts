import type { TrackId } from '../types';
import { CANON } from './canon';
import { CUMBRE } from './cumbre';
import { FARO } from './faro';
import { NEON } from './neon';
import type { TrackDef } from './types';

/** Todas las pistas disponibles, en el orden en que se muestran. */
export const TRACK_DEFS: TrackDef[] = [FARO, CANON, CUMBRE, NEON];

export const TRACK_BY_ID = Object.fromEntries(TRACK_DEFS.map((t) => [t.id, t])) as Record<TrackId, TrackDef>;

export const DEFAULT_TRACK: TrackId = 'faro';

export function isTrackId(value: unknown): value is TrackId {
  return typeof value === 'string' && TRACK_DEFS.some((t) => t.id === value);
}
