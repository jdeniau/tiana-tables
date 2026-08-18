/**
 * A theme is a base16 palette: 16 slots, each with a prescribed semantic role.
 *
 * Roles below are quoted from the base16 styling guidelines (v0.4.2):
 * https://github.com/tinted-theming/home/blob/main/styling.md
 * (original v0.2: https://github.com/chriskempson/base16/blob/main/styling.md)
 *
 * IMPORTANT: slots are SEMANTIC, not chromatic. `base0B` means "the string
 * color", whatever hue the scheme author picks for it — the guidelines are
 * explicit that "scheme designers should pick whichever colors they desire,
 * e.g. base0B (green by default) could be replaced with red".
 *
 * Beware when importing schemes from https://github.com/tinted-theming/schemes:
 * some of them are filled by ANSI color order rather than by editor role (their
 * own `dracula.yaml` is), which does not match how the theme author intended
 * the colors to be used in an editor. Prefer transcribing from the theme's
 * official implementation.
 */
export interface Base16Palette {
  /** Default Background */
  readonly base00: string;
  /** Lighter Background (used for status bars, line numbers and folding marks) */
  readonly base01: string;
  /** Selection Background */
  readonly base02: string;
  /** Comments, Invisibles, Line Highlighting */
  readonly base03: string;
  /** Dark Foreground (used for status bars) */
  readonly base04: string;
  /** Default Foreground, Caret, Delimiters, Operators */
  readonly base05: string;
  /** Light Foreground (not often used) */
  readonly base06: string;
  /** Lightest Foreground (not often used) */
  readonly base07: string;
  /** Variables, XML Tags, Markup Link Text, Markup Lists, Diff Deleted */
  readonly base08: string;
  /** Integers, Boolean, Constants, XML Attributes, Markup Link Url */
  readonly base09: string;
  /** Classes, Markup Bold, Search Text Background */
  readonly base0A: string;
  /** Strings, Inherited Class, Markup Code, Diff Inserted */
  readonly base0B: string;
  /** Support, Regular Expressions, Escape Characters, Markup Quotes */
  readonly base0C: string;
  /** Functions, Methods, Attribute IDs, Headings */
  readonly base0D: string;
  /** Keywords, Storage, Selector, Markup Italic, Diff Changed */
  readonly base0E: string;
  /** Deprecated, Opening/Closing Embedded Language Tags */
  readonly base0F: string;
}

export interface AppTheme {
  readonly name: string;
  /** drives the antd algorithm and the Monaco base theme */
  readonly variant: 'dark' | 'light';
  readonly author?: string;
  /** where the colors were transcribed from, for future maintenance */
  readonly source?: string;
  readonly palette: Base16Palette;
}
