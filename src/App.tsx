import { useEffect, useRef, useState, type ReactNode } from 'react';
import hero from './assets/hero.jpg';
import { RaceGame } from './components/RaceGame';
import { TrackMap } from './components/TrackMap';
import { Icon } from './components/Icons';
import {
  ACHIEVEMENTS,
  CONTROLS,
  DIFFICULTIES,
  PILOTS,
  TRACK_FACTS,
  TRACK_SECTORS,
} from './game/data';
import type { Difficulty, PilotId } from './game/types';

const PILOT_KEY = 'tux-racing-pilot-v1';
const DIFFICULTY_KEY = 'tux-racing-difficulty-v1';
const ACHIEVEMENT_KEY = 'tux-racing-achievements-v1';
const MUTE_KEY = 'tux-racing-muted-v1';

function loadPilot(): PilotId {
  try {
    const stored = localStorage.getItem(PILOT_KEY) as PilotId | null;
    if (stored && PILOTS.some((p) => p.id === stored)) return stored;
  } catch {
    /* almacenamiento no disponible */
  }
  return 'pingui';
}

function loadDifficulty(): Difficulty {
  try {
    const stored = localStorage.getItem(DIFFICULTY_KEY) as Difficulty | null;
    if (stored && DIFFICULTIES.some((d) => d.id === stored)) return stored;
  } catch {
    /* almacenamiento no disponible */
  }
  return 'piloto';
}

function loadAchievements(): Set<string> {
  try {
    const stored = localStorage.getItem(ACHIEVEMENT_KEY);
    if (stored) {
      const arr = JSON.parse(stored);
      if (Array.isArray(arr)) return new Set(arr.filter((v) => typeof v === 'string'));
    }
  } catch {
    /* almacenamiento no disponible */
  }
  return new Set();
}

function loadMuted(): boolean {
  try {
    return localStorage.getItem(MUTE_KEY) === '1';
  } catch {
    return false;
  }
}

function Reveal({ children, delay = 0, className = '' }: { children: ReactNode; delay?: number; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.08, rootMargin: '0px 0px -40px 0px' },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);
  return (
    <div
      ref={ref}
      className={`reveal ${visible ? 'is-visible' : ''} ${className}`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </div>
  );
}

function Logo({ light = true }: { light?: boolean }) {
  return (
    <a href="#inicio" className="group flex items-center gap-2.5" aria-label="Tux Racing, inicio">
      <span className="relative flex h-8 w-8 items-center justify-center overflow-hidden rounded-[9px] bg-[#d9f45a] transition-transform duration-300 group-hover:rotate-6">
        <span className="absolute inset-y-0 left-1/2 w-1 -translate-x-1/2 -rotate-12 bg-[#071512]" />
        <span className="absolute inset-x-0 top-1/2 h-1 -translate-y-1/2 rotate-12 bg-[#071512]" />
        <span className="relative z-10 h-1.5 w-1.5 rounded-full bg-[#d9f45a]" />
      </span>
      <span className="leading-none">
        <span className={`block font-display text-[15px] font-extrabold tracking-[0.06em] ${light ? 'text-[#f6f1e4]' : 'text-[#071512]'}`}>TUX RACING</span>
        <span className={`mt-0.5 block font-mono text-[7px] uppercase tracking-[0.24em] ${light ? 'text-white/40' : 'text-black/40'}`}>Isla del Faro</span>
      </span>
    </a>
  );
}

function StatRow({ value, label, accent = false }: { value: string; label: string; accent?: boolean }) {
  return (
    <div className="flex flex-col">
      <span className={`font-display text-2xl font-bold leading-none tracking-tight sm:text-[28px] ${accent ? 'text-[#d9f45a]' : 'text-[#f6f1e4]'}`}>
        {value}
      </span>
      <span className="mt-1 font-mono text-[8px] uppercase tracking-[0.16em] text-white/35">{label}</span>
    </div>
  );
}

function PilotStats({ stats, color, dark = false }: { stats: { velocidad: number; aceleracion: number; agarre: number; derrape: number }; color: string; dark?: boolean }) {
  const entries: Array<[string, number]> = [
    ['VEL', stats.velocidad],
    ['ACE', stats.aceleracion],
    ['AGA', stats.agarre],
    ['DER', stats.derrape],
  ];
  return (
    <div className="grid grid-cols-2 gap-x-3 gap-y-1.5">
      {entries.map(([label, value]) => (
        <div key={label} className="flex items-center gap-1.5">
          <span className={`w-6 font-mono text-[7px] tracking-wider ${dark ? 'text-black/35' : 'text-white/35'}`}>{label}</span>
          <div className={`flex h-1 flex-1 gap-[2px] ${dark ? 'opacity-90' : ''}`}>
            {Array.from({ length: 10 }).map((_, i) => (
              <span
                key={i}
                className="flex-1 rounded-[1px]"
                style={{ background: i < value ? color : dark ? 'rgba(7,21,18,.13)' : 'rgba(255,255,255,.12)' }}
              />
            ))}
          </div>
          <span className={`font-mono text-[7px] tabular-nums ${dark ? 'text-black/40' : 'text-white/35'}`}>{value}</span>
        </div>
      ))}
    </div>
  );
}

