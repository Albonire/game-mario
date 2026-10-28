import type { ReactNode } from 'react';
import { ITEMS } from '../game/data';
import { formatTime } from '../game/track';
import type { ItemId, MiniDot, RaceSnapshot } from '../game/types';
import { Icon } from './Icons';
import { TrackMap } from './TrackMap';

export type TouchControlName = 'left' | 'right' | 'brake' | 'drift' | 'nitro' | 'item';

export function ItemIcon({ item, size = 22 }: { item: ItemId | null; size?: number }) {
  if (!item) return <Icon name="box" size={size} />;
  if (item === 'turbo') return <Icon name="bolt" size={size} />;
  if (item === 'banana') return <Icon name="banana" size={size} />;
  return <Icon name="bowl" size={size} />;
}

function Panel({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={`hud-panel pointer-events-none rounded-[14px] border border-white/12 bg-[#071613]/78 text-[#f6f1e4] shadow-[0_16px_35px_-20px_rgba(0,0,0,.9)] backdrop-blur-md ${className}`}
    >
      {children}
    </div>
  );
}

function LapPanel({ snapshot }: { snapshot: RaceSnapshot }) {
  return (
    <Panel className="px-2 py-1.5 sm:px-4 sm:py-2.5">
      <div className="flex items-center gap-2">
        <div className="flex h-6 w-6 items-center justify-center rounded-md bg-[#d9f45a] text-[#071512] sm:h-7 sm:w-7">
          <Icon name="flag" size={14} strokeWidth={2.2} />
        </div>
        <div>
          <p className="font-mono text-[8px] uppercase tracking-[0.2em] text-white/45 sm:text-[9px]">Vuelta</p>
          <p className="font-display text-sm font-bold leading-none sm:text-base">
            {snapshot.lap}
            <span className="ml-0.5 text-[10px] font-medium text-white/45">/ {snapshot.totalLaps}</span>
          </p>
        </div>
        <div className="ml-2 flex gap-1 sm:ml-3">
          {Array.from({ length: snapshot.totalLaps }).map((_, i) => (
            <span
              key={i}
              className={`h-3 w-1 rounded-full sm:h-4 ${
                i < snapshot.lap - 1 ? 'bg-[#d9f45a]' : i === snapshot.lap - 1 ? 'bg-[#d9f45a]/60' : 'bg-white/15'
              }`}
            />
          ))}
        </div>
      </div>
      <div className="mt-1.5 border-t border-white/10 pt-1.5">
        <p className="font-mono text-[13px] font-medium leading-none tabular-nums tracking-tight sm:text-lg">
          {formatTime(snapshot.totalTime)}
        </p>
        <p className="mt-0.5 hidden font-mono text-[8px] uppercase tracking-wider text-white/40 sm:block sm:text-[9px]">
          Mejor vuelta <span className="text-white/70">{snapshot.bestLap ? formatTime(snapshot.bestLap) : '—:—'}</span>
        </p>
      </div>
    </Panel>
  );
}

function ItemPanel({ item }: { item: ItemId | null }) {
  const info = item ? ITEMS[item] : null;
  return (
    <Panel className="flex flex-col items-center px-2 py-1 sm:px-3.5 sm:py-2">
      <p className="hidden font-mono text-[7px] uppercase tracking-[0.22em] text-white/40 sm:block">Objeto</p>
      <div
        className={`relative mt-0 flex h-7 w-7 items-center justify-center rounded-[8px] border sm:mt-1 sm:h-10 sm:w-10 ${
          item ? 'item-glow border-white/25 bg-white/10' : 'border-dashed border-white/15 bg-white/[0.03] text-white/30'
        }`}
        style={item ? { color: info?.tone } : undefined}
      >
        <ItemIcon item={item} size={22} />
      </div>
      <p className="mt-1 max-w-16 truncate font-mono text-[7px] uppercase tracking-widest text-white/55">
        {info?.short ?? 'Vacío'}
      </p>
    </Panel>
  );
}

