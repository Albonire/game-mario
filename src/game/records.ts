import type { TrackId } from './types';

const KEY = 'tux-racing-records-v1';

export interface TrackRecord {
  /** Mejor vuelta en segundos. */
  bestLap: number;
  /** Mejor carrera completa en segundos. */
  bestRace: number;
}

export type Records = Partial<Record<TrackId, TrackRecord>>;

function valid(n: unknown): n is number {
  return typeof n === 'number' && Number.isFinite(n) && n > 0;
}

/** Récords guardados en este navegador. Un almacenamiento bloqueado equivale a no tener récords. */
export function loadRecords(): Records {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const out: Records = {};
    for (const [id, value] of Object.entries(parsed)) {
      const rec = value as Partial<TrackRecord> | null;
      if (rec && valid(rec.bestLap) && valid(rec.bestRace)) out[id as TrackId] = { bestLap: rec.bestLap, bestRace: rec.bestRace };
    }
    return out;
  } catch {
    return {};
  }
}

export interface SaveOutcome {
  record: TrackRecord;
  /** Mejor vuelta batida (no cuenta la primera vez). */
  newLap: boolean;
  /** Mejor carrera batida (no cuenta la primera vez). */
  newRace: boolean;
  /** Primera vez que se corre esta pista. */
  first: boolean;
}

/** Guarda el resultado si mejora lo anterior y dice qué se batió. */
export function saveResult(trackId: TrackId, bestLap: number, totalTime: number): SaveOutcome {
  const all = loadRecords();
  const prev = all[trackId];
  const lap = valid(bestLap) ? bestLap : prev?.bestLap ?? totalTime;
  const next: TrackRecord = {
    bestLap: prev ? Math.min(prev.bestLap, lap) : lap,
    bestRace: prev ? Math.min(prev.bestRace, totalTime) : totalTime,
  };
  try {
    localStorage.setItem(KEY, JSON.stringify({ ...all, [trackId]: next }));
  } catch {
    /* modo privado */
  }
  return {
    record: next,
    newLap: Boolean(prev) && next.bestLap < prev!.bestLap,
    newRace: Boolean(prev) && next.bestRace < prev!.bestRace,
    first: !prev,
  };
}