function MiniHudPreview() {
  return (
    <div className="relative overflow-hidden rounded-[24px] border border-white/12 bg-[#071713] p-3 shadow-[0_40px_100px_-30px_rgba(0,0,0,.85)]">
      <div className="relative overflow-hidden rounded-[16px] border border-white/10">
        <img src={hero} alt="Vista previa del circuito de la Isla del Faro" className="h-[260px] w-full object-cover opacity-90 sm:h-[340px]" />
        <div className="absolute inset-0 bg-gradient-to-b from-[#06120f]/15 via-transparent to-[#06120f]/85" />
        <div className="absolute left-2.5 top-2.5 rounded-xl border border-white/15 bg-[#071613]/85 px-2.5 py-1.5 backdrop-blur">
          <div className="flex items-center gap-1.5">
            <span className="flex h-4 w-4 items-center justify-center rounded-sm bg-[#d9f45a] text-[#071512]"><Icon name="flag" size={9} /></span>
            <p className="font-mono text-[7px] uppercase tracking-[0.16em] text-white/45">Vuelta</p>
            <p className="font-display text-xs font-bold text-white">2<span className="text-[8px] text-white/40">/3</span></p>
          </div>
          <p className="mt-1 font-mono text-[11px] tabular-nums text-white">01:48<span className="text-white/40">.32</span></p>
        </div>
        <div className="absolute right-2.5 top-2.5 w-[82px] rounded-xl border border-white/15 bg-[#071613]/85 p-1 backdrop-blur">
          <p className="px-0.5 font-mono text-[6px] uppercase tracking-[0.13em] text-white/40">Isla del Faro</p>
          <TrackMap variant="minimap" className="mt-0.5 w-full" />
        </div>
        <div className="absolute bottom-2.5 left-2.5 right-2.5 flex items-end justify-between gap-2">
          <div className="rounded-xl border border-white/15 bg-[#071613]/85 px-2.5 py-1.5 backdrop-blur">
            <p className="font-mono text-[6px] uppercase tracking-[0.18em] text-white/40">Nitro</p>
            <div className="mt-1 flex w-[88px] gap-[2px]">
              {Array.from({ length: 10 }).map((_, i) => (
                <span key={i} className="h-1.5 flex-1 rounded-[1px]" style={{ background: i < 7 ? '#65e2d1' : 'rgba(255,255,255,.14)' }} />
              ))}
            </div>
            <div className="mt-1.5 flex items-center gap-1 text-[#ffb23e]"><Icon name="spark" size={8} /><span className="font-mono text-[6px] uppercase tracking-wider">Mini-turbo</span></div>
          </div>
          <div className="flex items-end gap-2 rounded-xl border border-white/15 bg-[#071613]/85 px-2.5 py-1.5 text-right backdrop-blur">
            <div>
              <p className="font-mono text-[6px] uppercase tracking-[0.18em] text-white/40">Posición</p>
              <p className="font-display text-2xl font-extrabold leading-none text-[#d9f45a]">P1</p>
            </div>
            <span className="mb-1 h-8 w-px bg-white/15" />
            <div>
              <p className="font-display text-2xl font-bold leading-none text-white">126</p>
              <p className="font-mono text-[6px] uppercase tracking-wider text-white/40">km/h</p>
            </div>
          </div>
        </div>
        <div className="absolute left-1/2 top-1/2 flex h-14 w-14 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-white/40 bg-[#071512]/30 text-white backdrop-blur-sm">
          <span className="absolute inset-1.5 rounded-full border border-dashed border-[#d9f45a]/60" />
          <Icon name="spark" size={19} className="text-[#d9f45a]" />
        </div>
      </div>
      <div className="flex items-center justify-between gap-3 px-1 pt-2.5">
        <div className="flex items-center gap-1.5">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#d9f45a]" />
          <span className="font-mono text-[7px] uppercase tracking-[0.18em] text-white/35">Render Mode 7 · 60 fps</span>
        </div>
        <div className="flex items-center gap-2 font-mono text-[7px] uppercase tracking-[0.14em] text-white/30">
          <Icon name="keyboard" size={11} />
          <Icon name="gamepad" size={11} />
          <Icon name="touch" size={11} />
        </div>
      </div>
    </div>
  );
}

