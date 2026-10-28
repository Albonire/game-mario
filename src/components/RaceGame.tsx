import { useEffect, useRef, useState } from 'react';
import hero from '../assets/hero.jpg';
import { ACHIEVEMENTS, ACHIEVEMENT_BY_ID, DIFFICULTIES, PILOT_BY_ID, PILOTS } from '../game/data';
import { RaceEngine } from '../game/engine';
import { formatTime } from '../game/track';
import type { Difficulty, PilotId, RaceResult, RaceSnapshot } from '../game/types';
import { Icon } from './Icons';
import { RaceHud, TouchControls, type TouchControlName } from './Hud';
import { TrackMap } from './TrackMap';

interface RaceGameProps {
  pilotId: PilotId;
  difficulty: Difficulty;
  muted: boolean;
  unlocked: Set<string>;
  onPilot: (id: PilotId) => void;
  onDifficulty: (d: Difficulty) => void;
  onToggleMute: () => void;
  onUnlock: (id: string) => void;
  onClose: () => void;
}

function BrandMark() {
  return (
    <div className="flex items-center gap-2.5">
      <span className="relative flex h-8 w-8 items-center justify-center overflow-hidden rounded-[9px] bg-[#d9f45a]">
        <span className="absolute inset-y-0 left-1/2 w-1 -translate-x-1/2 -rotate-12 bg-[#071512]" />
        <span className="absolute inset-x-0 top-1/2 h-1 -translate-y-1/2 rotate-12 bg-[#071512]" />
        <span className="relative z-10 h-1.5 w-1.5 rounded-full bg-[#d9f45a]" />
      </span>
      <span className="leading-none">
        <span className="block font-display text-[15px] font-extrabold tracking-[0.06em] text-[#f6f1e4]">TUX RACING</span>
        <span className="mt-0.5 block font-mono text-[7px] uppercase tracking-[0.24em] text-white/40">Isla del Faro</span>
      </span>
    </div>
  );
}

function StatBar({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="w-6 font-mono text-[7px] uppercase tracking-wider text-white/35">{label}</span>
      <div className="flex flex-1 gap-0.5">
        {Array.from({ length: 10 }).map((_, i) => (
          <span key={i} className="h-1 flex-1 rounded-sm" style={{ background: i < value ? color : 'rgba(255,255,255,.12)' }} />
        ))}
      </div>
    </div>
  );
}

