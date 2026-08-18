import { AppTheme } from './types';

/**
 * Outrun Dark, a native base16 scheme copied verbatim from its tinted-theming spec:
 * https://github.com/tinted-theming/schemes/blob/spec-0.11/base16/outrun-dark.yaml
 * (MIT, Copyright (c) 2022 Tinted Theming).
 */
export const outrunDark: AppTheme = {
  name: 'Outrun Dark',
  variant: 'dark',
  author: 'Hugo Delahousse',
  source:
    'https://github.com/tinted-theming/schemes/blob/spec-0.11/base16/outrun-dark.yaml',
  palette: {
    base00: '#00002a', // Default Background
    base01: '#20204a', // Lighter Background
    base02: '#30305a', // Selection Background
    base03: '#50507a', // Comments, Line Highlighting
    base04: '#b0b0da', // Dark Foreground
    base05: '#d0d0fa', // Default Foreground
    base06: '#e0e0ff', // Light Foreground
    base07: '#f5f5ff', // Lightest Foreground
    base08: '#ff4242', // Variables, Diff Deleted
    base09: '#fc8d28', // Integers, Boolean, Constants
    base0A: '#f3e877', // Classes, Markup Bold
    base0B: '#59f176', // Strings, Diff Inserted
    base0C: '#0ef0f0', // Support, Regex, Escape
    base0D: '#66b0ff', // Functions, Methods
    base0E: '#f10596', // Keywords, Storage
    base0F: '#f003ef', // Deprecated, Embedded tags
  },
};
