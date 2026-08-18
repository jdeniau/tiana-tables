import { AppTheme } from './types';

/**
 * Active4D, transcribed from the TextMate theme of the same name that this
 * project used before (scopes mapped onto their base16 roles).
 */
export const active4d: AppTheme = {
  name: 'Active4D',
  variant: 'light',
  source: 'https://github.com/textmate/themes.tmbundle',
  palette: {
    // light theme: base00 -> base07 run from light to dark
    base00: '#ffffff', // Default Background
    base01: '#f0f0f0', // Lighter Background          -> gutter, status bar
    base02: '#bad6fd', // Selection Background
    base03: '#af82d4', // Comments, Line Highlighting -> comment.line/block
    base04: '#7a7a7a', // Dark Foreground             -> line numbers
    base05: '#3b3b3b', // Default Foreground
    base06: '#2a2a2a', // Light Foreground
    base07: '#1a1a1a', // Lightest Foreground
    base08: '#0053ff', // Variables
    base09: '#a8017e', // Integers, Boolean, Constants-> constant.numeric
    base0A: '#21439c', // Classes, Types              -> entity.name.type
    base0B: '#666666', // Strings, Diff Inserted      -> string
    base0C: '#a535ae', // Support, Regex, Escape      -> support.type
    base0D: '#21439c', // Functions, Methods          -> entity.name.function
    base0E: '#006699', // Keywords, Storage           -> keyword
    base0F: '#016cff', // Deprecated, Embedded tags   -> entity.name.tag
  },
};
