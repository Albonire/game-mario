import { buildTrack } from './track';

/** El trazado es determinista: se calcula una vez y se comparte con toda la interfaz. */
export const TRACK = buildTrack();
