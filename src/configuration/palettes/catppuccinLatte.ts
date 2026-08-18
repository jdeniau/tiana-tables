import { AppTheme } from './types';

/**
 * Catppuccin Latte, a native base16 scheme copied verbatim from its tinted-theming spec:
 * https://github.com/tinted-theming/schemes/blob/spec-0.11/base16/catppuccin-latte.yaml
 * (MIT, Copyright (c) 2022 Tinted Theming).
 */
export const catppuccinLatte: AppTheme = {
  name: 'Catppuccin Latte',
  variant: 'light',
  author: 'Catppuccin',
  source:
    'https://github.com/tinted-theming/schemes/blob/spec-0.11/base16/catppuccin-latte.yaml',
  palette: {
    base00: '#eff1f5', // Default Background
    base01: '#e6e9ef', // Lighter Background
    base02: '#ccd0da', // Selection Background
    base03: '#bcc0cc', // Comments, Line Highlighting
    base04: '#acb0be', // Dark Foreground
    base05: '#4c4f69', // Default Foreground
    base06: '#dc8a78', // Light Foreground
    base07: '#7287fd', // Lightest Foreground
    base08: '#d20f39', // Variables, Diff Deleted
    base09: '#fe640b', // Integers, Boolean, Constants
    base0A: '#df8e1d', // Classes, Markup Bold
    base0B: '#40a02b', // Strings, Diff Inserted
    base0C: '#179299', // Support, Regex, Escape
    base0D: '#1e66f5', // Functions, Methods
    base0E: '#8839ef', // Keywords, Storage
    base0F: '#dd7878', // Deprecated, Embedded tags
  },
};