function Minimap({ dots, lap, onPause, muted, onToggleMute, onFullscreen }: {
  dots: MiniDot[];
  lap: number;
  onPause: () => void;
  muted: boolean;
  onToggleMute: () => void;
  onFullscreen: () => void;
}) {
  return (
    <Panel className="w-[84px] px-1 pb-1 pt-1 sm:w-[132px] sm:px-2 sm:pb-2">
      <div className="flex items-center justify-between gap-1 px-0.5">
        <p className="truncate font-mono text-[7px] uppercase tracking-[0.15em] text-white/45 sm:text-[8px]">Isla del Faro</p>
        <span className="flex h-1.5 w-1.5 rounded-full bg-[#d9f45a]" />
      </div>
      <div className="relative mt-1 overflow-hidden rounded-[9px] border border-white/10 bg-[#0a201b]">
        <TrackMap variant="minimap" dots={dots} className="block h-auto w-full" />
        <div className="absolute bottom-1 left-1 rounded-sm bg-black/45 px-1 py-px font-mono text-[6px] uppercase tracking-wider text-white/60">
          V{lap}
        </div>
      </div>
      <div className="pointer-events-auto mt-1 flex items-center justify-between gap-0.5">
        <button type="button" onClick={onPause} className="hud-icon-btn" aria-label="Pausa">
          <Icon name="pause" size={11} />
        </button>
        <button type="button" onClick={onToggleMute} className="hud-icon-btn" aria-label={muted ? 'Activar sonido' : 'Silenciar'}>
          <Icon name={muted ? 'mute' : 'sound'} size={12} />
        </button>
        <button type="button" onClick={onFullscreen} className="hud-icon-btn" aria-label="Pantalla completa">
          <Icon name="fullscreen" size={11} />
        </button>
        {highlightDot(dots)}
      </div>
    </Panel>
  );
}

function highlightDot(dots: MiniDot[]) {
  const player = dots.find((d) => d.isPlayer);
  return player ? <span className="hidden h-1.5 w-1.5 rounded-full sm:block" style={{ background: player.color }} /> : null;
}

