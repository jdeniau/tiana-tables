import { AppTheme } from './types';

/**
 * Tokyo Night Light, a native base16 scheme copied verbatim from its tinted-theming spec:
 * https://github.com/tinted-theming/schemes/blob/spec-0.11/base16/tokyo-night-light.yaml
 * (MIT, Copyright (c) 2022 Tinted Theming).
 */
export const tokyoNightLight: AppTheme = {
  name: 'Tokyo Night Light',
  variant: 'light',
  author: 'Michaël Ball',
  source:
    'https://github.com/tinted-theming/schemes/blob/spec-0.11/base16/tokyo-night-light.yaml',
  palette: {
    base00: '#d5d6db', // Default Background
    base01: '#cbccd1', // Lighter Background
    base02: '#dfe0e5', // Selection Background
    base03: '#9699a3', // Comments, Line Highlighting
    base04: '#4c505e', // Dark Foreground
    base05: '#343b59', // Default Foreground
    base06: '#1a1b26', // Light Foreground
    base07: '#1a1b26', // Lightest Foreground
    base08: '#343b58', // Variables, Diff Deleted
    base09: '#965027', // Integers, Boolean, Constants
    base0A: '#166775', // Classes, Markup Bold
    base0B: '#485e30', // Strings, Diff Inserted
    base0C: '#3e6968', // Support, Regex, Escape
    base0D: '#34548a', // Functions, Methods
    base0E: '#5a4a78', // Keywords, Storage
    base0F: '#8c4351', // Deprecated, Embedded tags
  },
};