function PreRace({
  pilotId,
  difficulty,
  muted,
  onPilot,
  onDifficulty,
  onToggleMute,
  onStart,
  onClose,
}: {
  pilotId: PilotId;
  difficulty: Difficulty;
  muted: boolean;
  onPilot: (id: PilotId) => void;
  onDifficulty: (d: Difficulty) => void;
  onToggleMute: () => void;
  onStart: () => void;
  onClose: () => void;
}) {
  const pilot = PILOT_BY_ID[pilotId];
  const difficultyInfo = DIFFICULTIES.find((d) => d.id === difficulty)!;
  return (
    <div className="relative h-[100dvh] overflow-y-auto bg-[#06120f] text-[#f6f1e4]">
      <div className="pointer-events-none absolute inset-0">
        <img src={hero} alt="" className="h-full w-full object-cover opacity-[0.22]" />
        <div className="absolute inset-0 bg-gradient-to-b from-[#06120f]/70 via-[#06120f]/90 to-[#06120f]" />
        <div className="absolute -left-36 top-1/3 h-[500px] w-[500px] rounded-full bg-[#1f7a65]/20 blur-[120px]" />
        <div className="absolute -right-32 top-0 h-[420px] w-[420px] rounded-full bg-[#d9f45a]/10 blur-[110px]" />
      </div>

      <div className="relative mx-auto flex min-h-full w-full max-w-[1320px] flex-col px-4 pb-8 pt-5 sm:px-7 lg:px-10">
        <div className="flex items-center justify-between">
          <BrandMark />
          <div className="flex items-center gap-2">
            <button type="button" onClick={onToggleMute} className="pref-btn" aria-label={muted ? 'Activar sonido' : 'Silenciar'}>
              <Icon name={muted ? 'mute' : 'sound'} size={16} />
            </button>
            <button type="button" onClick={onClose} className="pref-btn gap-2 px-3 text-[10px] uppercase tracking-[0.14em]" aria-label="Volver al paddock">
              <Icon name="close" size={15} />
              <span className="hidden sm:inline">Salir</span>
            </button>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap items-end justify-between gap-3 sm:mt-4">
          <div>
            <p className="eyebrow"><span className="h-1.5 w-1.5 rounded-full bg-[#d9f45a]" />Parrilla de salida · Isla del Faro</p>
            <h1 className="mt-2 max-w-3xl font-display text-[34px] font-extrabold leading-[0.92] tracking-[-0.045em] sm:text-[44px] lg:text-[50px]">
              Elige tu <span className="text-[#d9f45a]">leyenda</span>.
            </h1>          </div>
          <div className="hidden items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 font-mono text-[9px] uppercase tracking-[0.17em] text-white/45 md:flex">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#65e2d1]" />
            WebGL · 60 fps · Teclado / mando / táctil
          </div>
        </div>

        <div className="mt-5 grid flex-1 gap-4 lg:grid-cols-[minmax(0,1.24fr)_minmax(330px,0.76fr)] lg:gap-5">
          <div className="grid content-start gap-3 sm:grid-cols-2 lg:content-start">
            {PILOTS.map((p) => {
              const selected = p.id === pilotId;
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => onPilot(p.id)}
                  className={`group relative flex overflow-hidden rounded-[16px] border text-left transition-all duration-200 ${
                    selected ? 'border-transparent ring-2 ring-[#d9f45a]/85' : 'border-white/10 hover:border-white/25'
                  }`}
                  style={{ boxShadow: selected ? `0 20px 55px -32px ${p.color}` : undefined, background: selected ? 'rgba(10,28,23,.82)' : 'rgba(10,28,23,.6)' }}
                >
                  <div className="pre-portrait relative w-[40%] shrink-0 overflow-hidden bg-[#0d201a] sm:w-[43%]">
                    <img
                      src={p.portrait}
                      alt={p.name}
                      className={`absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.05] ${selected ? '' : 'opacity-75 saturate-[0.8]'}`}
                    />
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent to-[#0a1c17]/70" />
                    <span className="absolute left-2 top-2 rounded-full border border-white/25 bg-black/30 px-1.5 py-0.5 font-mono text-[7px] tracking-[0.12em] text-white/80 backdrop-blur-sm">
                      {p.number}
                    </span>
                    <span className="absolute inset-x-0 bottom-0 h-1" style={{ background: p.color }} />
                  </div>
                  <div className="flex min-w-0 flex-1 flex-col justify-between gap-2 px-3 py-3.5 sm:px-3.5 sm:py-4">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="font-mono text-[7px] uppercase tracking-[0.15em]" style={{ color: p.color }}>{p.role}</p>
                        <p className="mt-1 font-display text-[24px] font-extrabold leading-none tracking-tight">{p.name}</p>
                      </div>
                      <span
                        className={`mt-0.5 flex h-4.5 w-4.5 shrink-0 items-center justify-center rounded-full border transition ${
                          selected ? 'border-transparent text-[#071512]' : 'border-white/25 bg-black/20 text-transparent'
                        }`}
                        style={{ background: selected ? '#d9f45a' : undefined, height: 18, width: 18 }}
                      >
                        <Icon name="check" size={10} strokeWidth={2.8} />
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-x-2 gap-y-1">
                      <StatBar label="Vel" value={p.stats.velocidad} color={p.color} />
                      <StatBar label="Ac" value={p.stats.aceleracion} color={p.color} />
                      <StatBar label="Agar" value={p.stats.agarre} color={p.color} />
                      <StatBar label="Drft" value={p.stats.derrape} color={p.color} />
                    </div>
                    <div className="flex items-center gap-1 border-t border-white/8 pt-1.5 text-white/55">
                      <Icon name="shield" size={9} style={{ color: p.color }} />
                      <span className="truncate font-mono text-[7px] uppercase tracking-[0.08em]">{p.ability}</span>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          <div className="pre-summary relative flex h-full flex-col overflow-hidden rounded-[20px] border border-white/12 bg-[#0a1c17]/85 p-3.5 backdrop-blur-md sm:p-4">
            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#d9f45a]/40 to-transparent" />
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-mono text-[8px] uppercase tracking-[0.22em] text-white/35">Circuito 01</p>
                <h2 className="mt-1 font-display text-2xl font-bold tracking-tight">Isla del Faro</h2>
              </div>
              <div className="rounded-full border border-[#d9f45a]/25 bg-[#d9f45a]/10 px-2.5 py-1 font-mono text-[8px] uppercase tracking-[0.14em] text-[#d9f45a]">
                3 vueltas
              </div>
            </div>

            <div className="pre-map relative mx-auto mt-2 max-w-[206px] overflow-hidden rounded-[12px] border border-white/10 bg-[#071713] p-1">
              <TrackMap className="mx-auto h-auto w-full" />
              <div className="pointer-events-none absolute bottom-2 left-2 rounded-md border border-white/10 bg-[#06120f]/80 px-2 py-1">
                <p className="font-mono text-[6px] uppercase tracking-[0.16em] text-white/40">Récord</p>
                <p className="font-mono text-[10px] font-medium text-[#f6f1e4]">00:33.80</p>
              </div>
            </div>

            <div className="mt-2 grid grid-cols-3 gap-1.5">
              {[
                ['Distancia', '1,86 km'],
                ['Curvas', '12'],
                ['Pilotos', '4'],
              ].map(([label, value]) => (
                <div key={label} className="rounded-lg border border-white/8 bg-white/[0.025] px-2.5 py-2">
                  <p className="font-mono text-[7px] uppercase tracking-wider text-white/35">{label}</p>
                  <p className="mt-0.5 font-display text-sm font-semibold">{value}</p>
                </div>
              ))}
            </div>

            <div className="mt-2.5">
              <div className="flex items-center justify-between">
                <p className="font-mono text-[8px] uppercase tracking-[0.2em] text-white/35">Dificultad</p>
                <span className="font-mono text-[8px] text-white/30">{difficultyInfo.description.split('.')[0]}</span>
              </div>
              <div className="mt-2 grid grid-cols-3 gap-1 rounded-[10px] border border-white/10 bg-black/25 p-1">
                {DIFFICULTIES.map((d) => (
                  <button
                    key={d.id}
                    type="button"
                    onClick={() => onDifficulty(d.id)}
                    className={`rounded-[7px] px-1 py-2 font-mono text-[9px] uppercase tracking-[0.1em] transition ${
                      difficulty === d.id ? 'bg-[#d9f45a] text-[#071512]' : 'text-white/50 hover:text-white'
                    }`}
                  >
                    {d.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-auto space-y-2 pt-3">
              <div className="flex items-center gap-2.5 rounded-xl border border-white/10 bg-white/[0.025] p-2.5">
                <img src={pilot.portrait} alt="" className="h-10 w-10 rounded-lg object-cover" />
                <div className="min-w-0 flex-1">
                  <p className="font-mono text-[7px] uppercase tracking-[0.18em] text-white/35">Tu piloto</p>
                  <p className="truncate font-display text-sm font-semibold">{pilot.name} · {pilot.ability}</p>
                  <p className="truncate text-[10px] text-white/45">{pilot.abilityDetail}</p>
                </div>
              </div>
              <button type="button" onClick={onStart} className="btn-race group w-full">
                <span className="flex items-center gap-2.5">
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#071512] text-[#d9f45a]">
                    <Icon name="play" size={12} />
                  </span>
                  Entrar a la parrilla
                </span>
                <Icon name="arrow" size={18} className="transition-transform group-hover:translate-x-0.5" />
              </button>
              <div className="flex items-center justify-between px-0.5">
                <p className="font-mono text-[7px] uppercase tracking-[0.12em] text-white/28">Carga en 1 clic · sin descargas</p>
                <div className="flex items-center gap-1 text-white/30">
                  <Icon name="keyboard" size={13} />
                  <Icon name="gamepad" size={13} />
                  <Icon name="touch" size={13} />
                </div>
              </div>
            </div>

            <div className="mt-2.5 flex items-center justify-between gap-2 border-t border-white/8 pt-2 font-mono text-[7px] uppercase tracking-[0.13em] text-white/28">
              <span>3 vueltas · 4 pilotos</span>
              <span className="flex items-center gap-1"><Icon name="keyboard" size={10} /><Icon name="gamepad" size={10} /><Icon name="touch" size={10} /></span>
            </div>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-white/8 pt-4 font-mono text-[8px] uppercase tracking-[0.16em] text-white/25">
          <p>Un juego original · Inspirado en la mecánica de los karts arcade</p>
          <p>Consejo: el derrape carga turbo. Suelta Shift en la salida de la curva.</p>
        </div>
      </div>
    </div>
  );
}

function RaceView({
  pilotId,
  difficulty,
  muted,
  onToggleMute,
  onUnlock,
  onExit,
  onRestart,
  onGarage,
}: {
  pilotId: PilotId;
  difficulty: Difficulty;
  muted: boolean;
  onToggleMute: () => void;
  onUnlock: (id: string) => void;
  onExit: () => void;
  onRestart: () => void;
  onGarage: () => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<RaceEngine | null>(null);
  const resultRef = useRef<RaceResult | null>(null);
  const [snapshot, setSnapshot] = useState<RaceSnapshot | null>(null);
  const [paused, setPaused] = useState(false);
  const [result, setResult] = useState<RaceResult | null>(null);
  const [earned, setEarned] = useState<string[]>([]);
  const [toasts, setToasts] = useState<Array<{ key: number; id: string }>>([]);
  const [showFps, setShowFps] = useState(false);
  const [useTouch, setUseTouch] = useState(false);
  const demo = typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('demo') === '1';

  const callbacks = useRef({ onUnlock, onExit, onGarage, onRestart });
  callbacks.current = { onUnlock, onExit, onGarage, onRestart };

  useEffect(() => {
    setUseTouch(
      typeof window !== 'undefined' &&
        (window.matchMedia('(pointer: coarse)').matches || navigator.maxTouchPoints > 0),
    );
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const engine = new RaceEngine(canvas, {
      pilotId,
      difficulty,
      autoThrottle: window.matchMedia('(pointer: coarse)').matches || navigator.maxTouchPoints > 0,
      muted,
      demo,
      onSnapshot: (s) => setSnapshot(s),
      onFinish: (r) => {
        resultRef.current = r;
        setResult(r);
        setPaused(false);
      },
      onAchievement: (id) => {
        setEarned((prev) => (prev.includes(id) ? prev : [...prev, id]));
        callbacks.current.onUnlock(id);
        const key = Date.now() + Math.random();
        setToasts((prev) => [...prev.slice(-2), { key, id }]);
        window.setTimeout(() => {
          setToasts((prev) => prev.filter((toast) => toast.key !== key));
        }, 3800);
      },
      onPauseRequest: () => {
        if (resultRef.current) return;
        setPaused((p) => !p);
      },
    });
    engineRef.current = engine;
    return () => {
      engine.destroy();
      engineRef.current = null;
    };
    // El motor se vuelve a crear únicamente cuando se reinicia la carrera.
  }, [pilotId, difficulty]);

  useEffect(() => {
    engineRef.current?.setPaused(paused);
  }, [paused]);

  useEffect(() => {
    engineRef.current?.setMuted(muted);
  }, [muted]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)) return;
      if (e.code === 'F1') {
        e.preventDefault();
        setShowFps((v) => !v);
      }
      if (e.code === 'KeyM' && !e.repeat) {
        e.preventDefault();
        onToggleMute();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
    };
  }, [onToggleMute]);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      void rootRef.current?.requestFullscreen?.().catch(() => undefined);
    } else {
      void document.exitFullscreen();
    }
  };

  const press = (control: TouchControlName, pressed: boolean) => {
    engineRef.current?.setTouch(control, pressed);
  };

  const ordinal = result ? result.playerPosition : snapshot?.position ?? 4;
  const pilot = PILOT_BY_ID[pilotId];

  return (
    <div ref={rootRef} className="race-root relative h-[100dvh] w-full overflow-hidden bg-[#030c0a] text-[#f6f1e4]">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,#0b251e_0%,#030c0a_72%)]" />
      <img src={hero} alt="" aria-hidden className="race-bg pointer-events-none absolute inset-0 hidden h-full w-full object-cover opacity-[0.22]" />
      <div className="pointer-events-none absolute inset-0 hidden bg-gradient-to-b from-[#06120f]/70 via-[#06120f]/50 to-[#06120f] portrait-mobile-block" />
      <div className="race-stage absolute inset-0 z-0 flex items-center justify-center">
        <div className="relative aspect-video w-full max-h-[100dvh] max-w-[min(100vw,calc(100dvh*16/9))] overflow-hidden bg-[#061713] shadow-[0_40px_120px_-20px_rgba(0,0,0,.85)]">
          <canvas ref={canvasRef} width={320} height={180} className="block h-full w-full" style={{ imageRendering: 'pixelated' }} />

          {snapshot && (
            <RaceHud
              snapshot={snapshot}
              paused={paused}
              muted={muted}
              onPause={() => setPaused(true)}
              onToggleMute={onToggleMute}
              onFullscreen={toggleFullscreen}
              showFps={showFps}
            />
          )}

          <div className="pointer-events-none absolute inset-x-0 top-[30%] z-30 flex flex-col items-center gap-2 px-4">
            {toasts.map((toast) => {
              const achievement = ACHIEVEMENT_BY_ID[toast.id];
              if (!achievement) return null;
              return (
                <div
                  key={toast.key}
                  className="achievement-toast flex items-center gap-3 rounded-[14px] border border-[#d9f45a]/35 bg-[#071613]/92 py-2 pl-2 pr-4 shadow-[0_16px_50px_-16px_rgba(0,0,0,.9)] backdrop-blur-md"
                >
                  <span className="relative flex h-9 w-9 items-center justify-center rounded-[10px] bg-[#d9f45a] text-[#071512]">
                    <span className="absolute inset-0 animate-ping rounded-[10px] bg-[#d9f45a]/40" />
                    <Icon name={achievement.icon} size={17} className="relative" />
                  </span>
                  <div>
                    <p className="font-mono text-[7px] uppercase tracking-[0.2em] text-[#d9f45a]/70">Logro desbloqueado</p>
                    <p className="font-display text-[13px] font-bold leading-tight text-[#f6f1e4]">{achievement.name}</p>
                    <p className="text-[9px] leading-tight text-white/40">{achievement.description}</p>
                  </div>
                </div>
              );
            })}
          </div>

          {demo && snapshot && (
            <div className="pointer-events-none absolute right-2 top-[122px] z-20 rounded-full border border-white/12 bg-[#071613]/65 px-2 py-0.5 font-mono text-[6px] uppercase tracking-[0.16em] text-white/35 backdrop-blur sm:right-4 sm:top-[152px]">
              Demo · IA
            </div>
          )}

          {!snapshot && (
            <div className="absolute inset-0 z-30 flex items-center justify-center bg-[#061713]">
              <div className="text-center">
                <div className="mx-auto h-11 w-11 animate-spin rounded-full border-2 border-white/10 border-t-[#d9f45a]" />
                <p className="mt-4 font-mono text-[9px] uppercase tracking-[0.25em] text-white/45">Trazando la isla…</p>
                <p className="mt-1 font-display text-lg font-semibold text-white/80">Isla del Faro</p>
              </div>
            </div>
          )}

          {snapshot && snapshot.phase === 'countdown' && (
            <div className="pointer-events-none absolute inset-0 z-30 flex items-center justify-center">
              <div className="absolute inset-x-0 bottom-[16%] text-center">
                <div key={snapshot.countdownLabel} className="countdown-number">
                  {snapshot.countdownLabel}
                </div>
                <p className="mt-2 font-mono text-[9px] uppercase tracking-[0.3em] text-white/80 drop-shadow-lg">
                  {pilot.name} · Vuelta 1 de 3
                </p>
              </div>
            </div>
          )}

          {snapshot && snapshot.phase === 'racing' && snapshot.countdownLabel === '¡YA!' && (
            <div className="pointer-events-none absolute inset-0 z-30 flex items-center justify-center">
              <div className="countdown-number !text-[#d9f45a]">¡YA!</div>
            </div>
          )}
        </div>
      </div>

      <div className="pointer-events-none absolute inset-x-0 top-[calc(50%+21vw)] z-20 hidden flex-col items-center gap-2 px-6 text-center portrait-mobile-block">
        <p className="font-mono text-[8px] uppercase tracking-[0.24em] text-[#d9f45a]/70">Isla del Faro · Vuelta 1 de 3</p>
        <p className="font-display text-xl font-bold leading-tight text-white/90">Gira el móvil para una vista más amplia</p>
        <p className="max-w-[280px] text-[11px] leading-relaxed text-white/40">Acelera automáticamente. Usa los botones inferiores para girar, derrapar y lanzar el nitro.</p>
      </div>

      {useTouch && <TouchControls onPress={press} />}

      {paused && !result && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center overflow-y-auto bg-[#030c0a]/82 p-4 backdrop-blur-xl">
          <div className="w-full max-w-[520px] overflow-hidden rounded-[24px] border border-white/12 bg-[#0a1c17] shadow-[0_40px_120px_-30px_rgba(0,0,0,.9)]">
            <div className="border-b border-white/10 p-5 sm:p-6">
              <div className="flex items-start justify-between">
                <div>
                  <p className="eyebrow"><span className="h-1.5 w-1.5 rounded-full bg-[#d9f45a]" />Carrera en pausa</p>
                  <h2 className="mt-2 font-display text-3xl font-extrabold tracking-tight">Respira. La isla espera.</h2>
                </div>
                <span className="flex h-11 w-11 items-center justify-center rounded-full border border-white/10 bg-white/5 text-white/60">
                  <Icon name="pause" size={18} />
                </span>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                <span className="mini-chip">P{ordinal} en carrera</span>
                <span className="mini-chip">{formatTime(snapshot?.totalTime ?? 0)}</span>
                <span className="mini-chip">{snapshot?.speedKmh ?? 0} km/h</span>
                <span className="mini-chip">{pilot.name}</span>
              </div>
            </div>
            <div className="space-y-2 p-4 sm:p-5">
              <button type="button" onClick={() => setPaused(false)} className="menu-btn-primary">
                <span className="flex items-center gap-2.5"><Icon name="play" size={14} />Continuar carrera</span>
                <span className="font-mono text-[9px] uppercase tracking-wider opacity-60">Esc</span>
              </button>
              <div className="grid gap-2 sm:grid-cols-2">
                <button type="button" onClick={callbacks.current.onRestart} className="menu-btn">
                  <Icon name="restart" size={16} />Reiniciar
                </button>
                <button type="button" onClick={callbacks.current.onGarage} className="menu-btn">
                  <Icon name="steer" size={16} />Cambiar piloto
                </button>
                <button type="button" onClick={onToggleMute} className="menu-btn">
                  <Icon name={muted ? 'mute' : 'sound'} size={16} />{muted ? 'Activar sonido' : 'Silenciar'}
                </button>
                <button type="button" onClick={toggleFullscreen} className="menu-btn">
                  <Icon name="fullscreen" size={16} />Pantalla completa
                </button>
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-white/8 pt-4">
                {[
                  ['↑ Acelerar', 'W'],
                  ['← → Girar', 'A D'],
                  ['Shift Derrape', 'Shift'],
                  ['Espacio Objeto', 'Space'],
                  ['N Nitro', 'N'],
                ].map(([label, key]) => (
                  <span key={key} className="flex items-center gap-1.5 text-[10px] text-white/40">
                    <kbd className="rounded border border-white/15 bg-white/5 px-1.5 py-0.5 font-mono text-[8px] text-white/60">{key}</kbd>
                    {label.split(' ')[0]}
                  </span>
                ))}
              </div>
              <button
                type="button"
                onClick={() => {
                  setPaused(false);
                  callbacks.current.onExit();
                }}
                className="mt-2 w-full rounded-xl border border-transparent py-2 font-mono text-[9px] uppercase tracking-[0.16em] text-white/30 transition hover:text-[#ff8a72]"
              >
                Abandonar carrera y volver al paddock
              </button>
            </div>
          </div>
        </div>
      )}

      {result && (
        <div className="fixed inset-0 z-[75] overflow-y-auto bg-[#04110e]/92 backdrop-blur-xl">
          <div className="mx-auto flex min-h-full w-full max-w-[1120px] flex-col justify-center px-4 py-8 sm:px-6">
            <div className="pointer-events-none absolute inset-0 overflow-hidden">
              <div className="absolute left-1/2 top-0 h-[500px] w-[700px] -translate-x-1/2 rounded-full bg-[#d9f45a]/8 blur-[130px]" />
            </div>
            <div className="relative grid gap-6 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
              <div>
                <p className="eyebrow"><span className="h-1.5 w-1.5 rounded-full bg-[#d9f45a]" />Carrera completada · Isla del Faro</p>
                <div className="mt-4 flex items-end gap-3">
                  <span className="font-display text-[96px] font-extrabold leading-[0.75] tracking-[-0.08em] text-[#d9f45a] sm:text-[132px]">
                    P{result.playerPosition}
                  </span>
                  <div className="mb-2">
                    <p className="font-mono text-[9px] uppercase tracking-[0.2em] text-white/35">Posición final</p>
                    <p className="font-display text-xl font-semibold">{pilot.name}</p>
                  </div>
                </div>
                <h2 className="mt-4 font-display text-3xl font-extrabold leading-[0.95] tracking-tight sm:text-[42px]">
                  {result.playerPosition === 1
                    ? 'Rey de la isla.'
                    : result.playerPosition === 2
                      ? 'A un suspiro del faro.'
                      : result.playerPosition === 3
                        ? 'Un podio con sal.'
                        : 'La isla aún espera.'}
                </h2>
                <p className="mt-2 max-w-md text-sm leading-relaxed text-white/45">
                  {result.playerPosition === 1
                    ? 'Trazada limpia, derrapes medidos y el faro encendido para ti. Vuelve a bajar el récord cuando quieras.'
                    : 'El asfalto no regala nada. Revisa tus mini-turbos, afina la salida y vuelve a por el faro.'}
                </p>

                <div className="mt-5 grid grid-cols-3 gap-2">
                  <div className="result-stat">
                    <p>Tiempo total</p>
                    <strong>{formatTime(result.totalTime)}</strong>
                  </div>
                  <div className="result-stat">
                    <p>Mejor vuelta</p>
                    <strong>{result.bestLap ? formatTime(result.bestLap) : '--:--.--'}</strong>
                  </div>
                  <div className="result-stat">
                    <p>Última vuelta</p>
                    <strong>{result.lastLap ? formatTime(result.lastLap) : '--:--.--'}</strong>
                  </div>
                </div>

                <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                  <button type="button" onClick={callbacks.current.onRestart} className="btn-race flex-1 py-3 text-xs">
                    <span className="flex items-center gap-2"><Icon name="restart" size={15} />Correr otra vez</span>
                    <Icon name="arrow" size={16} />
                  </button>
                  <button type="button" onClick={callbacks.current.onGarage} className="menu-btn flex-1 justify-center py-3">
                    <Icon name="steer" size={15} />Cambiar piloto
                  </button>
                </div>
                <button
                  type="button"
                  onClick={callbacks.current.onExit}
                  className="mt-2 w-full rounded-xl py-2 font-mono text-[9px] uppercase tracking-[0.16em] text-white/30 transition hover:text-white/70"
                >
                  Volver al paddock
                </button>
              </div>

              <div className="rounded-[22px] border border-white/12 bg-white/[0.035] p-4 backdrop-blur-md sm:p-5">
                <div className="flex items-center justify-between border-b border-white/10 pb-3">
                  <p className="font-mono text-[9px] uppercase tracking-[0.2em] text-white/40">Clasificación final</p>
                  <div className="flex items-center gap-1.5 font-mono text-[8px] uppercase tracking-wider text-white/30">
                    <Icon name="flag" size={12} />3 vueltas
                  </div>
                </div>
                <div className="mt-2 divide-y divide-white/[0.06]">
                  {result.standings.map((row, i) => (
                    <div
                      key={row.id}
                      className={`flex items-center gap-3 py-2.5 ${row.isPlayer ? 'text-[#f6f1e4]' : 'text-white/65'}`}
                    >
                      <span className={`flex h-7 w-7 items-center justify-center rounded-md font-mono text-[11px] font-bold ${i === 0 ? 'bg-[#d9f45a] text-[#071512]' : 'border border-white/10 bg-white/[0.04] text-white/45'}`}>
                        {i + 1}
                      </span>
                      <span className="h-6 w-1 rounded-full" style={{ background: row.color }} />
                      <div className="min-w-0 flex-1">
                        <p className="flex items-center gap-2 font-display text-sm font-semibold">
                          {row.name}
                          {row.isPlayer && <span className="rounded-sm bg-[#d9f45a]/15 px-1.5 py-0.5 font-mono text-[7px] uppercase tracking-wider text-[#d9f45a]">Tú</span>}
                        </p>
                        <p className="font-mono text-[8px] text-white/30">{PILOT_BY_ID[row.id].animal}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-mono text-[11px] tabular-nums">{formatTime(row.time)}</p>
                        <p className="font-mono text-[8px] text-white/30">VT {row.bestLap ? formatTime(row.bestLap) : '--:--.--'}</p>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-4 rounded-xl border border-[#d9f45a]/18 bg-[#d9f45a]/[0.055] p-3">
                  <div className="flex items-center justify-between">
                    <p className="font-mono text-[8px] uppercase tracking-[0.2em] text-[#d9f45a]/75">Logros de esta carrera</p>
                    <span className="font-mono text-[9px] text-[#d9f45a]">{earned.length}</span>
                  </div>
                  {earned.length === 0 ? (
                    <p className="mt-2 text-[11px] leading-relaxed text-white/40">
                      Aún no han saltado chispas nuevas. Derrapa más de 0,8 s, recoge cajas y usa el nitro para desbloquear logros.
                    </p>
                  ) : (
                    <div className="mt-2 space-y-1.5">
                      {earned.map((id) => {
                        const a = ACHIEVEMENT_BY_ID[id];
                        if (!a) return null;
                        return (
                          <div key={id} className="flex items-center gap-2 text-[11px] text-white/75">
                            <Icon name={a.icon} size={13} className="text-[#d9f45a]" />
                            <span>{a.name}</span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                <div className="mt-3 flex items-center justify-between gap-3 border-t border-white/8 pt-3">
                  <div className="flex items-center gap-2">
                    {ACHIEVEMENTS.map((a) => (
                      <span
                        key={a.id}
                        title={a.name}
                        className={`flex h-6 w-6 items-center justify-center rounded-md border ${
                          earned.includes(a.id) ? 'border-[#d9f45a]/40 bg-[#d9f45a]/10 text-[#d9f45a]' : 'border-white/8 text-white/15'
                        }`}
                      >
                        <Icon name={a.icon} size={11} />
                      </span>
                    ))}
                  </div>
                  <p className="font-mono text-[8px] uppercase tracking-[0.13em] text-white/25">{pilot.ability}</p>
                </div>
              </div>
            </div>
            <div className="relative mt-6 flex flex-wrap items-center justify-between gap-2 border-t border-white/8 pt-4 font-mono text-[8px] uppercase tracking-[0.16em] text-white/20">
              <p>Tux Racing · Circuito Isla del Faro</p>
              <p>Derrape · Nitro · Objetos · IA elástica</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export function RaceGame(props: RaceGameProps) {
  const [stage, setStage] = useState<'select' | 'race'>('select');
  const [raceKey, setRaceKey] = useState(0);

  return (
    <div className="fixed inset-0 z-50 bg-[#06120f]">
      {stage === 'select' ? (
        <PreRace
          pilotId={props.pilotId}
          difficulty={props.difficulty}
          muted={props.muted}
          onPilot={props.onPilot}
          onDifficulty={props.onDifficulty}
          onToggleMute={props.onToggleMute}
          onStart={() => {
            setRaceKey((k) => k + 1);
            setStage('race');
          }}
          onClose={props.onClose}
        />
      ) : (
        <RaceView
          key={raceKey}
          pilotId={props.pilotId}
          difficulty={props.difficulty}
          muted={props.muted}
          onToggleMute={props.onToggleMute}
          onUnlock={props.onUnlock}
          onExit={props.onClose}
          onGarage={() => setStage('select')}
          onRestart={() => setRaceKey((k) => k + 1)}
        />
      )}
    </div>
  );
}
