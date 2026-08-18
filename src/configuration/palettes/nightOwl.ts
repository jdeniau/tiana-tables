import { AppTheme } from './types';

/**
 * Night Owl, transcribed from the official theme:
 * https://github.com/sdras/night-owl-vscode-theme/blob/master/themes/Night%20Owl-color-theme.json
 *
 * Note: the TextMate file this project used before mixed Night Owl scopes with
 * a Solarized Dark background (#002b36) and foreground (#839496). The official
 * values are used here instead (#011627 / #d6deeb).
 */
export const nightOwl: AppTheme = {
  name: 'Night Owl',
  variant: 'dark',
  author: 'Sarah Drasner',
  source: 'https://github.com/sdras/night-owl-vscode-theme',
  palette: {
    base00: '#011627', // Default Background          -> editor.background
    base01: '#0b2942', // Lighter Background          -> panels, gutter
    base02: '#1d3b53', // Selection Background        -> editor.selectionBackground
    base03: '#637777', // Comments, Line Highlighting -> comment
    base04: '#4b6479', // Dark Foreground             -> editorLineNumber
    base05: '#d6deeb', // Default Foreground          -> editor.foreground
    base06: '#e6edf5', // Light Foreground
    base07: '#ffffff', // Lightest Foreground
    base08: '#addb67', // Variables                   -> variable
    base09: '#f78c6c', // Integers, Boolean, Constants-> constant.numeric
    base0A: '#ffcb8b', // Classes, Markup Bold        -> entity.name.class
    base0B: '#ecc48d', // Strings, Diff Inserted      -> string
    base0C: '#7fdbca', // Support, Regex, Escape
    base0D: '#82aaff', // Functions, Methods          -> support.function
    base0E: '#c792ea', // Keywords, Storage           -> keyword, storage
    base0F: '#ef5350', // Deprecated, errors
  },
};
