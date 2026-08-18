import { AppTheme } from './types';

/**
 * Catppuccin Mocha, a native base16 scheme copied verbatim from its tinted-theming spec:
 * https://github.com/tinted-theming/schemes/blob/spec-0.11/base16/catppuccin-mocha.yaml
 * (MIT, Copyright (c) 2022 Tinted Theming).
 */
export const catppuccinMocha: AppTheme = {
  name: 'Catppuccin Mocha',
  variant: 'dark',
  author: 'Catppuccin',
  source:
    'https://github.com/tinted-theming/schemes/blob/spec-0.11/base16/catppuccin-mocha.yaml',
  palette: {
    base00: '#1e1e2e', // Default Background
    base01: '#181825', // Lighter Background
    base02: '#313244', // Selection Background
    base03: '#45475a', // Comments, Line Highlighting
    base04: '#585b70', // Dark Foreground
    base05: '#cdd6f4', // Default Foreground
    base06: '#f5e0dc', // Light Foreground
    base07: '#b4befe', // Lightest Foreground
    base08: '#f38ba8', // Variables, Diff Deleted
    base09: '#fab387', // Integers, Boolean, Constants
    base0A: '#f9e2af', // Classes, Markup Bold
    base0B: '#a6e3a1', // Strings, Diff Inserted
    base0C: '#94e2d5', // Support, Regex, Escape
    base0D: '#89b4fa', // Functions, Methods
    base0E: '#cba6f7', // Keywords, Storage
    base0F: '#f2cdcd', // Deprecated, Embedded tags
  },
};
