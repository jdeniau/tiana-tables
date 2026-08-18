import { AppTheme } from './types';

/**
 * Tokyo Night Dark, a native base16 scheme copied verbatim from its tinted-theming spec:
 * https://github.com/tinted-theming/schemes/blob/spec-0.11/base16/tokyo-night-dark.yaml
 * (MIT, Copyright (c) 2022 Tinted Theming).
 */
export const tokyoNightDark: AppTheme = {
  name: 'Tokyo Night Dark',
  variant: 'dark',
  author: 'Michaël Ball',
  source:
    'https://github.com/tinted-theming/schemes/blob/spec-0.11/base16/tokyo-night-dark.yaml',
  palette: {
    base00: '#1a1b26', // Default Background
    base01: '#16161e', // Lighter Background
    base02: '#2f3549', // Selection Background
    base03: '#444b6a', // Comments, Line Highlighting
    base04: '#787c99', // Dark Foreground
    base05: '#a9b1d6', // Default Foreground
    base06: '#cbccd1', // Light Foreground
    base07: '#d5d6db', // Lightest Foreground
    base08: '#c0caf5', // Variables, Diff Deleted
    base09: '#a9b1d6', // Integers, Boolean, Constants
    base0A: '#0db9d7', // Classes, Markup Bold
    base0B: '#9ece6a', // Strings, Diff Inserted
    base0C: '#b4f9f8', // Support, Regex, Escape
    base0D: '#2ac3de', // Functions, Methods
    base0E: '#bb9af7', // Keywords, Storage
    base0F: '#f7768e', // Deprecated, Embedded tags
  },
};
