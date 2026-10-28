/**
 * Motor de audio 100 % sintetizado con Web Audio.
 * Sin archivos externos: motor, derrape, cuenta atrás y avisos se generan en vivo.
 */
export class GameAudio {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private engineGain: GainNode | null = null;
  private engineA: OscillatorNode | null = null;
  private engineB: OscillatorNode | null = null;
  private engineFilter: BiquadFilterNode | null = null;
  private driftGain: GainNode | null = null;
  private muted = false;

  get isMuted() {
    return this.muted;
  }

  init() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') void this.ctx.resume();
      return;
    }
    try {
      const AudioCtor = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const ctx = new AudioCtor();
      this.ctx = ctx;
      const master = ctx.createGain();
      master.gain.value = this.muted ? 0 : 0.42;
      master.connect(ctx.destination);
      this.master = master;

      // Ruido continuo para el derrape.
      const noiseBuffer = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
      const data = noiseBuffer.getChannelData(0);
      for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
      const noise = ctx.createBufferSource();
      noise.buffer = noiseBuffer;
      noise.loop = true;
      const band = ctx.createBiquadFilter();
      band.type = 'bandpass';
      band.frequency.value = 1700;
      band.Q.value = 0.75;
      const driftGain = ctx.createGain();
      driftGain.gain.value = 0;
      noise.connect(band).connect(driftGain).connect(master);
      noise.start();
      this.driftGain = driftGain;
    } catch {
      this.ctx = null;
    }
  }

  startEngine() {
    if (!this.ctx || !this.master || this.engineA) return;
    const ctx = this.ctx;
    const gain = ctx.createGain();
    gain.gain.value = 0;
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 480;
    filter.Q.value = 2.2;
    const a = ctx.createOscillator();
    a.type = 'sawtooth';
    a.frequency.value = 68;
    const b = ctx.createOscillator();
    b.type = 'square';
    b.frequency.value = 34;
    a.connect(filter);
    b.connect(filter);
    filter.connect(gain).connect(this.master);
    a.start();
    b.start();
    this.engineA = a;
    this.engineB = b;
    this.engineGain = gain;
    this.engineFilter = filter;
  }

  updateEngine(norm: number, throttle: number, offroad: boolean) {
    if (!this.ctx || !this.engineGain || !this.engineA || !this.engineB || !this.engineFilter) return;
    const t = this.ctx.currentTime;
    const target = 0.045 + throttle * 0.05 + norm * 0.035;
    this.engineGain.gain.setTargetAtTime(offroad ? target * 1.15 : target, t, 0.08);
    const base = 54 + norm * 118 + throttle * 12;
    this.engineA.frequency.setTargetAtTime(base, t, 0.06);
    this.engineB.frequency.setTargetAtTime(base * 0.5, t, 0.06);
    this.engineFilter.frequency.setTargetAtTime(380 + norm * 1600, t, 0.1);
  }

  setDrift(active: boolean, surface: 'asphalt' | 'curb' | 'grass' | 'sand') {
    if (!this.ctx || !this.driftGain) return;
    const loud = surface === 'grass' ? 0.03 : surface === 'sand' ? 0.045 : 0.075;
    this.driftGain.gain.setTargetAtTime(active ? loud : 0, this.ctx.currentTime, 0.045);
  }

  stopEngine() {
    if (!this.ctx || !this.engineA || !this.engineB) return;
    try {
      this.engineA.stop();
      this.engineB.stop();
    } catch {
      /* ya detenidos */
    }
    this.engineA = null;
    this.engineB = null;
    this.engineGain = null;
    this.engineFilter = null;
  }

  setMuted(muted: boolean) {
    this.muted = muted;
    if (this.master && this.ctx) this.master.gain.setTargetAtTime(muted ? 0 : 0.42, this.ctx.currentTime, 0.03);
  }

  private tone(freq: number, duration: number, type: OscillatorType, volume: number, slide = 0, delay = 0) {
    if (!this.ctx || !this.master) return;
    const ctx = this.ctx;
    const t = ctx.currentTime + delay;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);
    if (slide) osc.frequency.exponentialRampToValueAtTime(Math.max(28, freq + slide), t + duration);
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(volume, t + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + duration);
    osc.connect(gain).connect(this.master);
    osc.start(t);
    osc.stop(t + duration + 0.03);
  }

  private noiseBurst(duration: number, volume: number, freq: number) {
    if (!this.ctx || !this.master) return;
    const ctx = this.ctx;
    const length = Math.max(1, Math.floor(ctx.sampleRate * duration));
    const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / length);
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = freq;
    filter.Q.value = 0.8;
    const g = ctx.createGain();
    g.gain.value = volume;
    src.connect(filter).connect(g).connect(this.master);
    src.start();
  }

  countdown(final = false) {
    this.tone(final ? 720 : 430, final ? 0.25 : 0.12, 'square', final ? 0.16 : 0.1, final ? 240 : 0);
    if (final) this.tone(980, 0.32, 'triangle', 0.1, 80, 0.06);
  }

  lap() {
    this.tone(660, 0.1, 'triangle', 0.12);
    this.tone(880, 0.16, 'triangle', 0.11, 40, 0.08);
  }

  pickup() {
    this.tone(520, 0.07, 'square', 0.08, 60);
    this.tone(780, 0.1, 'square', 0.07, 120, 0.05);
  }

  box() {
    this.tone(420, 0.08, 'triangle', 0.09);
    this.tone(630, 0.08, 'triangle', 0.09, 100, 0.04);
    this.tone(940, 0.16, 'triangle', 0.08, 60, 0.1);
  }

  boost() {
    this.tone(140, 0.45, 'sawtooth', 0.1, 260);
    this.noiseBurst(0.4, 0.08, 950);
  }

  driftRelease(level: number) {
    this.tone(260 + level * 80, 0.22, 'square', 0.1, 400);
    this.noiseBurst(0.18, 0.05, 2200);
  }

  collision() {
    this.tone(84, 0.2, 'square', 0.15, -30);
    this.noiseBurst(0.16, 0.1, 380);
  }

  spin() {
    this.tone(320, 0.5, 'sawtooth', 0.08, -210);
    this.noiseBurst(0.4, 0.06, 1200);
  }

  splash() {
    this.noiseBurst(0.7, 0.14, 620);
    this.tone(180, 0.4, 'sine', 0.08, -100);
  }

  finish() {
    const notes = [523, 659, 784, 1047];
    notes.forEach((f, i) => this.tone(f, 0.25, 'triangle', 0.12, 0, i * 0.13));
    this.tone(1318, 0.6, 'triangle', 0.1, 0, 0.52);
  }

  achievement() {
    [784, 1046, 1318].forEach((f, i) => this.tone(f, 0.18, 'square', 0.06, 0, i * 0.07));
  }

  dispose() {
    this.stopEngine();
    if (this.ctx) {
      void this.ctx.close();
      this.ctx = null;
    }
  }
}
