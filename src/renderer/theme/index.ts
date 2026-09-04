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
  row: '26px',
  line: '22px',
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
