export type PilotId = 'pingui' | 'nu' | 'draco' | 'pio';
export type ItemId = 'turbo' | 'banana' | 'bowling';
export type Difficulty = 'paseo' | 'piloto' | 'leyenda';
export type Surface = 'asphalt' | 'curb' | 'grass' | 'sand' | 'sea' | 'boost';

export interface PilotSpec {
  topSpeed: number;
  accel: number;
  turn: number;
  driftCharge: number;
  nitroGain: number;
  boostBonus: number;
}

export interface Pilot {
  id: PilotId;
  name: string;
  animal: string;
  number: string;
  color: string;
  dark: string;
  soft: string;
  portrait: string;
  tagline: string;
  role: string;
  ability: string;
  abilityDetail: string;
  stats: { velocidad: number; aceleracion: number; agarre: number; derrape: number };
  spec: PilotSpec;
}

export interface Vec {
  x: number;
  y: number;
}

export type DecorationType = 'palm' | 'rock' | 'bush' | 'sign' | 'arch' | 'lighthouse' | 'bouy';

export interface Decoration extends Vec {
  type: DecorationType;
  side: number;
  scale: number;
}

export interface TrackPoint extends Vec {
  angle: number;
  nx: number;
  ny: number;
}

export interface TrackData {
  points: TrackPoint[];
  fine: TrackPoint[];
  length: number;
  step: number;
  start: TrackPoint;
  decorations: Decoration[];
  itemBoxes: Vec[];
  nitroCans: Vec[];
  bananas: Vec[];
  boostPads: Array<Vec & { progress: number }>;
  lighthouse: Vec;
  svgPath: string;
  minimapPoints: Vec[];
  width: number;
}

export interface Camera {
  x: number;
  y: number;
  yaw: number;
  shake: number;
}

export type EnginePhase = 'countdown' | 'racing' | 'finished';

export interface Standing {
  id: PilotId;
  name: string;
  color: string;
  lap: number;
  progress: number;
  finished: boolean;
  time: number;
  isPlayer: boolean;
  bestLap: number;
}

export interface MiniDot {
  id: PilotId;
  x: number;
  y: number;
  color: string;
  isPlayer: boolean;
}

export interface RaceSnapshot {
  phase: EnginePhase;
  countdown: number;
  countdownLabel: string;
  speedKmh: number;
  lap: number;
  totalTime: number;
  lastLap: number;
  bestLap: number;
  position: number;
  nitro: number;
  item: ItemId | null;
  drifting: boolean;
  driftHold: number;
  boost: number;
  surface: Surface;
  standings: Standing[];
  minimap: MiniDot[];
  gamepad: boolean;
  fps: number;
  totalLaps: number;
  rescuing: boolean;
}

export interface RaceResult {
  standings: Standing[];
  playerPosition: number;
  totalTime: number;
  bestLap: number;
  lastLap: number;
}

export interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: 'spark' | 'nitro' | 'box' | 'trophy' | 'clock' | 'overtake';
  target: number;
}

export interface ItemInfo {
  id: ItemId;
  name: string;
  short: string;
  description: string;
  tone: string;
}
