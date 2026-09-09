import {
  ConnectionColor,
  ConnectionColorKind,
} from '../../configuration/connectionColor';
import { AppTheme } from '../../configuration/themes';

/**
 * The colours a tinted frame runs on: the chosen fill, and the two text tones
 * that read on it. They are handed to the frame as CSS custom properties, see
 * `frame` in `./index.ts`.
 */
export type ConnectionTint = {
  /** the fill of the title bar */
  background: string;
  /** base07 or base00, whichever reads on that fill */
  text: string;
  /** the hairlines and the items that are not active */
  muted: string;
};

/** how much of the text colour is left in the muted tone */
const MUTED_MIX = '70%';

type Rgb = { r: number; g: number; b: number };

function parseHex(value: string): Rgb | undefined {
  const match = /^#([0-9a-f]{6}|[0-9a-f]{3})$/i.exec(value.trim());

  if (!match) {
    return undefined;
  }

  const digits = match[1];
  const full =
    digits.length === 3
      ? digits.replace(/./g, (digit) => digit + digit)
      : digits;

  return {
    r: parseInt(full.slice(0, 2), 16),
    g: parseInt(full.slice(2, 4), 16),
    b: parseInt(full.slice(4, 6), 16),
  };
}

/** WCAG 2.1 relative luminance */
function luminance({ r, g, b }: Rgb): number {
  const channel = (value: number): number => {
    const ratio = value / 255;

    return ratio <= 0.03928 ? ratio / 12.92 : ((ratio + 0.055) / 1.055) ** 2.4;
  };

  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

/** WCAG 2.1 contrast ratio: 1 for two identical colours, 21 for black on white */
function contrastRatio(a: Rgb, b: Rgb): number {
  const [light, dark] = [luminance(a), luminance(b)].sort(
    (first, second) => second - first
  );

  return (light + 0.05) / (dark + 0.05);
}

function resolveBackground(
  color: ConnectionColor,
  theme: AppTheme
): string | undefined {
  switch (color.kind) {
    case ConnectionColorKind.Palette:
      // an unknown slot means a hand-edited configuration
      return theme.palette[color.slot];

    case ConnectionColorKind.Custom:
      return color.hex;
  }
}

/**
 * The tint of a connection under a given theme, or `undefined` when it has no
 * colour — and when the colour it has cannot be read, so that a broken
 * configuration leaves the frame as it is rather than blanking it.
 */
export function resolveConnectionTint(
  color: ConnectionColor | undefined,
  theme: AppTheme
): ConnectionTint | undefined {
  if (!color) {
    return undefined;
  }

  const background = resolveBackground(color, theme);
  const fill = background ? parseHex(background) : undefined;

  if (!background || !fill) {
    return undefined;
  }

  // the text of a tinted frame stays in the palette: its two extremes are the
  // background and the emphasis colour, and the more distant one wins
  const emphasis = parseHex(theme.palette.base07);
  const plain = parseHex(theme.palette.base00);

  const text =
    emphasis &&
    plain &&
    contrastRatio(fill, plain) > contrastRatio(fill, emphasis)
      ? theme.palette.base00
      : theme.palette.base07;

  return {
    background,
    text,
    muted: `color-mix(in srgb, ${text} ${MUTED_MIX}, ${background})`,
  };
}
