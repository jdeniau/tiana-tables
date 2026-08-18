import { AppTheme } from './types';

/**
 * Rosé Pine, a native base16 scheme copied verbatim from its tinted-theming spec:
 * https://github.com/tinted-theming/schemes/blob/spec-0.11/base16/rose-pine.yaml
 * (MIT, Copyright (c) 2022 Tinted Theming).
 */
export const rosePine: AppTheme = {
  name: 'Rosé Pine',
  variant: 'dark',
  author: 'Emilia Dunfelt',
  source:
    'https://github.com/tinted-theming/schemes/blob/spec-0.11/base16/rose-pine.yaml',
  palette: {
    base00: '#191724', // Default Background
    base01: '#1f1d2e', // Lighter Background
    base02: '#26233a', // Selection Background
    base03: '#6e6a86', // Comments, Line Highlighting
    base04: '#908caa', // Dark Foreground
    base05: '#e0def4', // Default Foreground
    base06: '#e0def4', // Light Foreground
    base07: '#524f67', // Lightest Foreground
    base08: '#eb6f92', // Variables, Diff Deleted
    base09: '#f6c177', // Integers, Boolean, Constants
    base0A: '#ebbcba', // Classes, Markup Bold
    base0B: '#31748f', // Strings, Diff Inserted
    base0C: '#9ccfd8', // Support, Regex, Escape
    base0D: '#c4a7e7', // Functions, Methods
    base0E: '#f6c177', // Keywords, Storage
    base0F: '#524f67', // Deprecated, Embedded tags
  },
};
