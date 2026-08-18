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
