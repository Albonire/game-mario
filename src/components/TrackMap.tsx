import { useMemo } from 'react';
import { TRACK_BY_ID, DEFAULT_TRACK } from '../game/tracks';
import { getTrack, worldToMinimap } from '../game/track';
import type { MiniDot, TrackId } from '../game/types';

interface Props {
  trackId?: TrackId;
  dots?: MiniDot[];
  className?: string;
  accent?: string;
  variant?: 'hero' | 'minimap';
}

/** Contorno de la isla en coordenadas del minimapa, o null si la pista no tiene isla de contorno polar. */
function islandOutline(trackId: TrackId): string | null {
  const def = TRACK_BY_ID[trackId];
  if (def.terrain.kind !== 'island') return null;
  const track = getTrack(trackId);
  const t = def.terrain;
  const pts: string[] = [];
  for (let i = 0; i < 110; i++) {
    const a = (i / 110) * Math.PI * 2;
    let r = t.base + 35;
    for (const [amp, k, phase] of t.harmonics) r += amp * Math.sin(k * (a > Math.PI ? a - Math.PI * 2 : a) + phase);
    const p = worldToMinimap(track, t.cx + Math.cos(a) * r, t.cy + Math.sin(a) * r * t.sy);
    pts.push(`${i === 0 ? 'M' : 'L'}${p.x.toFixed(2)} ${p.y.toFixed(2)}`);
  }
  return pts.join(' ') + ' Z';
}

export function TrackMap({ trackId = DEFAULT_TRACK, dots = [], className = '', accent = '#d9f45a', variant = 'hero' }: Props) {
  const track = useMemo(() => getTrack(trackId), [trackId]);
  const def = TRACK_BY_ID[trackId];
  const island = useMemo(() => islandOutline(trackId), [trackId]);
  const start = useMemo(() => worldToMinimap(track, track.start.x, track.start.y), [track]);
  const lighthouse = useMemo(() => {
    const lm = def.landmarks.find((l) => l.type === 'lighthouse');
    return lm ? worldToMinimap(track, lm.x, lm.y) : null;
  }, [track, def]);
  const isMini = variant === 'minimap';
  const uid = `${trackId}-${variant}`;
  // Tierra de las pistas sin isla: una cinta ancha alrededor del trazado.
  const ribbonWidth = def.terrain.kind === 'ribbon' ? def.terrain.radius * 2 * track.minimap.scale : 0;

  return (
    <svg viewBox="0 0 100 100" className={className} role="img" aria-label={`Trazado de ${def.name}`}>
      <defs>
        <linearGradient id={`land-${uid}`} x1="20" y1="0" x2="80" y2="100">
          <stop offset="0" stopColor="#1b4639" />
          <stop offset="1" stopColor="#0d2b26" />
        </linearGradient>
        <linearGradient id={`stroke-${uid}`} x1="0" y1="0" x2="100" y2="100">
          <stop offset="0" stopColor={accent} />
          <stop offset="0.55" stopColor="#ffffff" />
          <stop offset="1" stopColor={accent} />
        </linearGradient>
        <filter id={`glow-${uid}`} x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation={isMini ? 0.7 : 1.4} result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {!isMini && (
        <>
          <g opacity="0.28" stroke="#8ad7b5" strokeWidth="0.25" fill="none">
            {Array.from({ length: 8 }).map((_, i) => (
              <circle key={i} cx="50" cy="50" r={30 + i * 8} strokeDasharray="0.35 3.2" />
            ))}
          </g>
          {island ? (
            <>
              <path d={island} fill={`url(#land-${uid})`} stroke="#5fbfa0" strokeOpacity="0.24" strokeWidth="0.5" />
              <path d={island} fill="none" stroke={accent} strokeOpacity="0.13" strokeWidth="1.1" />
            </>
          ) : (
            <path
              d={track.svgPath}
              fill={`url(#land-${uid})`}
              stroke={`url(#land-${uid})`}
              strokeWidth={ribbonWidth}
              strokeLinejoin="round"
              opacity="0.9"
            />
          )}
        </>
      )}
      {isMini && (
        <>
          <rect x="1" y="1" width="98" height="98" rx="14" fill="#0c211d" />
          {island ? (
            <path d={island} fill="#123129" opacity="0.8" />
          ) : (
            <path d={track.svgPath} fill="#123129" stroke="#123129" strokeWidth={ribbonWidth} strokeLinejoin="round" opacity="0.8" />
          )}
        </>
      )}

      <path d={track.svgPath} fill="none" stroke="#061713" strokeWidth={isMini ? 5.2 : 6.2} strokeLinejoin="round" strokeLinecap="round" />
      <path
        d={track.svgPath}
        fill="none"
        stroke={`url(#stroke-${uid})`}
        strokeWidth={isMini ? 2.1 : 2.6}
        strokeLinejoin="round"
        strokeLinecap="round"
        filter={`url(#glow-${uid})`}
      />
      <path
        d={track.svgPath}
        fill="none"
        stroke="#061713"
        strokeWidth={isMini ? 0.55 : 0.7}
        strokeDasharray={isMini ? '1.4 3.4' : '0.9 3.6'}
        strokeLinecap="round"
        opacity="0.65"
      />

      <g>
        <circle cx={start.x} cy={start.y} r={isMini ? 3.4 : 3.1} fill="#f6f1e4" stroke="#071512" strokeWidth="1" />
        <text x={start.x} y={start.y + 1.1} textAnchor="middle" fontSize="3.4" fontWeight="800" fill="#071512">
          {isMini ? '1' : 'IN'}
        </text>
      </g>
      {lighthouse && (
        <g>
          <circle cx={lighthouse.x} cy={lighthouse.y} r={isMini ? 2 : 2.6} fill={accent} />
          <circle cx={lighthouse.x} cy={lighthouse.y} r={isMini ? 3.2 : 5} fill="none" stroke={accent} strokeOpacity="0.35" strokeWidth="0.7" />
        </g>
      )}

      {dots.map((dot) => (
        <g key={dot.id}>
          {dot.isPlayer && <circle cx={dot.x} cy={dot.y} r={isMini ? 4.6 : 4} fill={dot.color} opacity="0.24" />}
          <circle
            cx={dot.x}
            cy={dot.y}
            r={dot.isPlayer ? (isMini ? 2.6 : 2.4) : isMini ? 1.65 : 1.9}
            fill={dot.color}
            stroke={dot.isPlayer ? '#f8f4e7' : '#07130f'}
            strokeWidth={dot.isPlayer ? 1.1 : 0.7}
          />
        </g>
      ))}
    </svg>
  );
}
