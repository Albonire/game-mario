import { useMemo } from 'react';
import { TRACK } from '../game/trackCache';
import { ISLAND, islandBoundary, worldToMinimap } from '../game/track';
import type { MiniDot } from '../game/types';

interface Props {
  dots?: MiniDot[];
  className?: string;
  accent?: string;
  variant?: 'hero' | 'minimap';
}

export function TrackMap({ dots = [], className = '', accent = '#d9f45a', variant = 'hero' }: Props) {
  const island = useMemo(() => {
    const pts: string[] = [];
    for (let i = 0; i < 110; i++) {
      const a = (i / 110) * Math.PI * 2;
      const r = islandBoundary(a) + 35;
      const p = worldToMinimap(TRACK, ISLAND.cx + Math.cos(a) * r, ISLAND.cy + Math.sin(a) * r * ISLAND.sy);
      pts.push(`${i === 0 ? 'M' : 'L'}${p.x.toFixed(2)} ${p.y.toFixed(2)}`);
    }
    return pts.join(' ') + ' Z';
  }, []);

  const start = useMemo(() => worldToMinimap(TRACK, TRACK.start.x, TRACK.start.y), []);
  const lighthouse = useMemo(() => worldToMinimap(TRACK, TRACK.lighthouse.x, TRACK.lighthouse.y), []);
  const isMini = variant === 'minimap';

  return (
    <svg viewBox="0 0 100 100" className={className} role="img" aria-label="Trazado del circuito Isla del Faro">
      <defs>
        <linearGradient id="island-fill" x1="20" y1="0" x2="80" y2="100">
          <stop offset="0" stopColor="#1b4639" />
          <stop offset="1" stopColor="#0d2b26" />
        </linearGradient>
        <linearGradient id="track-stroke" x1="0" y1="0" x2="100" y2="100">
          <stop offset="0" stopColor={accent} />
          <stop offset="0.55" stopColor="#ffffff" />
          <stop offset="1" stopColor={accent} />
        </linearGradient>
        <filter id="track-glow" x="-30%" y="-30%" width="160%" height="160%">
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
          <path d={island} fill="url(#island-fill)" stroke="#5fbfa0" strokeOpacity="0.24" strokeWidth="0.5" />
          <path d={island} fill="none" stroke="#d9f45a" strokeOpacity="0.13" strokeWidth="1.1" />
        </>
      )}
      {isMini && (
        <>
          <rect x="1" y="1" width="98" height="98" rx="14" fill="#0c211d" />
          <path d={island} fill="#123129" opacity="0.8" />
        </>
      )}

      <path
        d={TRACK.svgPath}
        fill="none"
        stroke="#061713"
        strokeWidth={isMini ? 5.2 : 6.2}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      <path
        d={TRACK.svgPath}
        fill="none"
        stroke="url(#track-stroke)"
        strokeWidth={isMini ? 2.1 : 2.6}
        strokeLinejoin="round"
        strokeLinecap="round"
        filter="url(#track-glow)"
      />
      <path
        d={TRACK.svgPath}
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
      <g>
        <circle cx={lighthouse.x} cy={lighthouse.y} r={isMini ? 2 : 2.6} fill={accent} />
        <circle cx={lighthouse.x} cy={lighthouse.y} r={isMini ? 3.2 : 5} fill="none" stroke={accent} strokeOpacity="0.35" strokeWidth="0.7" />
      </g>

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
