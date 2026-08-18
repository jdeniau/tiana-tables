import { AppTheme } from './types';

/**
 * Solarized Light, a native base16 scheme copied verbatim from its tinted-theming spec:
 * https://github.com/tinted-theming/schemes/blob/spec-0.11/base16/solarized-light.yaml
 * (MIT, Copyright (c) 2022 Tinted Theming).
 */
export const solarizedLight: AppTheme = {
  name: 'Solarized Light',
  variant: 'light',
  author: 'Ethan Schoonover',
  source:
    'https://github.com/tinted-theming/schemes/blob/spec-0.11/base16/solarized-light.yaml',
  palette: {
    base00: '#fdf6e3', // Default Background
    base01: '#eee8d5', // Lighter Background
    base02: '#93a1a1', // Selection Background
    base03: '#839496', // Comments, Line Highlighting
    base04: '#657b83', // Dark Foreground
    base05: '#586e75', // Default Foreground
    base06: '#073642', // Light Foreground
    base07: '#002b36', // Lightest Foreground
    base08: '#dc322f', // Variables, Diff Deleted
    base09: '#cb4b16', // Integers, Boolean, Constants
    base0A: '#b58900', // Classes, Markup Bold
    base0B: '#859900', // Strings, Diff Inserted
    base0C: '#2aa198', // Support, Regex, Escape
    base0D: '#268bd2', // Functions, Methods
    base0E: '#6c71c4', // Keywords, Storage
    base0F: '#d33682', // Deprecated, Embedded tags
  },
};
