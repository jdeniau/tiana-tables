import { AppTheme } from '../../configuration/themes';

/**
 * Theme accessors for styled-components.
 *
 * Each one reads a single base16 slot — see `Base16Palette` for the role of
 * every slot. They are named after those roles, not after colors, so that a
 * light theme stays coherent.
 */

type StyledProps = { theme: AppTheme };

/** Default Background (base00) */
export const background = ({ theme }: StyledProps): string =>
  theme.palette.base00;

/** Lighter Background: status bars, table headers (base01) */
export const backgroundAlt = ({ theme }: StyledProps): string =>
  theme.palette.base01;

/** Selection Background (base02) */
export const selection = ({ theme }: StyledProps): string =>
  theme.palette.base02;

/** Comments, invisibles, line highlighting (base03) */
export const commentForeground = ({ theme }: StyledProps): string =>
  theme.palette.base03;

/** Dark Foreground: muted UI text such as status bars (base04) */
export const mutedForeground = ({ theme }: StyledProps): string =>
  theme.palette.base04;

/** Default Foreground, caret, delimiters, operators (base05) */
export const foreground = ({ theme }: StyledProps): string =>
  theme.palette.base05;

/** Variables, diff deleted — errors and destructive actions (base08) */
export const variableForeground = ({ theme }: StyledProps): string =>
  theme.palette.base08;

/** Integers, booleans, constants — numeric cells and NULL (base09) */
export const constantForeground = ({ theme }: StyledProps): string =>
  theme.palette.base09;

/** Classes, markup bold (base0A) */
export const classForeground = ({ theme }: StyledProps): string =>
  theme.palette.base0A;

/** Strings, diff inserted — text cells (base0B) */
export const stringForeground = ({ theme }: StyledProps): string =>
  theme.palette.base0B;

/** Support, regular expressions, escape characters — links (base0C) */
export const supportForeground = ({ theme }: StyledProps): string =>
  theme.palette.base0C;

/** Functions, methods, headings (base0D) */
export const functionForeground = ({ theme }: StyledProps): string =>
  theme.palette.base0D;

/** Keywords, storage, selectors (base0E) */
export const keywordForeground = ({ theme }: StyledProps): string =>
  theme.palette.base0E;

/** Lightest Foreground — emphasis: region names, selected row text (base07) */
export const emphasisForeground = ({ theme }: StyledProps): string =>
  theme.palette.base07;

/**
 * The accent mark of the frame: the Run fill, the pip on the active item, the
 * rule beside the current statement (base0D). Same slot as
 * `functionForeground`, named for what it does in the UI rather than in SQL.
 */
export const accent = ({ theme }: StyledProps): string => theme.palette.base0D;

/**
 * The colours of the frame, as CSS custom properties rather than as palette
 * accessors: a tinted title bar re-points them for its own subtree, and only
 * for it — the popups it opens are rendered in a portal, outside that subtree
 * in the DOM though inside it in the React tree, so they keep the palette.
 *
 * `GlobalStyle` gives each one the value of the slot it stands for, so
 * anything outside a tinted frame renders as before.
 */
export const frame = {
  /** base00 — the fill of the title bar */
  background: 'var(--frame-bg)',
  /** base05 — body text */
  text: 'var(--frame-text)',
  /** base03 — hairlines, and the items that are not active */
  muted: 'var(--frame-muted)',
  /** base07 — the active item, the brand */
  emphasis: 'var(--frame-emphasis)',
  /** base0D — the pip and the focus ring */
  accent: 'var(--frame-accent)',
} as const;

/**
 * Layout tokens, from DESIGN.md. The parent owns the `gap`; between two
 * regions there is only the 1px rule.
 */
export const space = {
  xs: '4px',
  sm: '8px',
  md: '12px',
  lg: '16px',
  xl: '24px',
} as const;

export const size = {
  titleBar: '38px',
  regionHeader: '32px',
  control: '24px',
  /** one segment of a view switch, the height antd's small `Segmented` has */
  segment: '20px',
  row: '26px',
  line: '22px',
} as const;

/**
 * The base of the type scale, and the one value a font size chosen in the
 * settings would have to move: the two other steps are derived from it, so no
 * size has to be re-tuned alongside.
 *
 * The step is ± 2, which is also why the antd `fontSize*` tokens are pinned
 * from here: its own algorithm would derive 10 and 14 from a 13 base, and the
 * frame is built on 11 / 13 / 15.
 */
const BASE_FONT_SIZE = 13;

/**
 * The type scale as numbers, for antd's `fontSize*` tokens — they take
 * numbers, not lengths. `fontSize` below is the same scale for CSS.
 */
export const fontScale = {
  base: BASE_FONT_SIZE,
  /** the frame: column heads, meta text, segments, foot rows, shortcuts */
  sm: BASE_FONT_SIZE - 2,
  /** region names */
  lg: BASE_FONT_SIZE + 2,
} as const;

/** The type scale, for styled-components. */
export const fontSize = {
  base: `${fontScale.base}px`,
  sm: `${fontScale.sm}px`,
  lg: `${fontScale.lg}px`,
} as const;

/** Every text of the app but the region names */
export const mono = "'SF Mono', Menlo, Consolas, monospace";

/**
 * Region names only. Oswald is bundled by `@fontsource/oswald`, in this single
 * weight — the CSS import in `src/renderer.ts` and `.storybook/preview.tsx`
 * must pin the same one.
 */
export const display = "'Oswald', system-ui, sans-serif";
export const displayWeight = 600;

/** The software name only. Syne Mono, bundled by `@fontsource/syne-mono`. */
export const brand = "'Syne Mono', 'SF Mono', Menlo, Consolas, monospace";
