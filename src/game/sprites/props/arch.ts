import { grid, label, labelWidth, prop, type PropDef, type PropOptions } from '../propKit';
import type { Palette, Voxels } from '../voxel';

export interface ArchStyle {
  /** Bandas alternas de los pilares, de abajo arriba. */
  pylon: [string, string];
  /** Franja clara que recorre cada pilar. */
  pylonLight: string;
  beam: string;
  trim: string;
  checkA: string;
  checkB: string;
  flag: string;
  /** Los cuadros, el rótulo y el filo brillan por sí solos (noche). */
  glowing?: boolean;
  /** Rótulo central sobre la viga, de pocas letras. */
  text?: { value: string; color: string };
  /** Adornos propios del tema, pintados después del arco base. */
  ornament?: (v: Voxels, pal: Palette) => void;
}

/**
 * Arco de salida: dos pilares y una viga con franja de cuadros. Las medidas son las mismas
 * en todos los temas para que la parrilla encaje bajo cualquiera de ellos.
 */
export function archProp(style: ArchStyle, seed: number, options: PropOptions = {}): PropDef {
  return prop(
    0.4,
    1,
    (_variant, _rand, pal) => {
      const v = grid(pal, 100, 10, 80);
      const em = style.glowing ? 1 : 0;
      const bandA = pal.add(style.pylon[0]);
      const bandB = pal.add(style.pylon[1]);
      const light = pal.add(style.pylonLight);
      const beam = pal.add(style.beam);
      const trim = pal.add(style.trim, em);
      const checkA = pal.add(style.checkA, em);
      const checkB = pal.add(style.checkB);
      const flag = pal.add(style.flag, em);

      v.mirror((s) => {
        for (let y = 0; y < 40; y += 8) v.box(s * 84, y, -4, s * 94, Math.min(39, y + 7), 4, (y / 8) % 2 ? bandB : bandA);
        v.box(s * 85, 2, -5, s * 87, 38, -4, light);
        v.box(s * 83, 38, -5, s * 95, 40, 5, beam);
      });
      v.box(-96, 36, -5, 96, 52, 5, beam);
      v.box(-96, 50, -6, 96, 52, 6, trim);
      for (let x = -94; x < 94; x += 6) {
        for (let r = 0; r < 2; r++) {
          const on = (Math.floor((x + 94) / 6) + r) % 2 === 0;
          v.box(x, 38 + r * 5, -6, x + 5, 42 + r * 5, -6, on ? checkA : checkB);
        }
      }
      v.mirror((s) => v.box(s * 94, 44, -6, s * 98, 50, 6, flag));
      if (style.text) {
        const color = pal.add(style.text.color, em);
        const size = 2;
        const w = labelWidth(style.text.value, size);
        v.box(-Math.floor(w / 2) - 3, 52, -5, Math.ceil(w / 2) + 3, 64, -5, beam);
        label(v, style.text.value, -Math.floor(w / 2), 62, -6, color, size);
      }
      style.ornament?.(v, pal);
      return v;
    },
    seed,
    options,
  );
}
