import { mulberry } from '../utils/rng';
import type { WeatherKind } from './themes';
import { VIEW } from './view';

interface Mote {
  /** Posición normalizada en pantalla (0 a 1). */
  x: number;
  y: number;
  /** Profundidad: 1 es lo más cercano, rápido y grande. */
  z: number;
  phase: number;
}

/**
 * Clima en el espacio de pantalla: nieve que cae con paralaje y polvo que cruza bajo el horizonte.
 * Todo se guarda normalizado para sobrevivir a los cambios de resolución.
 */
export class Weather {
  private motes: Mote[] = [];
  private time = 0;

  constructor(private kind: WeatherKind) {
    const count = kind === 'snow' ? 140 : kind === 'dust' ? 22 : 0;
    const rand = mulberry(kind === 'snow' ? 5151 : 8181);
    for (let i = 0; i < count; i++) {
      this.motes.push({
        x: rand(),
        y: kind === 'dust' ? 0.5 + rand() * 0.45 : rand(),
        z: 0.25 + rand() * 0.75,
        phase: rand() * Math.PI * 2,
      });
    }
  }

  /** `speed` va de 0 a 1 (fracción de la velocidad máxima): a más velocidad, más rápido pasa todo. */
  update(dt: number, speed: number) {
    this.time += dt;
    for (const m of this.motes) {
      if (this.kind === 'snow') {
        m.y += (0.08 + 0.16 * m.z + speed * 0.2 * m.z) * dt;
        m.x += (Math.sin(this.time * 0.7 + m.phase) * 0.012 - 0.006 * m.z) * dt;
        if (m.y > 1.02) {
          m.y -= 1.04;
          m.x = (m.x + 0.37) % 1;
        }
      } else {
        m.x -= (0.05 + 0.2 * m.z + speed * 0.3 * m.z) * dt;
        m.y += Math.sin(this.time * 0.4 + m.phase) * 0.004 * dt;
      }
      if (m.x < -0.1) m.x += 1.2;
      else if (m.x > 1.1) m.x -= 1.2;
    }
  }

  draw(ctx: CanvasRenderingContext2D) {
    if (!this.motes.length) return;
    const { W, H, S } = VIEW;
    ctx.save();
    if (this.kind === 'snow') {
      for (const m of this.motes) {
        const size = Math.max(1, Math.round((0.7 + 1.5 * m.z) * S * 0.75));
        ctx.globalAlpha = 0.45 + 0.45 * m.z;
        ctx.fillStyle = '#f6fbff';
        ctx.fillRect(Math.round(m.x * W), Math.round(m.y * H), size, size);
      }
    } else {
      ctx.fillStyle = 'rgba(238, 208, 158, 1)';
      for (const m of this.motes) {
        ctx.globalAlpha = 0.1 + 0.14 * m.z;
        ctx.fillRect(Math.round(m.x * W), Math.round(m.y * H), Math.round((6 + 18 * m.z) * S), Math.max(1, Math.round(S * (0.6 + m.z))));
      }
    }
    ctx.restore();
  }
}
