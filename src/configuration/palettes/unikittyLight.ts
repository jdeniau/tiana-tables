import { AppTheme } from './types';

/**
 * Unikitty Light, a native base16 scheme: copied verbatim from
 * https://github.com/tinted-theming/schemes/blob/spec-0.11/base16/unikitty-light.yaml
 * (MIT, Copyright (c) 2022 Tinted Theming).
 */
export const unikittyLight: AppTheme = {
  name: 'Unikitty Light',
  variant: 'light',
  author: 'Josh W Lewis',
  source:
    'https://github.com/tinted-theming/schemes/blob/spec-0.11/base16/unikitty-light.yaml',
  palette: {
    base00: '#ffffff', // Default Background
    base01: '#e1e1e2', // Lighter Background
    base02: '#c4c3c5', // Selection Background
    base03: '#a7a5a8', // Comments, Line Highlighting
    base04: '#89878b', // Dark Foreground
    base05: '#6c696e', // Default Foreground
    base06: '#4f4b51', // Light Foreground
    base07: '#322d34', // Lightest Foreground
    base08: '#d8137f', // Variables, Diff Deleted
    base09: '#d65407', // Integers, Boolean, Constants
    base0A: '#dc8a0e', // Classes, Markup Bold
    base0B: '#17ad98', // Strings, Diff Inserted
    base0C: '#149bda', // Support, Regex, Escape
    base0D: '#775dff', // Functions, Methods
    base0E: '#aa17e6', // Keywords, Storage
    base0F: '#e013d0', // Deprecated, Embedded tags
  },
};