function NitroPanel({ snapshot }: { snapshot: RaceSnapshot }) {
  const segments = 10;
  const filled = Math.round((snapshot.nitro / 100) * segments);
  const driftLevel = snapshot.driftHold > 1.6 ? 2 : snapshot.driftHold > 0.8 ? 1 : 0;
  const driftColor = driftLevel === 2 ? '#ff6b45' : driftLevel === 1 ? '#ffb23e' : '#f5ef8b';
  return (
    <Panel className="min-w-[106px] px-2 py-1.5 sm:min-w-[190px] sm:px-3.5 sm:py-2.5">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 text-[#65e2d1]">
          <Icon name="bolt" size={12} />
          <p className="font-mono text-[8px] uppercase tracking-[0.18em] text-white/60 sm:text-[9px]">Nitro</p>
        </div>
        <span className="font-mono text-[8px] tabular-nums text-white/35 sm:text-[9px]">{snapshot.nitro}%</span>
      </div>
      <div className="mt-1.5 flex gap-[2px] sm:gap-0.5">
        {Array.from({ length: segments }).map((_, i) => (
          <span
            key={i}
            className="h-2 flex-1 rounded-[1px] transition-colors duration-150 sm:h-2.5"
            style={{
              background: i < filled ? 'linear-gradient(180deg,#b8fff4,#34c5c5)' : 'rgba(255,255,255,.09)',
              boxShadow: i < filled ? '0 0 5px rgba(65,222,213,.28)' : undefined,
            }}
          />
        ))}
      </div>
      <div className="mt-1.5 flex items-center justify-between gap-2">
        <p className="font-mono text-[7px] uppercase tracking-[0.14em] text-white/30 sm:text-[8px]">
          {snapshot.drifting ? (
            <span style={{ color: driftColor }}>Derrape · {driftLevel === 2 ? '¡Turbo máximo!' : driftLevel === 1 ? 'Mini-turbo' : 'Cargando'}</span>
          ) : (
            'Shift para derrapar'
          )}
        </p>
        <span className="hidden rounded border border-white/15 px-1 py-0.5 font-mono text-[7px] text-white/45 sm:inline">N</span>
      </div>
      <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-white/10 sm:h-1.5">
        <div
          className="h-full rounded-full transition-[width] duration-100"
          style={{
            width: `${Math.min(100, (snapshot.driftHold / 1.7) * 100)}%`,
            background: snapshot.drifting ? driftColor : 'transparent',
          }}
        />
      </div>
    </Panel>
  );
}

function SpeedPanel({ snapshot }: { snapshot: RaceSnapshot }) {
  const ordinal = ['', '1', '2', '3', '4'][snapshot.position] ?? '4';
  return (
    <Panel className="overflow-hidden px-2.5 py-1.5 sm:px-4 sm:py-2.5">
      <div className="flex items-end gap-2 sm:gap-4">
        <div>
          <p className="font-mono text-[8px] uppercase tracking-[0.2em] text-white/40 sm:text-[9px]">Posición</p>
          <p className="font-display text-[26px] font-extrabold leading-none text-[#d9f45a] sm:text-[42px]">
            P{ordinal}
          </p>
        </div>
        <span className="mb-1.5 h-8 w-px bg-white/15 sm:mb-2 sm:h-11" />
        <div className="text-right">
          <p className="font-display text-[24px] font-bold leading-none tabular-nums tracking-tight sm:text-[42px]">
            {snapshot.speedKmh}
          </p>
          <p className="font-mono text-[8px] uppercase tracking-[0.2em] text-white/45 sm:text-[9px]">km/h</p>
        </div>
      </div>
      <div className="mt-1 flex items-center justify-end gap-2">
        {snapshot.boost > 0 && (
          <span className="animate-pulse rounded-sm bg-[#ff8a3d] px-1.5 py-0.5 font-mono text-[7px] font-bold uppercase tracking-wider text-[#201008]">
            Turbo
          </span>
        )}
        <span className="hidden font-mono text-[7px] uppercase tracking-wider text-white/25 sm:inline">
          {snapshot.surface === 'grass' ? 'Pasto · -45%' : snapshot.surface === 'sand' ? 'Arena · -50%' : snapshot.surface === 'curb' ? 'Bordillo' : 'Asfalto'}
        </span>
      </div>
    </Panel>
  );
}

function TouchButton({
  label,
  children,
  onPress,
  className = '',
}: {
  label: string;
  children: ReactNode;
  onPress: (pressed: boolean) => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onContextMenu={(e) => e.preventDefault()}
      onPointerDown={(e) => {
        e.preventDefault();
        e.currentTarget.setPointerCapture(e.pointerId);
        onPress(true);
      }}
      onPointerUp={(e) => {
        e.preventDefault();
        onPress(false);
      }}
      onPointerCancel={() => onPress(false)}
      onPointerLeave={(e) => {
        if (e.buttons === 0) onPress(false);
      }}
      className={`touch-btn pointer-events-auto flex select-none flex-col items-center justify-center rounded-full border border-white/20 bg-[#071613]/82 text-[#f6f1e4] shadow-lg backdrop-blur-md active:scale-95 active:border-[#d9f45a] active:bg-[#d9f45a] active:text-[#071613] ${className}`}
    >
      {children}
      <span className="mt-0.5 font-mono text-[7px] uppercase tracking-wider opacity-70">{label}</span>
    </button>
  );
}

export function TouchControls({ onPress }: { onPress: (control: TouchControlName, pressed: boolean) => void }) {
  const itemPress = (pressed: boolean) => {
    onPress('item', pressed);
    if (pressed) window.setTimeout(() => onPress('item', false), 90);
  };
  return (
    <div className="pointer-events-none absolute inset-0 z-30 flex items-end justify-between gap-2 px-2.5 pb-[max(10px,env(safe-area-inset-bottom))] sm:px-5 portrait:bottom-[calc(0px)]">
      <div className="flex items-center gap-2">
        <TouchButton label="Izq" onPress={(p) => onPress('left', p)} className="h-[50px] w-[50px]">
          <Icon name="arrowLeft" size={22} />
        </TouchButton>
        <TouchButton label="Der" onPress={(p) => onPress('right', p)} className="h-[50px] w-[50px]">
          <Icon name="arrow" size={22} />
        </TouchButton>
      </div>
      <div className="grid grid-cols-2 gap-1.5 opacity-95">
        <TouchButton label="Derrape" onPress={(p) => onPress('drift', p)} className="h-[44px] w-[44px] text-[#f5c15c]">
          <Icon name="steer" size={19} />
        </TouchButton>
        <TouchButton label="Nitro" onPress={(p) => onPress('nitro', p)} className="h-[44px] w-[44px] text-[#65e2d1]">
          <Icon name="bolt" size={18} />
        </TouchButton>
        <TouchButton label="Objeto" onPress={itemPress} className="h-[44px] w-[44px] rounded-[14px] text-[#f6f1e4]">
          <Icon name="box" size={18} />
        </TouchButton>
        <TouchButton label="Freno" onPress={(p) => onPress('brake', p)} className="h-[44px] w-[44px] text-[#ff9a7c]">
          <Icon name="pause" size={17} />
        </TouchButton>
      </div>
    </div>
  );
}

export function RaceHud({
  snapshot,
  paused,
  muted,
  onPause,
  onToggleMute,
  onFullscreen,
  showFps,
}: {
  snapshot: RaceSnapshot;
  paused: boolean;
  muted: boolean;
  onPause: () => void;
  onToggleMute: () => void;
  onFullscreen: () => void;
  showFps: boolean;
}) {
  return (
    <div className="pointer-events-none absolute inset-0 z-20 select-none">
      <div className="absolute left-2 top-2 sm:left-4 sm:top-4">
        <LapPanel snapshot={snapshot} />
      </div>
      <div className="absolute left-1/2 top-2 -translate-x-1/2 sm:top-4">
        <ItemPanel item={snapshot.item} />
      </div>
      <div className="absolute right-2 top-2 sm:right-4 sm:top-4">
        <Minimap dots={snapshot.minimap} lap={snapshot.lap} onPause={onPause} muted={muted} onToggleMute={onToggleMute} onFullscreen={onFullscreen} />
      </div>
      <div className="absolute bottom-2 left-2 sm:bottom-4 sm:left-4">
        <NitroPanel snapshot={snapshot} />
      </div>
      <div className="absolute bottom-2 right-2 sm:bottom-4 sm:right-4">
        <SpeedPanel snapshot={snapshot} />
      </div>

      {snapshot.rescuing && (
        <div className="absolute left-1/2 top-[38%] -translate-x-1/2 rounded-full border border-white/20 bg-[#071613]/80 px-4 py-1.5 font-mono text-[9px] uppercase tracking-[0.2em] text-[#f6f1e4] backdrop-blur">
          Rescatando kart…
        </div>
      )}
      {paused && (
        <div className="absolute left-1/2 top-1/2 h-16 w-16 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/20 bg-black/25 backdrop-blur-sm" />
      )}
      {showFps && (
        <div className="absolute bottom-[74px] left-1/2 -translate-x-1/2 rounded border border-white/10 bg-black/50 px-2 py-1 font-mono text-[8px] uppercase tracking-wider text-white/60">
          {snapshot.fps} fps · {snapshot.gamepad ? 'mando' : 'teclado'} · {snapshot.surface}
        </div>
      )}
    </div>
  );
}
