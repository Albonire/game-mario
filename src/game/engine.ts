import { getSprite, propSprite } from './art';
import { KART, PICKUP, PICKUP_WIDTH, PROP_WIDTH, SECTORS } from './config';
import { BOX_WEIGHTS, DIFFICULTY_BY_ID, PILOTS, PILOT_BY_ID } from './data';
import { GameAudio } from './audio';
import { Mode7Renderer, drawWorldSprite, project } from './render';
import { KartSprites, lodIndexFor, pitchIndexFor, poseKeyFor } from './sprites/atlas';
import { SURFACE_FOLLOW, SURFACE_GRIP, isVoid } from './terrain/materials';
import { loadWorld, matAt, surfaceAt, type BuildProgress, type WorldData } from './terrain/world';
import { WORLD, angleDelta, clamp, formatTime, nearestPoint, worldToMinimap } from './track';
import type { TrackDef } from './tracks/types';
import type { TrackData, TrackId } from './types';
import { VIEW, defaultTier, lowerTier, setTier, type QualityChoice, type QualityTier } from './view';
import type {
  Difficulty,
  EnginePhase,
  ItemId,
  Pilot,
  PilotId,
  RaceResult,
  RaceSnapshot,
  Standing,
  Surface,
} from './types';

type TouchControl = 'left' | 'right' | 'brake' | 'drift' | 'nitro' | 'item';

interface Kart {
  pilot: Pilot;
  isPlayer: boolean;
  x: number;
  y: number;
  angle: number;
  /** Dirección real de avance; sigue al morro con retraso sobre hielo. */
  moveAngle: number;
  speed: number;
  idx: number;
  prevIdx: number;
  laps: number;
  lapStart: number;
  lastLap: number;
  bestLap: number;
  finishTime: number;
  finished: boolean;
  item: ItemId | null;
  nitro: number;
  boost: number;
  spin: number;
  spinAngle: number;
  spinDir: number;
  immune: number;
  rescue: number;
  wrongClock: number;
  /** Sector actual del bucle y cuántos avances de sector acumula la vuelta en curso. */
  sector: number;
  sectorSteps: number;
  /** Veces que cayó al vacío y fue rescatado. */
  rescues: number;
  driftHeld: boolean;
  driftHold: number;
  steerSmooth: number;
  boostPadCooldown: number;
  boxCount: number;
  baseLane: number;
  aiSeed: number;
  aiScale: number;
}

interface Particle {
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  life: number;
  maxLife: number;
  size: number;
  color: string;
  gravity: number;
}

interface Box {
  x: number;
  y: number;
  active: boolean;
  respawn: number;
  phase: number;
}

interface Can {
  x: number;
  y: number;
  active: boolean;
  respawn: number;
  phase: number;
}

interface Banana {
  x: number;
  y: number;
  owner: PilotId | 'track';
  armedAt: number;
  life: number;
}

interface Projectile {
  x: number;
  y: number;
  angle: number;
  speed: number;
  owner: PilotId;
  ownerIsPlayer: boolean;
  life: number;
}

interface InputState {
  steer: number;
  throttle: number;
  brake: number;
  drift: boolean;
  nitro: boolean;
  item: boolean;
}

export interface RaceOptions {
  pilotId: PilotId;
  trackId: TrackId;
  difficulty: Difficulty;
  /** Nivel gráfico; 'auto' baja solo si el equipo no llega a 60 fps. */
  quality?: QualityChoice;
  onLoadProgress?: BuildProgress;
  /** Expone `window.__tux` con medidas de rendimiento y estado de la carrera (solo para pruebas). */
  debug?: boolean;
  /** Solo para pruebas: ejecuta N pasos de simulación por fotograma. */
  timeScale?: number;
  autoThrottle: boolean;
  muted: boolean;
  /** Modo espectador: el kart del jugador conduce con la IA. */
  demo?: boolean;
  onSnapshot: (snapshot: RaceSnapshot) => void;
  onFinish: (result: RaceResult) => void;
  onPauseRequest: () => void;
  onAchievement: (id: string) => void;
}

const TOUCH_KEYS: TouchControl[] = ['left', 'right', 'brake', 'drift', 'nitro', 'item'];

/** Superficies donde el motor suena más forzado y el derrape levanta polvo o nieve. */
const OFFROAD = new Set<Surface>(['grass', 'sand', 'dirt', 'snow', 'deepsnow']);

function audioSurface(s: Surface): 'asphalt' | 'curb' | 'grass' | 'sand' {
  switch (s) {
    case 'grass':
    case 'snow':
    case 'deepsnow':
      return 'grass';
    case 'sand':
    case 'dirt':
      return 'sand';
    case 'curb':
    case 'concrete':
      return 'curb';
    default:
      return 'asphalt';
  }
}

export class RaceEngine {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private world!: WorldData;
  private track!: TrackData;
  private def!: TrackDef;
  private renderer!: Mode7Renderer;
  private sprites!: KartSprites;
  private overlay!: HTMLCanvasElement;
  private tier: QualityTier = 'alta';
  private autoQuality = true;
  private slowClock = 0;
  private perf = { update: 0, render: 0 };
  private loadMs = 0;
  private bumpClock = 0;
  private spinCamYaw = 0;
  private rejectClock = 0;
  private audio = new GameAudio();
  private opts: RaceOptions;
  private karts: Kart[] = [];
  private player!: Kart;
  private phase: EnginePhase = 'countdown';
  private paused = false;
  private countdown = 3;
  private countdownLast = 4;
  private goFlash = 0;
  private raceTime = 0;
  private camX = 0;
  private camY = 0;
  private camYaw = 0;
  private shake = 0;
  private particles: Particle[] = [];
  private boxes: Box[] = [];
  private cans: Can[] = [];
  private bananas: Banana[] = [];
  private projectiles: Projectile[] = [];
  private keys = new Set<string>();
  private touch: Record<TouchControl, boolean> = {
    left: false,
    right: false,
    brake: false,
    drift: false,
    nitro: false,
    item: false,
  };
  private itemQueued = false;
  private padItemPrev = false;
  private padStartPrev = false;
  private gamepadConnected = false;
  private unlocked = new Set<string>();
  private passed = new Set<PilotId>();
  private snapshotClock = 0;
  private fps = 60;
  private lastFrame = 0;
  private raf = 0;
  private destroyed = false;
  private finishSent = false;
  private driftEmitClock = 0;
  private boostEmitClock = 0;