export default function App() {
  const [gameOpen, setGameOpen] = useState(false);
  const [selectedPilot, setSelectedPilot] = useState<PilotId>(loadPilot);
  const [difficulty, setDifficulty] = useState<Difficulty>(loadDifficulty);
  const [unlocked, setUnlocked] = useState<Set<string>>(loadAchievements);
  const [muted, setMuted] = useState<boolean>(loadMuted);
  const [controlTab, setControlTab] = useState<'keyboard' | 'gamepad' | 'touch'>('keyboard');
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 28);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(PILOT_KEY, selectedPilot);
      localStorage.setItem(DIFFICULTY_KEY, difficulty);
      localStorage.setItem(ACHIEVEMENT_KEY, JSON.stringify([...unlocked]));
      localStorage.setItem(MUTE_KEY, muted ? '1' : '0');
    } catch {
      /* modo privado */
    }
  }, [selectedPilot, difficulty, unlocked, muted]);

  useEffect(() => {
    document.body.style.overflow = gameOpen ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [gameOpen]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target && ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)) return;
      if (event.code === 'KeyM' && !event.repeat) {
        event.preventDefault();
        setMuted((value) => !value);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const launch = (pilot?: PilotId) => {
    if (pilot) setSelectedPilot(pilot);
    setGameOpen(true);
  };

  const unlockAchievement = (id: string) => {
    setUnlocked((prev) => {
      if (prev.has(id)) return prev;
      const next = new Set(prev);
      next.add(id);
      return next;
    });
  };

  const unlockedCount = ACHIEVEMENTS.filter((a) => unlocked.has(a.id)).length;
  const selected = PILOTS.find((p) => p.id === selectedPilot)!;

  return (
    <div id="inicio" className="min-h-screen bg-[#06120f] font-sans text-[#f6f1e4] selection:bg-[#d9f45a] selection:text-[#071512]">
      <header
        className={`fixed inset-x-0 top-0 z-40 transition-all duration-300 ${
          scrolled ? 'border-b border-white/10 bg-[#06120f]/88 py-2.5 backdrop-blur-xl' : 'border-b border-transparent py-4'
        }`}
      >
        <div className="mx-auto flex w-full max-w-[1320px] items-center justify-between gap-4 px-4 sm:px-7 lg:px-10">
          <Logo />
          <nav className="hidden items-center gap-7 lg:flex" aria-label="Navegación principal">
            {[
              ['El juego', '#juego'],
              ['Pilotos', '#pilotos'],
              ['Circuito', '#circuito'],
              ['Logros', '#logros'],
              ['Cómo jugar', '#como-jugar'],
            ].map(([label, href]) => (
              <a
                key={href}
                href={href}
                className="group relative py-1 font-mono text-[9px] uppercase tracking-[0.17em] text-white/50 transition hover:text-white"
              >
                {label}
                <span className="absolute inset-x-0 -bottom-0.5 h-px origin-left scale-x-0 bg-[#d9f45a] transition-transform duration-300 group-hover:scale-x-100" />
              </a>
            ))}
          </nav>
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => setMuted((v) => !v)} aria-label={muted ? 'Activar sonido' : 'Silenciar'} className="nav-icon-btn hidden sm:flex">
              <Icon name={muted ? 'mute' : 'sound'} size={14} />
            </button>
            <button type="button" onClick={() => launch()} className="cta-small">
              Jugar ahora
              <Icon name="arrow" size={13} />
            </button>
          </div>
        </div>
      </header>

      <main>
        <section className="relative flex min-h-[100svh] flex-col justify-end overflow-hidden pt-24">
          <div className="absolute inset-0">
            <img src={hero} alt="" className="h-full w-full object-cover object-[64%_center]" />
            <div className="absolute inset-0 bg-gradient-to-r from-[#06120f] via-[#06120f]/82 to-[#06120f]/10" />
            <div className="absolute inset-0 bg-gradient-to-t from-[#06120f] via-transparent to-[#06120f]/75" />
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_20%_55%,rgba(7,24,19,.24),rgba(4,14,11,.8))] mix-blend-multiply" />
            <div className="absolute inset-0 opacity-[0.12] hero-grid" />
          </div>

          <div className="relative mx-auto flex w-full max-w-[1320px] flex-1 flex-col justify-center px-4 pb-10 pt-12 sm:px-7 lg:px-10 lg:pb-16">
            <div className="max-w-[720px]">
              <div className="hero-badge">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#d9f45a] opacity-60" />
                  <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-[#d9f45a]" />
                </span>
                <span>Arcade kart · Isla del Faro · Temporada 2026</span>
              </div>

              <h1 className="mt-5 font-display text-[68px] font-black leading-[0.78] tracking-[-0.055em] sm:text-[108px] lg:text-[136px]">
                <span className="block text-[#f6f1e4]">TUX</span>
                <span className="relative block w-fit text-[#d9f45a]">
                  RACING
                  <span className="absolute -right-2 -top-1 h-2 w-2 rounded-full bg-[#ff8a3d] sm:h-3 sm:w-3" />
                </span>
              </h1>

              <div className="mt-5 flex items-center gap-3">
                <span className="h-px w-8 bg-[#d9f45a]/60" />
                <p className="font-mono text-[9px] uppercase tracking-[0.28em] text-[#d9f45a]/85">Cuatro pilotos · Tres vueltas · Un faro</p>
              </div>

              <p className="mt-4 max-w-[470px] text-[15px] leading-relaxed text-white/60 sm:text-base">
                Un kart arcade en pseudo-3D donde la curva se gana antes de entrar. Derrapa, carga el mini-turbo y cruza el faro antes que nadie.
              </p>

              <div className="mt-7 flex flex-wrap items-center gap-3">
                <button type="button" onClick={() => launch()} className="btn-hero group">
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#071512] text-[#d9f45a]">
                    <Icon name="play" size={13} />
                  </span>
                  Jugar ahora
                  <Icon name="arrow" size={17} className="ml-1 transition-transform duration-300 group-hover:translate-x-1" />
                </button>
                <a href="#circuito" className="btn-hero-ghost group">
                  Conoce el circuito
                  <Icon name="arrow" size={15} className="rotate-90 text-white/35 transition-transform group-hover:translate-y-0.5" />
                </a>
              </div>

              <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-3 border-t border-white/12 pt-5 sm:gap-x-9">
                <StatRow value="04" label="Pilotos" />
                <span className="h-8 w-px bg-white/12" />
                <StatRow value="03" label="Vueltas" accent />
                <span className="h-8 w-px bg-white/12" />
                <StatRow value="60" label="FPS" />
                <span className="hidden h-8 w-px bg-white/12 sm:block" />
                <StatRow value="06" label="Logros" />
              </div>
            </div>
          </div>

          <div className="relative mx-auto flex w-full max-w-[1320px] flex-wrap items-end justify-between gap-4 px-4 pb-5 sm:px-7 lg:px-10">
            <button type="button" onClick={() => launch()} className="group hidden items-center gap-3 rounded-2xl border border-white/15 bg-[#06120f]/55 p-2.5 pr-4 text-left backdrop-blur-md transition hover:border-white/30 md:flex">
              <img src={selected.portrait} alt="" className="h-11 w-11 rounded-xl object-cover" />
              <span>
                <span className="block font-mono text-[7px] uppercase tracking-[0.17em] text-white/35">Tu piloto seleccionado</span>
                <span className="mt-0.5 block font-display text-[15px] font-semibold text-white">{selected.name} <span className="font-sans text-[10px] font-normal text-white/40">· {selected.role}</span></span>
              </span>
              <span className="ml-4 flex h-8 w-8 items-center justify-center rounded-full border border-white/15 text-[#d9f45a] transition group-hover:bg-[#d9f45a] group-hover:text-[#071512]">
                <Icon name="arrow" size={14} />
              </span>
            </button>
            <div className="ml-auto flex items-center gap-3 text-right">
              <div>
                <p className="font-mono text-[7px] uppercase tracking-[0.18em] text-white/35">Circuito 01</p>
                <p className="mt-0.5 font-display text-xs font-semibold text-white/80">Isla del Faro · 1,86 km</p>
              </div>
              <div className="flex h-10 w-10 items-center justify-center rounded-full border border-white/15 bg-[#06120f]/50 text-white/60 backdrop-blur">
                <Icon name="flag" size={15} />
              </div>
            </div>
          </div>
        </section>

        <div className="marquee-band" aria-hidden="true">
          <div className="marquee-track">
            {Array.from({ length: 2 }).map((_, i) => (
              <div key={i} className="flex shrink-0 items-center">
                {['Derrape', 'Nitro', 'Cajas sorpresa', '3 vueltas', 'Isla del Faro', 'IA elástica', '60 fps', 'Derrape', 'Turbo'].map((word, j) => (
                  <span key={`${word}-${j}`} className="flex items-center gap-5 px-5 font-display text-[12px] font-extrabold uppercase tracking-[0.08em] text-[#071512]">
                    {word}
                    <Icon name={j % 3 === 0 ? 'spark' : j % 3 === 1 ? 'bolt' : 'flag'} size={13} strokeWidth={2.2} />
                  </span>
                ))}
              </div>
            ))}
          </div>
        </div>

        <section className="relative overflow-hidden bg-[#071713]">
          <div className="pointer-events-none absolute -left-40 top-0 h-[480px] w-[480px] rounded-full bg-[#1d7e68]/12 blur-[130px]" />
          <div className="relative mx-auto w-full max-w-[1320px] px-4 py-16 sm:px-7 sm:py-24 lg:px-10">
            <div className="grid gap-10 lg:grid-cols-[1.15fr_0.85fr] lg:items-end">
              <Reveal>
                <p className="eyebrow"><span className="h-1.5 w-1.5 rounded-full bg-[#d9f45a]" />El juego</p>
                <h2 className="mt-4 max-w-[720px] font-display text-[38px] font-extrabold leading-[0.98] tracking-[-0.035em] sm:text-5xl lg:text-[62px]">
                  El kart es fácil de coger.<br />
                  <span className="text-white/35">La isla no perdona.</span>
                </h2>
              </Reveal>
              <Reveal delay={100}>
                <p className="max-w-md text-sm leading-relaxed text-white/45">
                  Tux Racing es un arcade de karts con cámara de persecución y trazado vivo. Aprende el circuito, domina la física de cada superficie y conviértete en el piloto número uno del faro.
                </p>
                <div className="mt-4 flex items-center gap-4">
                  <span className="font-mono text-[8px] uppercase tracking-[0.16em] text-white/30">Sin instalación</span>
                  <span className="h-1 w-1 rounded-full bg-white/20" />
                  <span className="font-mono text-[8px] uppercase tracking-[0.16em] text-white/30">Teclado · mando · táctil</span>
                </div>
              </Reveal>
            </div>

            <Reveal className="mt-12" delay={80}>
              <div className="grid overflow-hidden rounded-[20px] border border-white/10 bg-white/[0.025] sm:grid-cols-2 lg:grid-cols-4">
                {[
                  { n: '01', title: 'Elige carácter', text: 'Cuatro karts con velocidad, agarre y derrape distintos. Tu estilo manda.', icon: 'steer' as const },
                  { n: '02', title: 'Domina la pista', text: 'Asfalto, bordillo, pasto y arena cambian el agarre. El agua te devuelve al trazado.', icon: 'flag' as const },
                  { n: '03', title: 'Juega con ventaja', text: 'Derrapes cargados, latas de nitro y cajas sorpresa decididas por tu posición.', icon: 'bolt' as const },
                  { n: '04', title: 'Cruza el faro', text: 'Tres vueltas, tres rivales y una sola plaza en la leyenda de la isla.', icon: 'trophy' as const },
                ].map((item, i) => (
                  <div key={item.n} className={`relative p-5 transition-colors duration-300 hover:bg-white/[0.035] sm:p-6 ${i > 0 ? 'border-t border-white/8 sm:border-t-0' : ''} ${i === 1 ? 'sm:border-l sm:border-white/8' : ''} ${i === 2 ? 'lg:border-l' : ''} ${i === 3 ? 'sm:border-l sm:border-white/8' : ''} ${i >= 2 ? 'border-t border-white/8 lg:border-t-0' : ''}`}>
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-[9px] tracking-[0.15em] text-[#d9f45a]/60">{item.n}</span>
                      <span className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 bg-white/[0.04] text-white/45">
                        <Icon name={item.icon} size={15} />
                      </span>
                    </div>
                    <h3 className="mt-5 font-display text-lg font-semibold tracking-tight">{item.title}</h3>
                    <p className="mt-1.5 text-[12px] leading-relaxed text-white/40">{item.text}</p>
                  </div>
                ))}
              </div>
            </Reveal>
          </div>
        </section>

        <section id="pilotos" className="relative overflow-hidden bg-[#f3eedf] text-[#071512]">
          <div className="pointer-events-none absolute inset-0 opacity-[0.05] grain" />
          <div className="relative mx-auto w-full max-w-[1320px] px-4 py-16 sm:px-7 sm:py-24 lg:px-10">
            <Reveal>
              <div className="flex flex-col justify-between gap-6 sm:flex-row sm:items-end">
                <div>
                  <p className="eyebrow !text-[#0d3d2f]"><span className="h-1.5 w-1.5 rounded-full bg-[#0d3d2f]" />La escudería</p>
                  <h2 className="mt-4 max-w-[700px] font-display text-[38px] font-extrabold leading-[0.95] tracking-[-0.04em] sm:text-5xl lg:text-[62px]">
                    Cuatro formas de<br /><span className="text-[#0d3d2f]/45">morder el asfalto.</span>
                  </h2>
                </div>
                <div className="max-w-[290px] sm:text-right">
                  <p className="text-sm leading-relaxed text-[#071512]/50">
                    Ningún piloto es el mejor en todo. Encuentra el carácter que encaje con tu manera de tomar curvas.
                  </p>
                  <p className="mt-3 font-mono text-[8px] uppercase tracking-[0.16em] text-[#071512]/35">Toca un piloto para probarlo</p>
                </div>
              </div>
            </Reveal>

            <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {PILOTS.map((pilot, index) => (
                <Reveal key={pilot.id} delay={index * 70}>
                  <button
                    type="button"
                    onClick={() => launch(pilot.id)}
                    className="group relative block h-full w-full overflow-hidden rounded-[22px] border border-[#071512]/12 bg-[#fbf7ea] text-left transition-all duration-300 hover:-translate-y-1.5 hover:shadow-[0_28px_60px_-30px_rgba(7,21,18,.4)]"
                  >
                    <div className="relative aspect-[4/4.4] overflow-hidden bg-[#d9d0b8]">
                      <img
                        src={pilot.portrait}
                        alt={`${pilot.name}, ${pilot.animal} de Tux Racing`}
                        loading="lazy"
                        className="h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.045]"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-[#071512]/60 via-transparent to-transparent opacity-80" />
                      <div className="absolute inset-x-0 top-0 flex items-start justify-between p-3.5">
                        <span className="rounded-full border border-white/25 bg-black/25 px-2 py-1 font-mono text-[8px] tracking-[0.15em] text-white/80 backdrop-blur-sm">
                          #{pilot.number}
                        </span>
                        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white/20 text-white opacity-0 backdrop-blur transition-opacity duration-300 group-hover:opacity-100">
                          <Icon name="arrow" size={13} />
                        </span>
                      </div>
                      <div className="absolute inset-x-0 bottom-0 p-3.5">
                        <div className="flex items-end justify-between gap-2">
                          <span className="font-mono text-[8px] uppercase tracking-[0.18em] text-white/75">{pilot.animal}</span>
                          <span className="h-2 w-9 rounded-sm" style={{ background: pilot.color }} />
                        </div>
                        <p className="mt-0.5 font-display text-[30px] font-extrabold leading-none tracking-[-0.04em] text-white">{pilot.name}</p>
                      </div>
                    </div>

                    <div className="p-4">
                      <div className="flex items-center justify-between gap-2">
                        <p className="font-mono text-[8px] uppercase tracking-[0.16em]" style={{ color: pilot.dark }}>{pilot.role}</p>
                        <span className="text-[#071512]/30 transition-transform duration-300 group-hover:translate-x-0.5 group-hover:text-[#071512]">
                          <Icon name="arrow" size={14} />
                        </span>
                      </div>
                      <p className="mt-2 min-h-[32px] text-[12px] leading-snug text-[#071512]/55">{pilot.tagline}</p>
                      <div className="mt-3 border-t border-[#071512]/10 pt-3">
                        <PilotStats stats={pilot.stats} color={pilot.color} dark />
                      </div>
                      <div className="mt-3 rounded-lg border border-[#071512]/10 bg-[#071512]/[0.035] px-2.5 py-2">
                        <div className="flex items-center gap-1.5" style={{ color: pilot.dark }}>
                          <Icon name="shield" size={11} />
                          <span className="font-mono text-[8px] font-semibold uppercase tracking-[0.13em]">{pilot.ability}</span>
                        </div>
                        <p className="mt-1 text-[10px] leading-snug text-[#071512]/45">{pilot.abilityDetail}</p>
                      </div>
                    </div>
                  </button>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        <section id="circuito" className="relative overflow-hidden border-y border-white/10 bg-[#06120f]">
          <div className="pointer-events-none absolute right-0 top-1/3 h-[500px] w-[500px] rounded-full bg-[#155c4c]/18 blur-[140px]" />
          <div className="relative mx-auto w-full max-w-[1320px] px-4 py-16 sm:px-7 sm:py-24 lg:px-10">
            <div className="grid gap-10 lg:grid-cols-[0.92fr_1.08fr] lg:items-center">
              <Reveal>
                <p className="eyebrow"><span className="h-1.5 w-1.5 rounded-full bg-[#d9f45a]" />El circuito</p>
                <h2 className="mt-4 font-display text-[38px] font-extrabold leading-[0.98] tracking-[-0.04em] sm:text-5xl lg:text-[58px]">
                  Isla del Faro.<br /><span className="text-white/35">Doce curvas. Cero excusas.</span>
                </h2>
                <p className="mt-4 max-w-md text-sm leading-relaxed text-white/45">
                  Un anillo de asfalto que rodea la isla: arena, pasto a cuadros, un faro que vigila la costa y una recta donde el turbo sabe a gloria. Tres vueltas cronometradas y tres pilotos que no regalan nada.
                </p>

                <div className="mt-7 grid grid-cols-2 gap-x-6 gap-y-4 border-y border-white/10 py-5 sm:grid-cols-4">
                  {TRACK_FACTS.map((fact) => (
                    <div key={fact.label}>
                      <p className="font-mono text-[7px] uppercase tracking-[0.17em] text-white/35">{fact.label}</p>
                      <p className="mt-1 font-display text-lg font-semibold text-white/90">{fact.value}</p>
                    </div>
                  ))}
                </div>

                <div className="mt-5 space-y-1">
                  {TRACK_SECTORS.map((sector, i) => (
                    <div key={sector.id} className="group flex items-start gap-3 rounded-lg px-2 py-2 transition-colors hover:bg-white/[0.04]">
                      <span className="font-mono text-[9px] text-[#d9f45a]/55">{sector.id}</span>
                      <div className="flex-1 border-b border-white/[0.07] pb-2">
                        <div className="flex items-center justify-between gap-3">
                          <p className="text-[12px] font-medium text-white/80">{sector.name}</p>
                          <span className="hidden font-mono text-[8px] text-white/25 sm:block">SECTOR {i + 1}</span>
                        </div>
                        <p className="mt-0.5 text-[11px] text-white/35">{sector.note}</p>
                      </div>
                    </div>
                  ))}
                </div>

                <button type="button" onClick={() => launch()} className="mt-6 inline-flex items-center gap-2 font-mono text-[9px] uppercase tracking-[0.16em] text-[#d9f45a] transition hover:gap-3">
                  Jugar esta pista <Icon name="arrow" size={14} />
                </button>
              </Reveal>

              <Reveal delay={120}>
                <div className="relative overflow-hidden rounded-[24px] border border-white/12 bg-[#081b16] p-2 shadow-[0_40px_100px_-40px_rgba(0,0,0,.9)]">
                  <div className="grid-lines pointer-events-none absolute inset-0 opacity-30" />
                  <div className="relative rounded-[18px] border border-white/10 bg-[#071713] p-3 sm:p-5">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="font-mono text-[8px] uppercase tracking-[0.2em] text-white/35">Circuito 01</p>
                        <p className="mt-0.5 font-display text-lg font-semibold">Isla del Faro</p>
                      </div>
                      <div className="flex items-center gap-2 rounded-full border border-white/12 bg-white/[0.04] px-2.5 py-1">
                        <span className="h-1.5 w-1.5 rounded-full bg-[#d9f45a]" />
                        <span className="font-mono text-[8px] uppercase tracking-[0.13em] text-white/50">Asfalto seco</span>
                      </div>
                    </div>
                    <div className="relative mt-3">
                      <TrackMap className="w-full" />
                      <span className="absolute right-[9%] top-[38%] flex items-center gap-1 rounded-full border border-[#d9f45a]/25 bg-[#06120f]/80 px-1.5 py-1 font-mono text-[6px] uppercase tracking-wider text-[#d9f45a]">
                        <Icon name="pin" size={8} />Faro
                      </span>
                      <span className="absolute bottom-[12%] left-[44%] flex items-center gap-1 rounded-full border border-white/15 bg-[#06120f]/80 px-1.5 py-1 font-mono text-[6px] uppercase tracking-wider text-white/65">
                        <Icon name="flag" size={8} />Salida
                      </span>
                      <span className="absolute right-[6%] top-[8%] font-mono text-[7px] uppercase tracking-[0.15em] text-white/25">N</span>
                      <span className="absolute right-[6%] top-[13%] h-6 w-4 border-r border-t border-white/25" />
                    </div>
                    <div className="mt-3 grid grid-cols-3 gap-2 border-t border-white/8 pt-3">
                      {[
                        ['Vuelta récord', '00:33.80'],
                        ['Vel. máxima', '163 km/h'],
                        ['Curva clave', 'Faro'],
                      ].map(([label, value]) => (
                        <div key={label}>
                          <p className="font-mono text-[7px] uppercase tracking-wider text-white/30">{label}</p>
                          <p className="mt-0.5 font-mono text-[11px] text-white/80">{value}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap items-center justify-between gap-2 px-1">
                  <p className="font-mono text-[8px] uppercase tracking-[0.14em] text-white/25">3 vueltas · 4 pilotos · 20 latas de nitro</p>
                  <div className="flex items-center gap-1 text-white/25">
                    <Icon name="sound" size={11} />
                    <span className="font-mono text-[8px] uppercase tracking-wider">Audio sintetizado</span>
                  </div>
                </div>
              </Reveal>
            </div>
          </div>
        </section>

        <section id="juego" className="relative overflow-hidden bg-[#081913]">
          <div className="pointer-events-none absolute inset-0 opacity-[0.035] noise" />
          <div className="relative mx-auto w-full max-w-[1320px] px-4 py-16 sm:px-7 sm:py-24 lg:px-10">
            <div className="grid gap-10 lg:grid-cols-[1fr_0.95fr] lg:items-center">
              <div>
                <Reveal>
                  <p className="eyebrow"><span className="h-1.5 w-1.5 rounded-full bg-[#d9f45a]" />Sensación de carrera</p>
                  <h2 className="mt-4 max-w-[640px] font-display text-[38px] font-extrabold leading-[0.96] tracking-[-0.04em] sm:text-5xl lg:text-[60px]">
                    El derrape se siente.<br /><span className="text-[#d9f45a]">El turbo se recuerda.</span>
                  </h2>
                  <p className="mt-4 max-w-lg text-sm leading-relaxed text-white/45">
                    Cada mecánica tiene consecuencias, no adornos. La cámara se pega al asfalto, las chispas cuentan la carga del derrape y el nitro se vacía de verdad. Todo corre a 60 fps en tu navegador.
                  </p>
                </Reveal>

                <div className="mt-8 grid gap-3 sm:grid-cols-2">
                  {[
                    { icon: 'spark' as const, title: 'Derrape con recompensa', text: 'Mantén Shift y gira. A los 0,8 s ganas mini-turbo; a los 1,7 s, turbo máximo.', metric: '0,8 → 1,7 s' },
                    { icon: 'bolt' as const, title: 'Nitro que se gana', text: 'Cada lata recupera un 20 %. La tecla N convierte la barra en una recta de fuego.', metric: '20 latas' },
                    { icon: 'box' as const, title: 'IA con banda elástica', text: 'Tres rivales que aprietan si vas delante y empujan si te quedas atrás. Nunca una carrera rota.', metric: '88 → 112 %' },
                    { icon: 'flag' as const, title: 'Cuatro superficies', text: 'El bordillo conserva el 95 % del agarre. El pasto, el 55 %. La arena, el 50 %. El mar te rescata.', metric: '4 tipos' },
                  ].map((feature, i) => (
                    <Reveal key={feature.title} delay={i * 70}>
                      <div className="group h-full rounded-[16px] border border-white/10 bg-white/[0.025] p-4 transition-colors hover:border-[#d9f45a]/30 hover:bg-white/[0.04]">
                        <div className="flex items-center justify-between gap-2">
                          <span className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 bg-[#081913] text-[#d9f45a]">
                            <Icon name={feature.icon} size={15} />
                          </span>
                          <span className="font-mono text-[8px] tracking-[0.1em] text-white/30">{feature.metric}</span>
                        </div>
                        <h3 className="mt-4 font-display text-[15px] font-semibold">{feature.title}</h3>
                        <p className="mt-1 text-[11px] leading-relaxed text-white/40">{feature.text}</p>
                      </div>
                    </Reveal>
                  ))}
                </div>

                <div className="mt-5 flex flex-wrap items-center gap-2.5">
                  <span className="mini-chip">Phaser-style Mode 7</span>
                  <span className="mini-chip">Web Audio</span>
                  <span className="mini-chip">Gamepad API</span>
                  <span className="mini-chip">Guardado local</span>
                </div>
              </div>
              <Reveal delay={180}>
                <div className="relative">
                  <div className="absolute -inset-4 rounded-[30px] bg-gradient-to-br from-[#d9f45a]/8 via-transparent to-[#3bd3b4]/10 blur-2xl" />
                  <MiniHudPreview />
                  <div className="absolute -bottom-4 -left-2 hidden items-center gap-2 rounded-xl border border-white/15 bg-[#0a201a] px-3 py-2 shadow-xl sm:flex">
                    <span className="flex h-6 w-6 items-center justify-center rounded-md bg-[#d9f45a] text-[#071512]"><Icon name="spark" size={12} /></span>
                    <div>
                      <p className="font-mono text-[6px] uppercase tracking-[0.16em] text-white/35">Mini-turbo cargado</p>
                      <p className="font-display text-[11px] font-semibold text-white">Suelta Shift en la salida</p>
                    </div>
                  </div>
                </div>
              </Reveal>
            </div>
          </div>
        </section>

        <section id="logros" className="relative overflow-hidden bg-[#f3eedf] text-[#071512]">
          <div className="relative mx-auto w-full max-w-[1320px] px-4 py-16 sm:px-7 sm:py-24 lg:px-10">
            <Reveal>
              <div className="flex flex-col justify-between gap-6 sm:flex-row sm:items-end">
                <div>
                  <p className="eyebrow !text-[#0d3d2f]"><span className="h-1.5 w-1.5 rounded-full bg-[#0d3d2f]" />Logros</p>
                  <h2 className="mt-4 font-display text-[38px] font-extrabold leading-[0.95] tracking-[-0.04em] sm:text-5xl lg:text-[58px]">
                    La isla recuerda<br /><span className="text-[#0d3d2f]/45">a quien deja huella.</span>
                  </h2>
                </div>
                <div className="flex items-end gap-4 sm:items-center">
                  <div className="text-right">
                    <p className="font-mono text-[8px] uppercase tracking-[0.18em] text-[#071512]/35">Tu progreso</p>
                    <p className="font-display text-3xl font-extrabold leading-none">{String(unlockedCount).padStart(2, '0')}<span className="text-lg font-medium text-[#071512]/30"> / 06</span></p>
                  </div>
                  <div className="flex h-12 w-36 gap-1 sm:w-44">
                    {ACHIEVEMENTS.map((a) => (
                      <span key={a.id} className={`flex-1 rounded-sm ${unlocked.has(a.id) ? 'bg-[#0d3d2f]' : 'bg-[#071512]/12'}`} />
                    ))}
                  </div>
                </div>
              </div>
            </Reveal>

            <div className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {ACHIEVEMENTS.map((achievement, index) => {
                const done = unlocked.has(achievement.id);
                return (
                  <Reveal key={achievement.id} delay={index * 50}>
                    <div
                      className={`group relative flex h-full items-start gap-3.5 overflow-hidden rounded-[16px] border p-4 transition-all duration-300 ${
                        done
                          ? 'border-[#0d3d2f] bg-[#0b2c22] text-[#f6f1e4] shadow-[0_22px_40px_-30px_rgba(13,61,47,.8)]'
                          : 'border-[#071512]/12 bg-[#fbf7ea] text-[#071512] hover:border-[#071512]/25'
                      }`}
                    >
                      <span
                        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border ${
                          done ? 'border-[#d9f45a]/30 bg-[#d9f45a]/10 text-[#d9f45a]' : 'border-[#071512]/10 bg-[#071512]/[0.035] text-[#071512]/35'
                        }`}
                      >
                        <Icon name={done ? 'check' : achievement.icon} size={17} />
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <p className="font-mono text-[8px] uppercase tracking-[0.16em] opacity-40">{String(index + 1).padStart(2, '0')}</p>
                          <span className={`font-mono text-[7px] uppercase tracking-[0.13em] ${done ? 'text-[#d9f45a]' : 'text-[#071512]/30'}`}>
                            {done ? 'Desbloqueado' : 'Bloqueado'}
                          </span>
                        </div>
                        <p className="mt-1 font-display text-[15px] font-semibold leading-tight">{achievement.name}</p>
                        <p className={`mt-1 text-[11px] leading-relaxed ${done ? 'text-white/45' : 'text-[#071512]/45'}`}>{achievement.description}</p>
                      </div>
                    </div>
                  </Reveal>
                );
              })}
            </div>
            <Reveal className="mt-6">
              <div className="flex flex-col items-start justify-between gap-3 rounded-2xl border border-[#071512]/12 bg-[#fbf7ea] p-4 sm:flex-row sm:items-center">
                <p className="text-[12px] text-[#071512]/50">
                  Los logros se guardan en este navegador. Consigue el <strong className="text-[#071512]">Barrido perfecto</strong> y el <strong className="text-[#071512]">Rey de la isla</strong> en una sola carrera.
                </p>
                <button type="button" onClick={() => launch()} className="inline-flex shrink-0 items-center gap-2 rounded-full bg-[#071512] px-4 py-2.5 font-mono text-[9px] uppercase tracking-[0.14em] text-[#f6f1e4] transition hover:bg-[#0d3d2f]">
                  Intentar desbloquear <Icon name="arrow" size={12} />
                </button>
              </div>
            </Reveal>
          </div>
        </section>

        <section id="como-jugar" className="relative overflow-hidden bg-[#071713]">
          <div className="pointer-events-none absolute -right-40 bottom-0 h-[440px] w-[440px] rounded-full bg-[#2d8c74]/12 blur-[130px]" />
          <div className="relative mx-auto w-full max-w-[1320px] px-4 py-16 sm:px-7 sm:py-24 lg:px-10">
            <div className="grid gap-10 lg:grid-cols-[0.95fr_1.05fr] lg:items-start">
              <Reveal>
                <p className="eyebrow"><span className="h-1.5 w-1.5 rounded-full bg-[#d9f45a]" />Cómo jugar</p>
                <h2 className="mt-4 font-display text-[38px] font-extrabold leading-[0.96] tracking-[-0.04em] sm:text-5xl lg:text-[58px]">
                  Seis acciones.<br /><span className="text-white/35">Cero botones de más.</span>
                </h2>
                <p className="mt-4 max-w-md text-sm leading-relaxed text-white/45">
                  La arquitectura de entrada está separada del juego: la misma carrera funciona con teclado, mando o pantalla táctil. Acelera, colócate y derrapa en el momento exacto.
                </p>
                <div className="mt-6 flex gap-2">
                  {[
                    { id: 'keyboard' as const, label: 'Teclado', icon: 'keyboard' as const },
                    { id: 'gamepad' as const, label: 'Mando', icon: 'gamepad' as const },
                    { id: 'touch' as const, label: 'Táctil', icon: 'touch' as const },
                  ].map((tab) => (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setControlTab(tab.id)}
                      className={`flex items-center gap-2 rounded-full border px-3.5 py-2 font-mono text-[9px] uppercase tracking-[0.12em] transition ${
                        controlTab === tab.id
                          ? 'border-[#d9f45a] bg-[#d9f45a] text-[#071512]'
                          : 'border-white/12 bg-white/[0.03] text-white/45 hover:text-white'
                      }`}
                    >
                      <Icon name={tab.icon} size={13} />{tab.label}
                    </button>
                  ))}
                </div>

                <div className="mt-5 overflow-hidden rounded-[18px] border border-white/10 bg-white/[0.025]">
                  <div className="grid grid-cols-[1fr_auto] gap-3 border-b border-white/8 px-4 py-2.5 font-mono text-[7px] uppercase tracking-[0.16em] text-white/30">
                    <span>Acción</span>
                    <span>{controlTab === 'keyboard' ? 'Teclado' : controlTab === 'gamepad' ? 'Mando' : 'Táctil'}</span>
                  </div>
                  {CONTROLS.map((control) => {
                    const value = controlTab === 'keyboard' ? control.keyboard : controlTab === 'gamepad' ? control.gamepad : control.touch;
                    return (
                      <div key={control.action} className="grid grid-cols-[1fr_auto] items-center gap-3 border-b border-white/[0.055] px-4 py-3 last:border-0">
                        <span className="text-[12px] text-white/65">{control.action}</span>
                        <span className="rounded border border-white/12 bg-white/[0.06] px-2 py-1 font-mono text-[9px] text-white/80">{value}</span>
                      </div>
                    );
                  })}
                </div>
                <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2">
                  {['Esc / P · pausa', 'F1 · rendimiento', 'M · silencio'].map((item) => (
                    <span key={item} className="font-mono text-[8px] uppercase tracking-[0.13em] text-white/25">{item}</span>
                  ))}
                </div>
              </Reveal>

              <Reveal delay={120}>
                <div className="relative overflow-hidden rounded-[24px] border border-white/12 bg-[#0a1d18] p-5 sm:p-7">
                  <div className="pointer-events-none absolute inset-0 grid-lines opacity-40" />
                  <div className="relative flex items-start justify-between gap-4">
                    <div>
                      <p className="font-mono text-[8px] uppercase tracking-[0.2em] text-[#65e2d1]">En el móvil</p>
                      <h3 className="mt-1 font-display text-2xl font-bold tracking-tight">Acelera solo.<br />Tú piensa en la curva.</h3>
                    </div>
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-[#d9f45a]/25 bg-[#d9f45a]/10 text-[#d9f45a]">
                      <Icon name="touch" size={20} />
                    </div>
                  </div>

                  <div className="relative mt-6 flex items-end justify-between gap-3 rounded-[18px] border border-white/10 bg-[#06120f] p-4">
                    <div className="absolute inset-x-0 top-0 flex items-center justify-between border-b border-white/8 px-3 py-1.5">
                      <span className="font-mono text-[6px] uppercase tracking-[0.16em] text-white/25">Controles táctiles</span>
                      <span className="font-mono text-[6px] uppercase tracking-[0.16em] text-[#d9f45a]/60">60 fps</span>
                    </div>
                    <div className="mt-5 flex items-center gap-2">
                      <span className="touch-demo-btn"><Icon name="arrowLeft" size={20} /></span>
                      <span className="touch-demo-btn"><Icon name="arrow" size={20} /></span>
                    </div>
                    <div className="mt-5 grid grid-cols-2 gap-2">
                      <span className="touch-demo-btn !border-[#ffb23e]/25 !text-[#ffb23e]"><Icon name="steer" size={17} /><small>DER</small></span>
                      <span className="touch-demo-btn !border-[#65e2d1]/25 !text-[#65e2d1]"><Icon name="bolt" size={17} /><small>NIT</small></span>
                      <span className="touch-demo-btn !border-white/20 !text-white/85"><Icon name="box" size={17} /><small>OBJ</small></span>
                      <span className="touch-demo-btn !border-[#ff9a7c]/25 !text-[#ff9a7c]"><Icon name="pause" size={16} /><small>FRE</small></span>
                    </div>
                  </div>

                  <div className="relative mt-5 space-y-3">
                    {[
                      ['Aceleración automática', 'Solo tienes que frenar si te pasas.'],
                      ['Pausa desde el minimapa', 'El botón de pausa está siempre en tu HUD.'],
                      ['Mando instantáneo', 'Conecta un gamepad y pulsa cualquier botón.'],
                    ].map(([title, text]) => (
                      <div key={title} className="flex items-start gap-2.5">
                        <span className="mt-0.5 flex h-4 w-4 items-center justify-center rounded-full border border-[#d9f45a]/30 text-[#d9f45a]">
                          <Icon name="check" size={9} strokeWidth={2.4} />
                        </span>
                        <div>
                          <p className="text-[12px] font-medium text-white/80">{title}</p>
                          <p className="text-[10px] text-white/35">{text}</p>
                        </div>
                      </div>
                    ))}
                  </div>

                  <button type="button" onClick={() => launch()} className="relative mt-6 flex w-full items-center justify-between rounded-xl border border-white/12 bg-white/[0.04] px-4 py-3 font-mono text-[9px] uppercase tracking-[0.15em] text-white/70 transition hover:border-[#d9f45a]/35 hover:text-white">
                    <span className="flex items-center gap-2"><Icon name="gamepad" size={14} />Probar los controles</span>
                    <Icon name="arrow" size={14} className="text-[#d9f45a]" />
                  </button>
                </div>
              </Reveal>
            </div>
          </div>
        </section>

        <section className="relative overflow-hidden border-t border-white/10 bg-[#f3eedf] text-[#071512]">
          <div className="relative mx-auto flex w-full max-w-[1320px] flex-col gap-6 px-4 py-10 sm:px-7 sm:py-14 lg:flex-row lg:items-center lg:justify-between lg:px-10">
            <div className="flex flex-wrap items-center gap-x-8 gap-y-3">
              <div>
                <p className="font-mono text-[8px] uppercase tracking-[0.16em] text-[#071512]/35">Ficha técnica</p>
                <p className="mt-1 font-display text-lg font-bold">Mode 7 · IA elástica · 3 vueltas</p>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {['Canvas 2D', 'Web Audio', 'Gamepad API', 'Pseudo-3D', 'Responsive'].map((tag) => (
                  <span key={tag} className="rounded-full border border-[#071512]/15 px-2.5 py-1 font-mono text-[8px] uppercase tracking-[0.1em] text-[#071512]/45">{tag}</span>
                ))}
              </div>
            </div>
            <details className="group max-w-full lg:max-w-[430px]">
              <summary className="flex cursor-pointer list-none items-center gap-2 font-mono text-[9px] uppercase tracking-[0.14em] text-[#071512]/50 transition hover:text-[#071512]">
                Ver detalles del GDD <Icon name="chevron" size={12} className="transition-transform group-open:rotate-90" />
              </summary>
              <p className="mt-2 text-[11px] leading-relaxed text-[#071512]/50">
                Render pseudo-3D por filas sobre un mapa de isla de 2048 × 2048; cámara de persecución con horizonte fijo; física arcade con aceleración 115 u/s, punta 150 u/s y giro 2,3 rad/s; grip 100 % asfalto, 95 % bordillo, 55 % pasto y 50 % arena. Derrape corto 0,8 s, largo 1,7 s; nitro +20 por lata; cajas ponderadas por posición; banda elástica de 88 a 112 %. Tres vueltas de unos 35–40 s.
              </p>
            </details>
          </div>
        </section>

        <section className="relative overflow-hidden bg-[#06120f]">
          <div className="absolute inset-0">
            <img src={hero} alt="" className="h-full w-full object-cover object-[65%_center] opacity-55" />
            <div className="absolute inset-0 bg-gradient-to-r from-[#06120f] via-[#06120f]/85 to-[#06120f]/35" />
            <div className="absolute inset-0 bg-gradient-to-t from-[#06120f] via-transparent to-[#06120f]/60" />
          </div>
          <div className="relative mx-auto w-full max-w-[1320px] px-4 py-20 sm:px-7 sm:py-28 lg:px-10">
            <Reveal>
              <div className="flex flex-col items-start justify-between gap-8 lg:flex-row lg:items-end">
                <div>
                  <p className="eyebrow"><span className="h-1.5 w-1.5 rounded-full bg-[#d9f45a]" />La parrilla te espera</p>
                  <h2 className="mt-4 max-w-[750px] font-display text-[46px] font-black leading-[0.88] tracking-[-0.05em] sm:text-7xl lg:text-[92px]">
                    El faro ya está<br /><span className="text-[#d9f45a]">encendido.</span>
                  </h2>
                  <p className="mt-4 max-w-md text-sm leading-relaxed text-white/50">
                    Tres vueltas para dejar de ser un nombre en la lista. Elige tu kart, domina la isla y demuestra quién manda en el asfalto.
                  </p>
                </div>
                <div className="flex w-full max-w-[380px] flex-col gap-3">
                  <div className="flex items-center gap-3 rounded-2xl border border-white/15 bg-[#06120f]/55 p-3 backdrop-blur">
                    <img src={selected.portrait} alt={selected.name} className="h-12 w-12 rounded-xl object-cover" />
                    <div className="min-w-0 flex-1">
                      <p className="font-mono text-[7px] uppercase tracking-[0.18em] text-white/35">Listo en la parrilla</p>
                      <p className="truncate font-display text-base font-semibold">{selected.name}</p>
                    </div>
                    <span className="h-9 w-1 rounded-full" style={{ background: selected.color }} />
                  </div>
                  <button type="button" onClick={() => launch()} className="btn-hero w-full justify-between">
                    <span className="flex items-center gap-2.5">
                      <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#071512] text-[#d9f45a]"><Icon name="play" size={13} /></span>
                      Jugar a Tux Racing
                    </span>
                    <Icon name="arrow" size={17} />
                  </button>
                  <p className="text-center font-mono text-[8px] uppercase tracking-[0.14em] text-white/30">Gratis · sin registro · en tu navegador</p>
                </div>
              </div>
            </Reveal>
          </div>
        </section>
      </main>

      <footer className="border-t border-white/10 bg-[#030d0a]">
        <div className="mx-auto w-full max-w-[1320px] px-4 py-10 sm:px-7 lg:px-10">
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-[1.5fr_1fr_1fr_1fr]">
            <div>
              <Logo />
              <p className="mt-4 max-w-[280px] text-[11px] leading-relaxed text-white/35">
                Un juego de karts arcade original para el navegador. Derrapa, carga el turbo y conquista la Isla del Faro.
              </p>
              <div className="mt-4 flex items-center gap-2">
                <button type="button" onClick={() => launch()} className="rounded-full border border-white/15 px-3 py-1.5 font-mono text-[8px] uppercase tracking-[0.12em] text-white/55 transition hover:border-[#d9f45a]/40 hover:text-white">Jugar</button>
                <button type="button" onClick={() => setMuted((v) => !v)} className="nav-icon-btn"><Icon name={muted ? 'mute' : 'sound'} size={13} /></button>
              </div>
            </div>
            {[
              { title: 'El juego', links: [['Pilotos', '#pilotos'], ['Circuito', '#circuito'], ['Logros', '#logros'], ['Controles', '#como-jugar']] },
              { title: 'Carrera', links: [['Iniciar carrera', '#inicio'], ['Dificultad', '#inicio'], ['Objetos', '#juego'], ['Superficies', '#juego']] },
              { title: 'Proyecto', links: [['Ficha técnica', '#como-jugar'], ['Galería de pilotos', '#pilotos'], ['Cómo jugar', '#como-jugar'], ['Créditos', '#inicio']] },
            ].map((col) => (
              <div key={col.title}>
                <p className="font-mono text-[8px] uppercase tracking-[0.18em] text-white/30">{col.title}</p>
                <ul className="mt-3 space-y-2">
                  {col.links.map(([label, href]) => (
                    <li key={label}>
                      <a href={href} className="text-[11px] text-white/45 transition hover:text-[#d9f45a]">{label}</a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <div className="mt-8 flex flex-col items-start justify-between gap-3 border-t border-white/8 pt-5 sm:flex-row sm:items-center">
            <p className="font-mono text-[8px] uppercase tracking-[0.12em] text-white/25">
              © 2026 Tux Racing · Proyecto original de laboratorio
            </p>
            <p className="max-w-xl font-mono text-[8px] leading-relaxed tracking-[0.06em] text-white/20">
              Inspirado en la mecánica de SuperTuxKart. Sin código, personajes, arte ni música del original. Pilotos y escenarios propios.
            </p>
          </div>
        </div>
      </footer>

      {gameOpen && (
        <RaceGame
          pilotId={selectedPilot}
          difficulty={difficulty}
          muted={muted}
          unlocked={unlocked}
          onPilot={setSelectedPilot}
          onDifficulty={setDifficulty}
          onToggleMute={() => setMuted((v) => !v)}
          onUnlock={unlockAchievement}
          onClose={() => setGameOpen(false)}
        />
      )}
    </div>
  );
}