  constructor(canvas: HTMLCanvasElement, opts: RaceOptions) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) throw new Error('Canvas 2D no disponible');
    this.ctx = ctx;
    this.opts = opts;
    this.audio.setMuted(opts.muted);
    this.audio.init();
    this.autoQuality = (opts.quality ?? 'auto') === 'auto';
    this.applyTier(opts.quality && opts.quality !== 'auto' ? opts.quality : defaultTier());
    void this.init();
  }

  /** Carga el mundo de la pista (asíncrono, con progreso) y arranca el bucle. */
  private async init() {
    const loadStart = performance.now();
    this.world = await loadWorld(this.opts.trackId, this.opts.onLoadProgress);
    this.loadMs = performance.now() - loadStart;
    if (this.destroyed) return;
    this.track = this.world.track;
    this.def = this.world.def;
    this.renderer = new Mode7Renderer(this.world);
    this.createWorld();
    this.createKarts();
    this.warmUpSprites();
    this.audio.startEngine();
    this.attachEvents();
    if (this.opts.debug) (window as unknown as { __tux?: unknown }).__tux = {
        state: () => this.debugState(),
        spin: (index: number) => this.spinKart(this.karts[index]),
      };
    this.lastFrame = performance.now();
    this.raf = requestAnimationFrame(this.loop);
  }

  /** Estado resumido para pruebas automáticas: fase, tiempos, karts y rendimiento. */
  private debugState() {
    return {
      track: this.def.id,
      loadMs: this.loadMs,
      phase: this.phase,
      raceTime: this.raceTime,
      tier: this.tier,
      fps: this.fps,
      spritesPending: this.sprites.pending(),
      updateMs: this.perf.update,
      renderMs: this.perf.render,
      karts: this.karts.map((k) => ({
        id: k.pilot.id,
        isPlayer: k.isPlayer,
        laps: k.laps,
        idx: k.idx,
        speed: k.speed,
        rescues: k.rescues,
        bestLap: k.bestLap,
        lastLap: k.lastLap,
        finished: k.finished,
        finishTime: k.finishTime,
      })),
    };
  }

  /**
   * Prepara los sprites de los karts: lo imprescindible para el primer fotograma se genera ya
   * y el resto (otras alturas de cámara, tamaños y poses) entra por tandas durante la carrera.
   */
  private warmUpSprites() {
    this.sprites = new KartSprites();
    const nearLod = lodIndexFor(VIEW.FOCAL / WORLD.CAM_DIST);
    const farLod = lodIndexFor(VIEW.FOCAL / 90);
    this.sprites.request(this.player.pilot, 'N', 0, nearLod, true);
    for (const k of this.karts) if (!k.isPlayer) this.sprites.request(k.pilot, 'N', 1, farLod, true);
    this.sprites.flush();
    for (const pose of ['L', 'R'] as const) this.sprites.request(this.player.pilot, pose, 0, nearLod);
    for (const k of this.karts) if (!k.isPlayer) this.sprites.request(k.pilot, 'N', 0, nearLod);
    for (const pitch of [1, 2]) {
      for (const k of this.karts) this.sprites.request(k.pilot, 'N', pitch, Math.max(farLod, 1));
    }
    for (const k of this.karts) {
      for (const lod of [0, 1, 2]) {
        for (const pitch of [0, 1, 2]) this.sprites.request(k.pilot, 'N', pitch, lod);
      }
    }
  }

  /** Cambia la resolución interna: redimensiona el lienzo y reconstruye lo que depende de ella. */
  private applyTier(tier: QualityTier) {
    this.tier = tier;
    setTier(tier);
    this.canvas.width = VIEW.W;
    this.canvas.height = VIEW.H;
    this.ctx.imageSmoothingEnabled = false;
    this.overlay = this.makeOverlay();
    if (this.world) this.renderer = new Mode7Renderer(this.world);
  }

  /** Viñeta suave en los bordes de la imagen. */
  private makeOverlay() {
    const { W, H, S } = VIEW;
    const c = document.createElement('canvas');
    c.width = W;
    c.height = H;
    const ctx = c.getContext('2d')!;
    const grad = ctx.createRadialGradient(W / 2, H * 0.6, 34 * S, W / 2, H * 0.52, 195 * S);
    grad.addColorStop(0, 'rgba(4, 16, 16, 0)');
    grad.addColorStop(0.6, 'rgba(4, 16, 16, 0.04)');
    grad.addColorStop(1, 'rgba(4, 16, 16, 0.4)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);
    return c;
  }

  private createWorld() {
    this.boxes = this.track.itemBoxes.map((p, i) => ({ x: p.x, y: p.y, active: true, respawn: 0, phase: i * 0.9 }));
    this.cans = this.track.nitroCans.map((p, i) => ({ x: p.x, y: p.y, active: true, respawn: 0, phase: i * 0.6 }));
    this.bananas = this.track.bananas.map((p) => ({ x: p.x, y: p.y, owner: 'track', armedAt: 0, life: Infinity }));
  }

  private createKart(pilot: Pilot, isPlayer: boolean, idx: number, lane: number): Kart {
    const p = this.track.points[idx];
    const x = p.x + p.nx * lane;
    const y = p.y + p.ny * lane;
    return {
      pilot,
      isPlayer,
      x,
      y,
      angle: p.angle,
      moveAngle: p.angle,
      speed: 0,
      idx,
      prevIdx: idx,
      laps: 0,
      lapStart: 0,
      lastLap: 0,
      bestLap: 0,
      finishTime: 0,
      finished: false,
      item: null,
      nitro: 0,
      boost: 0,
      spin: 0,
      spinAngle: 0,
      spinDir: 1,
      immune: 0,
      rescue: 0,
      wrongClock: 0,
      sector: 0,
      sectorSteps: 0,
      rescues: 0,
      driftHeld: false,
      driftHold: 0,
      steerSmooth: 0,
      boostPadCooldown: 0,
      boxCount: 0,
      baseLane: lane,
      aiSeed: Math.random() * 10,
      aiScale: 1,
    };
  }

  private createKarts() {
    const playerPilot = PILOT_BY_ID[this.opts.pilotId];
    const rivals = PILOTS.filter((p) => p.id !== playerPilot.id);
    const count = this.track.points.length;
    this.player = this.createKart(playerPilot, true, 9, 0);
    const grid = [
      { idx: Math.round(count * 0.013), lane: -13 },
      { idx: Math.round(count * 0.013), lane: 13 },
      { idx: Math.round(count * 0.024), lane: 0 },
    ];
    this.karts = [
      this.player,
      ...rivals.map((pilot, i) => this.createKart(pilot, false, grid[i].idx, grid[i].lane)),
    ];
    this.camX = this.player.x - Math.sin(this.player.angle) * WORLD.CAM_DIST;
    this.camY = this.player.y + Math.cos(this.player.angle) * WORLD.CAM_DIST;
    this.camYaw = this.player.angle;
  }

  private attachEvents() {
    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);
    window.addEventListener('pointerdown', this.resumeAudio, { passive: true });
    window.addEventListener('gamepadconnected', this.onPadConnected);
    window.addEventListener('gamepaddisconnected', this.onPadDisconnected);
  }

  private resumeAudio = () => {
    this.audio.init();
    this.audio.startEngine();
  };

  private onPadConnected = () => {
    this.gamepadConnected = true;
    this.audio.setDrift(false, 'asphalt');
  };

  private onPadDisconnected = () => {
    this.gamepadConnected = false;
  };

  private onKeyDown = (e: KeyboardEvent) => {
    const target = e.target as HTMLElement | null;
    if (target && ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)) return;
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) e.preventDefault();
    this.keys.add(e.code);
    if (e.code === 'Space' && !e.repeat) this.itemQueued = true;
    if ((e.code === 'Escape' || e.code === 'KeyP') && !e.repeat) this.opts.onPauseRequest();
  };

  private onKeyUp = (e: KeyboardEvent) => {
    this.keys.delete(e.code);
  };

  private getPad(): Gamepad | null {
    if (typeof navigator === 'undefined' || !navigator.getGamepads) return null;
    const pads = navigator.getGamepads();
    for (const pad of pads) if (pad && pad.connected) return pad;
    return null;
  }

  private readInput(): InputState {
    const keys = this.keys;
    let steer = (keys.has('ArrowRight') || keys.has('KeyD') ? 1 : 0) - (keys.has('ArrowLeft') || keys.has('KeyA') ? 1 : 0);
    let throttle = keys.has('ArrowUp') || keys.has('KeyW') ? 1 : 0;
    let brake = keys.has('ArrowDown') || keys.has('KeyS') ? 1 : 0;
    let drift = keys.has('ShiftLeft') || keys.has('ShiftRight');
    let nitro = keys.has('KeyN') || keys.has('KeyX');
    let item = this.itemQueued;
    this.itemQueued = false;

    if (this.touch.left) steer -= 1;
    if (this.touch.right) steer += 1;
    if (this.touch.brake) brake = Math.max(brake, 1);
    if (this.touch.drift) drift = true;
    if (this.touch.nitro) nitro = true;
    if (this.touch.item) item = true;
    if (this.opts.autoThrottle) throttle = Math.max(throttle, 1);

    const pad = this.getPad();
    if (pad) {
      this.gamepadConnected = true;
      const axis = pad.axes[0] ?? 0;
      if (Math.abs(axis) > 0.15) steer += axis;
      const dpadLeft = pad.buttons[14]?.pressed;
      const dpadRight = pad.buttons[15]?.pressed;
      if (dpadLeft) steer -= 1;
      if (dpadRight) steer += 1;
      throttle = Math.max(throttle, pad.buttons[7]?.value ?? 0);
      brake = Math.max(brake, pad.buttons[6]?.value ?? 0);
      drift = drift || Boolean(pad.buttons[0]?.pressed);
      const padItem = Boolean(pad.buttons[1]?.pressed);
      if (padItem && !this.padItemPrev) item = true;
      this.padItemPrev = padItem;
      nitro = nitro || Boolean(pad.buttons[2]?.pressed);
      const start = Boolean(pad.buttons[9]?.pressed);
      if (start && !this.padStartPrev) this.opts.onPauseRequest();
      this.padStartPrev = start;
    }
    return {
      steer: clamp(steer, -1, 1),
      throttle: clamp(throttle, 0, 1),
      brake: clamp(brake, 0, 1),
      drift,
      nitro,
      item,
    };
  }

  setPaused(paused: boolean) {
    this.paused = paused;
    if (paused) {
      this.audio.setDrift(false, 'asphalt');
      this.audio.updateEngine(0, 0, false);
    }
    this.lastFrame = performance.now();
    this.emitSnapshot();
  }

  setTouch(control: TouchControl, pressed: boolean) {
    if (!TOUCH_KEYS.includes(control)) return;
    this.touch[control] = pressed;
    if (control === 'item' && pressed) this.itemQueued = true;
  }

  resetTouch() {
    for (const k of TOUCH_KEYS) this.touch[k] = false;
    this.itemQueued = false;
  }

  setMuted(muted: boolean) {
    this.audio.setMuted(muted);
  }

  private loop = (time: number) => {
    if (this.destroyed) return;
    const raw = (time - this.lastFrame) / 1000;
    this.lastFrame = time;
    const dt = clamp(raw, 0.001, 0.05);
    const t0 = performance.now();
    this.sprites.pump(this.phase === 'racing' ? 2.5 : 6);
    if (!this.paused) {
      this.fps = this.fps * 0.93 + (1 / Math.max(0.001, raw)) * 0.07;
      const steps = this.opts.timeScale && this.opts.timeScale > 1 ? Math.round(this.opts.timeScale) : 1;
      for (let i = 0; i < steps; i++) this.update(dt);
      this.watchQuality(raw);
    }
    const t1 = performance.now();
    this.render(dt);
    const t2 = performance.now();
    this.perf.update += (t1 - t0 - this.perf.update) * 0.08;
    this.perf.render += (t2 - t1 - this.perf.render) * 0.08;
    this.raf = requestAnimationFrame(this.loop);
  };

  /** Baja un nivel gráfico si el equipo va a menos de ~40 fps durante varios segundos seguidos. */
  private watchQuality(raw: number) {
    if (!this.autoQuality || this.phase !== 'racing') return;
    if (raw > 0.025) this.slowClock += Math.min(raw, 0.1);
    else this.slowClock = Math.max(0, this.slowClock - raw * 2);
    if (this.slowClock > 2.5) {
      this.slowClock = 0;
      const lower = lowerTier(this.tier);
      if (lower) this.applyTier(lower);
    }
  }

  private stepPhysics(k: Kart, input: InputState, dt: number) {
    const spec = k.pilot.spec;
    k.boost = Math.max(0, k.boost - dt);
    k.spin = Math.max(0, k.spin - dt);
    k.immune = Math.max(0, k.immune - dt);
    k.boostPadCooldown = Math.max(0, k.boostPadCooldown - dt);
    if (k.rescue > 0) {
      k.rescue -= dt;
      if (k.rescue <= 0) this.respawn(k);
      return;
    }

    const surface = surfaceAt(this.world, k.x, k.y);
    if (surface === 'sea') {
      k.rescue = 1.05;
      k.rescues += 1;
      k.speed = 0;
      k.boost = 0;
      this.audio.splash();
      for (let i = 0; i < 22; i++) this.spawnSplash(k.x, k.y);
      return;
    }

    let nitroActive = false;
    if (input.nitro && k.nitro > 0 && k.spin <= 0) {
      nitroActive = true;
      k.nitro = Math.max(0, k.nitro - dt * 28);
      if (k.nitro <= 0) this.unlock('nitro-user');
    }

    const grip = SURFACE_GRIP[surface];
    const maxSpeed =
      WORLD.MAX_SPEED *
      spec.topSpeed *
      grip *
      (k.boost > 0 ? 1.3 : 1) *
      (nitroActive ? 1.16 : 1) *
      (k.isPlayer ? 1 : k.aiScale);

    if (k.spin > 0) {
      k.speed *= Math.max(0, 1 - 2.1 * dt);
      k.angle += k.spinDir * 5.6 * dt;
      k.spinAngle += k.spinDir * 5.6 * dt;
    } else {
      const speedRatio = clamp(k.speed / WORLD.MAX_SPEED, 0, 1.15);
      k.steerSmooth += (input.steer - k.steerSmooth) * clamp(dt * (k.isPlayer ? 11 : 7), 0, 1);
      const turnBase =
        WORLD.TURN *
        spec.turn *
        clamp(k.speed / 32, 0, 1) *
        (1 - 0.42 * speedRatio) *
        (1 - 0.12 * clamp(k.speed / 220, 0, 1));
      let turn = turnBase;
      let controlSteer = k.steerSmooth;

      // Derrape: giro extra y carga de mini-turbo.
      if (input.drift && k.speed > 42) {
        if (!k.driftHeld) k.driftHeld = true;
        if (Math.abs(controlSteer) > 0.12) {
          k.driftHold += dt * (0.7 + Math.abs(controlSteer) * 0.6);
          turn *= 1.34;
        }
      } else if (k.driftHeld) {
        this.releaseDrift(k);
      }

      k.angle += controlSteer * turn * dt;
      if (k.boost > 0) {
        k.speed += 72 * dt;
      }
      if (nitroActive) k.speed += 44 * dt;
      if (k.spin <= 0) {
        if (input.throttle > 0) {
          k.speed += WORLD.ACCEL * spec.accel * input.throttle * dt * Math.max(0.08, 1 - k.speed / (maxSpeed * 1.08));
        }
        if (input.brake > 0) {
          k.speed -= WORLD.BRAKE * input.brake * dt;
        }
        if (input.throttle <= 0 && input.brake <= 0) {
          k.speed -= (k.speed * 0.34 + 6) * dt;
        }
        k.speed -= (k.speed * 0.08 + 2) * dt;
        if (k.speed > maxSpeed) k.speed = Math.max(maxSpeed, k.speed - (k.speed - maxSpeed) * 4.5 * dt);
        k.speed = clamp(k.speed, 0, WORLD.MAX_SPEED * 1.75);
      }
      k.driftHeld = input.drift && k.speed > 42;
      if (k.driftHeld) {
        k.driftHold = Math.min(2.2, k.driftHold);
        // Deslizamiento visual leve hacia el exterior de la curva.
        if (Math.abs(controlSteer) > 0.2) {
          k.x -= Math.cos(k.angle) * controlSteer * dt * 7;
          k.y -= Math.sin(k.angle) * controlSteer * dt * 7;
        }
      }
    }

    // Movimiento en el mundo. Sobre hielo la dirección real sigue al morro con retraso.
    k.moveAngle += angleDelta(k.moveAngle, k.angle) * clamp(dt * SURFACE_FOLLOW[surface], 0, 1);
    k.x += Math.sin(k.moveAngle) * k.speed * dt;
    k.y -= Math.cos(k.moveAngle) * k.speed * dt;
    k.spinAngle += (k.spin > 0 ? k.spinDir * 4.5 : 0) * dt;

    // Zonas de impulso pintadas en el asfalto.
    for (const pad of this.track.boostPads) {
      if (k.boostPadCooldown <= 0 && Math.hypot(k.x - pad.x, k.y - pad.y) < PICKUP.BOOST_PAD) {
        k.boost = Math.max(k.boost, 1.1);
        k.boostPadCooldown = 1.6;
        if (k.isPlayer) {
          this.audio.boost();
          this.shake = Math.max(this.shake, 3);
          this.spawnBoost(k);
        }
      }
    }

    // Partículas de derrape y turbo.
    this.driftEmitClock += dt;
    if (k.driftHeld && k.speed > 50 && Math.abs(input.steer) > 0.1) {
      if (this.driftEmitClock > 0.025 && this.particles.length < 220) {
        this.driftEmitClock = 0;
        const color = k.driftHold > 1.6 ? '#ff5a2e' : k.driftHold > 0.8 ? '#ffab32' : '#ffe765';
        this.spawnDrift(k, color, surface);
      }
    }
    if (k.boost > 0 || nitroActive) {
      this.boostEmitClock += dt;
      if (this.boostEmitClock > 0.045 && this.particles.length < 220) {
        this.boostEmitClock = 0;
        this.spawnBoost(k);
      }
    }

    // Sincroniza el progreso con el punto más cercano del circuito.
    const near = nearestPoint(this.track.points, k.x, k.y);
    const total = this.track.points.length;
    if (!k.finished) {
      const forward = Math.sin(k.angle) * Math.sin(near.index >= 0 ? this.track.points[near.index].angle : 0) +
        -Math.cos(k.angle) * -Math.cos(this.track.points[near.index].angle);
      // Sectores: un salto de hasta un sector se tolera (recortes pequeños); más allá no suma.
      const sector = Math.min(SECTORS - 1, Math.floor((near.index / total) * SECTORS));
      const step = (sector - k.sector + SECTORS) % SECTORS;
      if (step === 1 || step === 2) {
        k.sector = sector;
        k.sectorSteps += step;
      }
      if (k.prevIdx > total * 0.7 && near.index < total * 0.3 && forward > 0 && this.raceTime - k.lapStart > 8) {
        if (k.sectorSteps >= SECTORS) {
          k.sectorSteps = 0;
          this.crossLine(k);
        } else if (k.isPlayer) {
          this.rejectClock = 2.4;
        }
      }
      k.prevIdx = near.index;
      k.idx = near.index;
      k.wrongClock = forward < -0.3 && k.speed > 25 ? k.wrongClock + dt : 0;
    }

    if (k.isPlayer && nitroActive) this.unlock('nitro-user');
  }

  private releaseDrift(k: Kart) {
    const lvl = k.driftHold;
    if (lvl > 0.8) {
      const long = lvl >= 1.6;
      k.boost = Math.max(k.boost, (long ? 1.65 : 1.02) * k.pilot.spec.boostBonus);
      if (k.isPlayer) {
        this.audio.driftRelease(long ? 2 : 1);
        this.shake = Math.max(this.shake, long ? 3.4 : 1.6);
        this.unlock('first-drift');
        this.spawnBoost(k);
      }
    }
    k.driftHeld = false;
    k.driftHold = 0;
  }

  private crossLine(k: Kart) {
    if (k.laps >= this.def.laps) return;
    k.laps += 1;
    const lapTime = this.raceTime - k.lapStart;
    k.lastLap = lapTime;
    k.lapStart = this.raceTime;
    if (lapTime > 0 && (k.bestLap === 0 || lapTime < k.bestLap)) k.bestLap = lapTime;
    if (k.isPlayer) {
      this.audio.lap();
      if (lapTime > 0 && lapTime < 38) this.unlock('lap-machine');
    }
    if (k.laps >= this.def.laps) {
      k.finished = true;
      k.finishTime = this.raceTime;
      if (k.isPlayer) this.finishRace();
    }
  }

  private respawn(k: Kart) {
    const near = nearestPoint(this.track.points, k.x, k.y);
    const p = this.track.points[near.index];
    k.x = p.x;
    k.y = p.y;
    k.angle = p.angle;
    k.moveAngle = p.angle;
    k.speed = 0;
    k.driftHeld = false;
    k.driftHold = 0;
    k.steerSmooth = 0;
    k.prevIdx = near.index;
    k.idx = near.index;
    k.immune = 1.4;
  }

  private update(dt: number) {
    if (this.phase === 'finished') {
      this.updateParticles(dt);
      this.shake = Math.max(0, this.shake - dt * 14);
      return;
    }

    if (this.phase === 'countdown') {
      this.countdown -= dt;
      const label = Math.ceil(this.countdown);
      if (label !== this.countdownLast && this.countdown > 0) {
        this.countdownLast = label;
        this.audio.countdown(false);
      }
      if (this.countdown <= 0) {
        this.phase = 'racing';
        this.countdown = 0;
        this.goFlash = 0.9;
        this.audio.countdown(true);
        this.audio.startEngine();
      }
      this.updateParticles(dt);
      this.snapshotClock += dt;
      if (this.snapshotClock > 0.12) {
        this.snapshotClock = 0;
        this.emitSnapshot();
      }
      return;
    }

    this.goFlash = Math.max(0, this.goFlash - dt);
    this.raceTime += dt;
    const input = this.opts.demo ? this.aiInput(this.player, dt) : this.readInput();
    if (!this.opts.demo && input.item) this.usePlayerItem();

    for (const k of this.karts) {
      if (k.finished && !k.isPlayer) {
        k.speed *= 0.995;
      }
      const isPlayer = k.isPlayer;
      if (isPlayer) {
        this.stepPhysics(k, input, dt);
      } else {
        this.stepPhysics(k, this.aiInput(k, dt), dt);
      }
    }

    this.bumpClock = Math.max(0, this.bumpClock - dt);
    this.rejectClock = Math.max(0, this.rejectClock - dt);
    this.handleKartCollisions();
    this.updatePickups(dt);
    this.updateProjectiles(dt);
    this.updateParticles(dt);
    this.updateCamera(dt);
    this.updateStandingsAchievements();

    this.shake = Math.max(0, this.shake - dt * 12);
    this.audio.updateEngine(
      clamp(this.player.speed / WORLD.MAX_SPEED, 0, 1),
      this.player.driftHeld ? 0.4 : 1,
      OFFROAD.has(surfaceAt(this.world, this.player.x, this.player.y)),
    );
    this.audio.setDrift(this.player.driftHeld && this.player.speed > 50, this.playerSurface());

    this.snapshotClock += dt;
    if (this.snapshotClock > 0.085) {
      this.snapshotClock = 0;
      this.emitSnapshot();
    }
  }

  private playerSurface(): 'asphalt' | 'curb' | 'grass' | 'sand' {
    return audioSurface(surfaceAt(this.world, this.player.x, this.player.y));
  }

  private aiInput(k: Kart, dt: number): InputState {
    if (k.spin > 0 || k.rescue > 0) return { steer: 0, throttle: 0, brake: 0, drift: false, nitro: false, item: false };
    const total = this.track.points.length;
    const lookAhead = clamp(Math.round(15 + k.speed * 0.1), 15, 38);
    const targetPoint = this.track.points[(k.idx + lookAhead) % total];
    const lane = k.baseLane + Math.sin(this.raceTime * 0.55 + k.aiSeed) * 4.5;
    const tx = targetPoint.x + targetPoint.nx * lane;
    const ty = targetPoint.y + targetPoint.ny * lane;
    const targetAngle = Math.atan2(tx - k.x, -(ty - k.y));
    const diff = angleDelta(k.angle, targetAngle);
    const steer = clamp(diff * 2.2, -1, 1);

    const playerProgress = this.player.laps * total + this.player.idx;
    const diffProgress = (k.laps * total + k.idx - playerProgress) / total;
    const band = DIFFICULTY_BY_ID[this.opts.difficulty].rubber;
    let rubber = 1;
    if (diffProgress > 0.035) rubber = 1 - Math.min(0.13, diffProgress * 0.42 * band);
    else if (diffProgress < -0.035) rubber = 1 + Math.min(0.15, -diffProgress * 0.62 * band);
    const targetSpeed =
      DIFFICULTY_BY_ID[this.opts.difficulty].aiBase * k.pilot.spec.topSpeed * rubber;
    k.aiScale = clamp(targetSpeed / WORLD.MAX_SPEED, 0.52, 1.12);

    // Velocidad segura según la curvatura (el perfil ya incluye la frenada anticipada).
    const safe = this.track.speedProfile[(k.idx + 8) % total] * DIFFICULTY_BY_ID[this.opts.difficulty].cornering;
    const desired = Math.min(targetSpeed * 1.08, safe);
    let brake = 0;
    let throttle = 1;
    if (k.speed > desired + 3) {
      brake = clamp((k.speed - desired) / 30, 0, 0.75);
      throttle = 0;
    }
    const drift = Math.abs(diff) > 0.32 && k.speed > 82;

    // Uso de objetos de la IA: sencillo y legible.
    if (k.item && Math.random() < dt * 0.35) {
      if (k.item === 'turbo') {
        k.boost = Math.max(k.boost, 1.05);
        this.spawnBoost(k);
      } else if (k.item === 'banana') {
        this.dropBanana(k);
      } else if (k.item === 'bowling') {
        this.fireBowling(k);
      }
      k.item = null;
    }

    return { steer, throttle, brake, drift, nitro: false, item: false };
  }

  /**
   * Choque entre karts: se separan y se intercambia velocidad a lo largo de la normal
   * (masas iguales, rebote del 25 %). Así el de atrás pierde velocidad y el de delante
   * la gana, y no se frenan mutuamente de forma indefinida.
   */
  private handleKartCollisions() {
    for (let i = 0; i < this.karts.length; i++) {
      for (let j = i + 1; j < this.karts.length; j++) {
        const a = this.karts[i];
        const b = this.karts[j];
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const dist = Math.hypot(dx, dy);
        if (dist < 0.0001 || dist >= KART.COLLIDE) continue;
        const nx = dx / dist;
        const ny = dy / dist;
        const overlap = (KART.COLLIDE - dist) / 2;
        a.x -= nx * overlap;
        a.y -= ny * overlap;
        b.x += nx * overlap;
        b.y += ny * overlap;

        const hax = Math.sin(a.angle);
        const hay = -Math.cos(a.angle);
        const hbx = Math.sin(b.angle);
        const hby = -Math.cos(b.angle);
        const closing = (b.speed * hbx - a.speed * hax) * nx + (b.speed * hby - a.speed * hay) * ny;
        if (closing >= 0) continue;
        const impulse = -(1 + 0.25) * closing * 0.5;
        const avx = a.speed * hax - impulse * nx;
        const avy = a.speed * hay - impulse * ny;
        const bvx = b.speed * hbx + impulse * nx;
        const bvy = b.speed * hby + impulse * ny;
        a.speed = Math.max(0, avx * hax + avy * hay);
        b.speed = Math.max(0, bvx * hbx + bvy * hby);

        const playerInvolved = a.isPlayer || b.isPlayer;
        if (playerInvolved && -closing > 14 && this.bumpClock <= 0) {
          this.bumpClock = 0.3;
          this.shake = Math.max(this.shake, Math.min(4.2, -closing * 0.12));
          this.audio.collision();
          for (let p = 0; p < 8; p++) this.spawnImpact(a.isPlayer ? b : a);
        }
      }
    }
  }

  private giveItem(k: Kart) {
    const position = this.sortKarts().indexOf(k) + 1;
    const bucket = position <= 1 ? 'front' : position >= 4 ? 'back' : 'mid';
    const list = BOX_WEIGHTS[bucket];
    k.item = list[Math.floor(Math.random() * list.length)];
  }

  private updatePickups(dt: number) {
    for (const box of this.boxes) {
      if (!box.active) {
        box.respawn -= dt;
        if (box.respawn <= 0) box.active = true;
        continue;
      }
      if (Math.hypot(this.player.x - box.x, this.player.y - box.y) < PICKUP.BOX_PLAYER) {
        box.active = false;
        box.respawn = 4.2;
        this.giveItem(this.player);
        this.player.boxCount += 1;
        this.audio.box();
        if (this.player.boxCount >= 5) this.unlock('box-hunter');
        for (let i = 0; i < 12; i++) this.spawnBurst(box.x, box.y, '#d9f45a');
        continue;
      }
      for (const k of this.karts) {
        if (k.isPlayer || k.item) continue;
        if (Math.hypot(k.x - box.x, k.y - box.y) < PICKUP.BOX_AI) {
          box.active = false;
          box.respawn = 4.2;
          this.giveItem(k);
          break;
        }
      }
    }

    for (const can of this.cans) {
      if (!can.active) {
        can.respawn -= dt;
        if (can.respawn <= 0) can.active = true;
        continue;
      }
      if (Math.hypot(this.player.x - can.x, this.player.y - can.y) < PICKUP.CAN_PLAYER) {
        can.active = false;
        can.respawn = 12;
        this.player.nitro = Math.min(100, this.player.nitro + 20 * this.player.pilot.spec.nitroGain);
        this.audio.pickup();
        for (let i = 0; i < 7; i++) this.spawnBurst(can.x, can.y, '#76e9f0');
        continue;
      }
      for (const k of this.karts) {
        if (k.isPlayer) continue;
        if (Math.hypot(k.x - can.x, k.y - can.y) < PICKUP.CAN_AI) {
          can.active = false;
          can.respawn = 12;
          k.boost = Math.max(k.boost, 0.45);
          break;
        }
      }
    }

    for (let i = this.bananas.length - 1; i >= 0; i--) {
      const banana = this.bananas[i];
      if (this.raceTime < banana.armedAt) continue;
      let hit = false;
      for (const k of this.karts) {
        if (k.immune > 0 || k.spin > 0) continue;
        if (banana.owner === k.pilot.id && this.raceTime - banana.armedAt < 1.4) continue;
        if (Math.hypot(k.x - banana.x, k.y - banana.y) < PICKUP.BANANA) {
          this.spinKart(k);
          hit = true;
          break;
        }
      }
      if (hit) this.bananas.splice(i, 1);
    }
  }

  private spinKart(k: Kart) {
    k.spin = 1.05;
    k.spinDir = Math.random() > 0.5 ? 1 : -1;
    k.spinAngle = 0;
    k.speed *= 0.25;
    k.boost = 0;
    k.immune = 1.55;
    k.driftHeld = false;
    k.driftHold = 0;
    if (k.isPlayer) {
      this.spinCamYaw = this.camYaw;
      this.audio.spin();
      this.shake = Math.max(this.shake, 6);
    }
    for (let i = 0; i < 10; i++) this.spawnBurst(k.x, k.y, '#f5d53d');
  }

  private usePlayerItem() {
    const k = this.player;
    if (!k.item || k.finished) return;
    if (k.item === 'turbo') {
      k.boost = Math.max(k.boost, 1.7);
      this.audio.boost();
      this.shake = Math.max(this.shake, 2.5);
    } else if (k.item === 'banana') {
      this.dropBanana(k);
      this.audio.pickup();
    } else {
      this.fireBowling(k);
      this.audio.boost();
    }
    k.item = null;
  }

  private dropBanana(k: Kart) {
    this.bananas.push({
      x: k.x - Math.sin(k.angle) * 10,
      y: k.y + Math.cos(k.angle) * 10,
      owner: k.pilot.id,
      armedAt: this.raceTime + 0.25,
      life: 40,
    });
  }

  private fireBowling(k: Kart) {
    this.projectiles.push({
      x: k.x + Math.sin(k.angle) * 9,
      y: k.y - Math.cos(k.angle) * 9,
      angle: k.angle,
      speed: 250,
      owner: k.pilot.id,
      ownerIsPlayer: k.isPlayer,
      life: 2.5,
    });
  }

  private updateProjectiles(dt: number) {
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const proj = this.projectiles[i];
      proj.x += Math.sin(proj.angle) * proj.speed * dt;
      proj.y -= Math.cos(proj.angle) * proj.speed * dt;
      proj.life -= dt;
      let remove = proj.life <= 0 || isVoid(matAt(this.world, proj.x, proj.y));
      for (const k of this.karts) {
        if (k.pilot.id === proj.owner || k.immune > 0) continue;
        if (Math.hypot(k.x - proj.x, k.y - proj.y) < PICKUP.BOWL) {
          this.spinKart(k);
          remove = true;
          break;
        }
      }
      if (remove) this.projectiles.splice(i, 1);
    }
  }

  private updateStandingsAchievements() {
    const sorted = this.sortKarts();
    sorted.forEach((k) => {
      if (!k.isPlayer) return;
      const index = sorted.indexOf(k);
      sorted.slice(index + 1).forEach((behind) => {
        if (!behind.finished) this.passed.add(behind.pilot.id);
      });
    });
    if (this.passed.size >= 3) this.unlock('sweeper');
  }

  private sortKarts(): Kart[] {
    return [...this.karts].sort((a, b) => {
      if (a.finished && b.finished) return a.finishTime - b.finishTime;
      if (a.finished) return -1;
      if (b.finished) return 1;
      return b.laps * this.track.points.length + b.idx - (a.laps * this.track.points.length + a.idx);
    });
  }

  private unlock(id: string) {
    if (this.unlocked.has(id)) return;
    this.unlocked.add(id);
    this.audio.achievement();
    this.opts.onAchievement(id);
  }

  private finishRace() {
    if (this.finishSent) return;
    this.finishSent = true;
    this.phase = 'finished';
    this.audio.stopEngine();
    this.audio.setDrift(false, 'asphalt');
    this.audio.finish();
    this.player.item = null;
    const total = this.track.points.length;
    // Estimación justa del tiempo restante de quien aún no ha cruzado la meta.
    for (const k of this.karts) {
      if (k.finished) continue;
      const remaining = this.def.laps * total - (k.laps * total + k.idx);
      const avgPointsPerSec = Math.max(12, k.speed / this.track.step);
      const estimate = this.raceTime + Math.max(0.8, remaining / avgPointsPerSec);
      k.finished = true;
      k.finishTime = estimate;
    }
    const order = this.sortKarts();
    const playerPosition = order.findIndex((k) => k.isPlayer) + 1;
    if (playerPosition === 1) this.unlock('champion');
    const standings: Standing[] = order.map((k) => ({
      id: k.pilot.id,
      name: k.pilot.name,
      color: k.pilot.color,
      lap: this.def.laps,
      progress: k.laps * total + k.idx,
      finished: true,
      time: k.finishTime,
      isPlayer: k.isPlayer,
      bestLap: k.bestLap,
    }));
    this.emitSnapshot();
    this.opts.onFinish({
      standings,
      playerPosition,
      totalTime: this.raceTime,
      bestLap: this.player.bestLap,
      lastLap: this.player.lastLap,
      trackId: this.def.id,
    });
  }

  private updateCamera(dt: number) {
    // Durante un trompo la cámara se queda fija y es el kart el que gira.
    const targetYaw = this.player.spin > 0 ? this.spinCamYaw : this.player.angle;
    this.camYaw += angleDelta(this.camYaw, targetYaw) * clamp(dt * 7.5, 0, 1);
    const tx = this.player.x - Math.sin(this.camYaw) * WORLD.CAM_DIST;
    const ty = this.player.y + Math.cos(this.camYaw) * WORLD.CAM_DIST;
    this.camX += (tx - this.camX) * clamp(dt * 13, 0, 1);
    this.camY += (ty - this.camY) * clamp(dt * 13, 0, 1);
  }

  private spawnDrift(k: Kart, color: string, surface: Surface) {
    const side = Math.random() > 0.5 ? 1 : -1;
    const rx = Math.cos(k.angle) * 6 * side;
    const ry = Math.sin(k.angle) * 6 * side;
    this.particles.push({
      x: k.x - Math.sin(k.angle) * 6 + rx,
      y: k.y + Math.cos(k.angle) * 6 + ry,
      z: 1,
      vx: (Math.random() - 0.5) * 26,
      vy: (Math.random() - 0.5) * 26,
      vz: 10 + Math.random() * 24,
      life: 0.35,
      maxLife: 0.35,
      size: OFFROAD.has(surface) ? 2.6 : 1.5,
      color: OFFROAD.has(surface) ? (surface === 'snow' || surface === 'deepsnow' ? '#eef6ff' : '#bda879') : color,
      gravity: 110,
    });
  }

  private spawnBoost(k: Kart) {
    for (let i = 0; i < 2; i++) {
      const bx = k.x - Math.sin(k.angle) * (10 + i * 3);
      const by = k.y + Math.cos(k.angle) * (10 + i * 3);
      this.particles.push({
        x: bx + (Math.random() - 0.5) * 6,
        y: by + (Math.random() - 0.5) * 6,
        z: 2.5,
        vx: (Math.random() - 0.5) * 14,
        vy: (Math.random() - 0.5) * 14,
        vz: 3,
        life: 0.3,
        maxLife: 0.3,
        size: 2.1,
        color: Math.random() > 0.4 ? '#ffcb52' : '#ff6e34',
        gravity: -20,
      });
    }
  }

  private spawnImpact(k: Kart) {
    this.particles.push({
      x: k.x + (Math.random() - 0.5) * 8,
      y: k.y + (Math.random() - 0.5) * 8,
      z: 3,
      vx: (Math.random() - 0.5) * 32,
      vy: (Math.random() - 0.5) * 32,
      vz: 18 + Math.random() * 25,
      life: 0.32,
      maxLife: 0.32,
      size: 2,
      color: '#fff2bd',
      gravity: 120,
    });
  }

  private spawnBurst(x: number, y: number, color: string) {
    this.particles.push({
      x: x + (Math.random() - 0.5) * 8,
      y: y + (Math.random() - 0.5) * 8,
      z: 2,
      vx: (Math.random() - 0.5) * 38,
      vy: (Math.random() - 0.5) * 38,
      vz: 22 + Math.random() * 32,
      life: 0.42,
      maxLife: 0.42,
      size: 1.7,
      color,
      gravity: 150,
    });
  }

  private spawnSplash(x: number, y: number) {
    this.particles.push({
      x: x + (Math.random() - 0.5) * 14,
      y: y + (Math.random() - 0.5) * 14,
      z: 1,
      vx: (Math.random() - 0.5) * 34,
      vy: (Math.random() - 0.5) * 34,
      vz: 28 + Math.random() * 30,
      life: 0.55,
      maxLife: 0.55,
      size: 2.2,
      color: Math.random() > 0.4 ? '#d8f7ee' : '#8ee0df',
      gravity: 130,
    });
  }

  private updateParticles(dt: number) {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life -= dt;
      if (p.life <= 0) {
        this.particles.splice(i, 1);
        continue;
      }
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.z += p.vz * dt;
      p.vz -= p.gravity * dt;
      if (p.z < 0) {
        p.z = 0;
        p.vz *= -0.25;
      }
    }
  }

  private emitSnapshot() {
    if (this.destroyed || !this.track) return;
    const total = this.track.points.length;
    const order = this.sortKarts();
    const position = order.findIndex((k) => k.isPlayer) + 1;
    const standings: Standing[] = order.map((k) => ({
      id: k.pilot.id,
      name: k.pilot.name,
      color: k.pilot.color,
      lap: Math.min(this.def.laps, k.laps + 1),
      progress: k.laps * total + k.idx,
      finished: k.finished,
      time: k.finished ? k.finishTime : this.raceTime,
      isPlayer: k.isPlayer,
      bestLap: k.bestLap,
    }));
    const minimap = this.karts.map((k) => {
      const m = worldToMinimap(this.track, k.x, k.y);
      return { id: k.pilot.id, x: m.x, y: m.y, color: k.pilot.color, isPlayer: k.isPlayer };
    });
    const countdownLabel =
      this.phase === 'countdown'
        ? String(Math.max(1, Math.ceil(this.countdown)))
        : this.phase === 'racing' && this.goFlash > 0
          ? '¡YA!'
          : '';
    this.opts.onSnapshot({
      phase: this.phase,
      countdown: this.countdown,
      countdownLabel,
      speedKmh: Math.round(this.player.speed * 0.8),
      lap: Math.min(this.def.laps, this.player.laps + 1),
      totalTime: this.raceTime,
      lastLap: this.player.lastLap,
      bestLap: this.player.bestLap,
      position,
      nitro: Math.round(this.player.nitro),
      item: this.player.item,
      drifting: this.player.driftHeld,
      driftHold: this.player.driftHold,
      boost: this.player.boost,
      surface: surfaceAt(this.world, this.player.x, this.player.y),
      wrongWay: this.player.wrongClock > 1.4,
      lapRejected: this.rejectClock > 0,
      tier: this.tier,
      standings,
      minimap,
      gamepad: this.gamepadConnected,
      fps: Math.round(this.fps),
      totalLaps: this.def.laps,
      rescuing: this.player.rescue > 0,
    });
  }

  private render(dt: number) {
    if (this.destroyed) return;
    const ctx = this.ctx;
    const shake = this.shake;
    const jx = shake > 0 ? (Math.random() - 0.5) * shake : 0;
    const jy = shake > 0 ? (Math.random() - 0.5) * shake * 0.6 : 0;
    const camera = {
      x: this.camX + jx,
      y: this.camY + jy,
      yaw: this.camYaw + (shake > 0 ? (Math.random() - 0.5) * 0.008 : 0),
      shake,
    };
    this.renderer.render(ctx, camera, dt);

    // Todo lo que se ve en el mundo (props, recogibles, karts y partículas) entra en una sola
    // lista y se pinta de lejos a cerca según la profundidad en el eje de la cámara.
    type Call = { depth: number; draw: () => void };
    const calls: Call[] = [];
    const visibilityCut = 760;
    const sinYaw = Math.sin(camera.yaw);
    const cosYaw = Math.cos(camera.yaw);
    const dist2 = (x: number, y: number) => (x - camera.x) ** 2 + (y - camera.y) ** 2;
    const depthOf = (x: number, y: number) => (x - camera.x) * sinYaw - (y - camera.y) * cosYaw;

    for (const d of this.world.decorations) {
      if (dist2(d.x, d.y) > visibilityCut * visibilityCut) continue;
      const sprite = getSprite(d.type);
      calls.push({
        depth: depthOf(d.x, d.y),
        draw: () => {
          drawWorldSprite(ctx, sprite, camera, d.x, d.y, (PROP_WIDTH[d.type] ?? 12) * d.scale);
        },
      });
    }

    for (const box of this.boxes) {
      if (!box.active || dist2(box.x, box.y) > 500 * 500) continue;
      const bob = Math.sin(this.raceTime * 2.2 + box.phase) * 1.2;
      calls.push({
        depth: depthOf(box.x, box.y),
        draw: () => {
          drawWorldSprite(ctx, propSprite('box'), camera, box.x, box.y, PICKUP_WIDTH.box, { lift: 3 + bob });
        },
      });
    }
    for (const can of this.cans) {
      if (!can.active || dist2(can.x, can.y) > 420 * 420) continue;
      const bob = Math.sin(this.raceTime * 2.8 + can.phase) * 0.7;
      calls.push({
        depth: depthOf(can.x, can.y),
        draw: () => drawWorldSprite(ctx, propSprite('can'), camera, can.x, can.y, PICKUP_WIDTH.can, { lift: 1.5 + bob }),
      });
    }
    for (const banana of this.bananas) {
      if (dist2(banana.x, banana.y) > 350 * 350) continue;
      calls.push({
        depth: depthOf(banana.x, banana.y),
        draw: () => drawWorldSprite(ctx, propSprite('banana'), camera, banana.x, banana.y, PICKUP_WIDTH.banana),
      });
    }
    for (const proj of this.projectiles) {
      if (dist2(proj.x, proj.y) > 380 * 380) continue;
      calls.push({
        depth: depthOf(proj.x, proj.y),
        draw: () => drawWorldSprite(ctx, propSprite('bowl'), camera, proj.x, proj.y, PICKUP_WIDTH.bowl, { lift: 1 }),
      });
    }
    for (const k of this.karts) {
      if (!k.isPlayer && dist2(k.x, k.y) > 500 * 500) continue;
      calls.push({
        depth: depthOf(k.x, k.y),
        draw: () => (k.isPlayer ? this.drawPlayer(ctx, camera) : this.drawKart(ctx, k, camera)),
      });
    }
    for (const particle of this.particles) {
      calls.push({
        depth: depthOf(particle.x, particle.y),
        draw: () => this.drawParticle(ctx, camera, particle),
      });
    }

    calls.sort((a, b) => b.depth - a.depth);
    for (const call of calls) call.draw();

    ctx.drawImage(this.overlay, 0, 0);
    if (this.player.boost > 0 || this.player.nitro > 0) {
      const intensity = this.player.boost > 0 ? 0.26 : 0.12;
      const { W, H, S } = VIEW;
      const grad = ctx.createLinearGradient(0, H - 50 * S, 0, H);
      grad.addColorStop(0, 'rgba(255, 190, 64, 0)');
      grad.addColorStop(1, `rgba(255, 168, 54, ${intensity})`);
      ctx.fillStyle = grad;
      ctx.fillRect(0, H - 50 * S, W, 50 * S);
      ctx.strokeStyle = 'rgba(255, 246, 200, .25)';
      ctx.lineWidth = 0.8 * S;
      for (let i = 0; i < 8; i++) {
        const side = i % 2 === 0 ? 0 : 1;
        const x = (side === 0 ? 4 + ((i * 31 + this.raceTime * 220) % 52) : 320 - 4 - ((i * 27 + this.raceTime * 190) % 52)) * S;
        const y = (70 + ((i * 29) % 80)) * S;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x + (side === 0 ? 12 : -12) * S, y + 2 * S);
        ctx.stroke();
      }
    }
    if (this.phase === 'finished') {
      ctx.fillStyle = 'rgba(8, 23, 20, .18)';
      ctx.fillRect(0, 0, VIEW.W, VIEW.H);
    }
  }

  /** Ángulo del kart respecto a la línea de visión de la cámara (0 = visto desde atrás). */
  private relativeAngle(k: Kart, camera: { x: number; y: number }) {
    return k.angle - Math.atan2(k.x - camera.x, -(k.y - camera.y));
  }

  /** Sombra elíptica sobre el suelo, orientada con el kart y con borde difuso. */
  private drawShadow(
    ctx: CanvasRenderingContext2D,
    p: { x: number; y: number; scale: number; forward: number },
    rel: number,
    strength: number,
  ) {
    const squash = WORLD.CAM_H / p.forward;
    ctx.save();
    ctx.transform(p.scale, 0, 0, -p.scale * squash, p.x, p.y);
    ctx.fillStyle = `rgba(8, 18, 18, ${0.15 * strength})`;
    ctx.beginPath();
    ctx.ellipse(0, 0, 3.9, 5.6, -rel, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = `rgba(8, 18, 18, ${0.2 * strength})`;
    ctx.beginPath();
    ctx.ellipse(0, 0, 3, 4.5, -rel, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  private drawKart(ctx: CanvasRenderingContext2D, k: Kart, camera: { x: number; y: number; yaw: number; shake: number }) {
    const p = project(camera, k.x, k.y);
    if (!p.visible || p.scale < 0.3) return;
    const pitchIdx = pitchIndexFor(p.forward);
    const lodIdx = lodIndexFor(p.scale);
    this.sprites.request(k.pilot, 'N', pitchIdx, lodIdx);
    const atlas = this.sprites.best(k.pilot.id, 'N', pitchIdx, lodIdx);
    const rel = this.relativeAngle(k, camera);
    this.drawShadow(ctx, p, rel, 1);
    if (atlas) KartSprites.draw(ctx, atlas, rel, p.x, p.y, p.scale);
  }

  private drawPlayer(ctx: CanvasRenderingContext2D, camera: { x: number; y: number; yaw: number; shake: number }) {
    const k = this.player;
    const p = project(camera, k.x, k.y);
    if (!p.visible) return;
    const pitchIdx = pitchIndexFor(p.forward);
    const lodIdx = lodIndexFor(p.scale);
    const pose = k.spin > 0 ? 'N' : poseKeyFor(k.steerSmooth);
    const atlas = this.sprites.best(k.pilot.id, pose, pitchIdx, lodIdx);
    const rel = this.relativeAngle(k, camera);
    const bounce = Math.sin(this.raceTime * 21) * Math.min(0.8, k.speed / 200) * (p.scale / 8);
    this.drawShadow(ctx, p, rel, 1.1);

    // Llamas por los dos escapes (salen hacia atrás, es decir, hacia la cámara).
    if (k.boost > 0 || k.nitro > 0.2) {
      const flame = k.boost > 0 ? '#ffb23e' : '#6ee7ff';
      const length = (1.2 + Math.sin(this.raceTime * 40) * 0.4 + (k.boost > 0 ? 1.7 : 0)) * p.scale;
      for (const side of [-1, 1]) {
        const fx = p.x + side * 0.9 * p.scale;
        const fy = p.y + 0.5 * p.scale;
        ctx.fillStyle = flame;
        ctx.beginPath();
        ctx.moveTo(fx - 0.45 * p.scale, fy);
        ctx.lineTo(fx + side * 0.15 * p.scale, fy + length);
        ctx.lineTo(fx + 0.45 * p.scale, fy);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = 'rgba(255, 252, 205, .85)';
        ctx.beginPath();
        ctx.arc(fx, fy + 0.15 * p.scale, 0.38 * p.scale, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    if (!atlas) return;
    ctx.save();
    ctx.translate(p.x, p.y + bounce);
    KartSprites.draw(ctx, atlas, rel, 0, 0, p.scale);
    ctx.restore();
  }

  private drawParticle(
    ctx: CanvasRenderingContext2D,
    camera: { x: number; y: number; yaw: number; shake: number },
    particle: Particle,
  ) {
    const p = project(camera, particle.x, particle.y);
    if (!p.visible) return;
    const alpha = clamp(particle.life / particle.maxLife, 0, 1);
    const size = Math.max(0.7, particle.size * p.scale * 0.34);
    const y = p.y - particle.z * p.scale;
    ctx.globalAlpha = alpha;
    ctx.fillStyle = particle.color;
    ctx.fillRect(p.x - size / 2, y - size, size, size);
    ctx.globalAlpha = 1;
  }

  destroy() {
    this.destroyed = true;
    cancelAnimationFrame(this.raf);
    window.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('keyup', this.onKeyUp);
    window.removeEventListener('pointerdown', this.resumeAudio);
    window.removeEventListener('gamepadconnected', this.onPadConnected);
    window.removeEventListener('gamepaddisconnected', this.onPadDisconnected);
    this.audio.dispose();
  }
}

// Utilidades exportadas para la interfaz.
export { formatTime };
export const TOTAL_LAPS = WORLD.LAPS;
