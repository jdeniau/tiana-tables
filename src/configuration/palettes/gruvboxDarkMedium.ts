import { AppTheme } from './types';

/**
 * Gruvbox dark, medium, a native base16 scheme copied verbatim from its tinted-theming spec:
 * https://github.com/tinted-theming/schemes/blob/spec-0.11/base16/gruvbox-dark-medium.yaml
 * (MIT, Copyright (c) 2022 Tinted Theming).
 */
export const gruvboxDarkMedium: AppTheme = {
  name: 'Gruvbox Dark',
  variant: 'dark',
  author: 'Dawid Kurek',
  source:
    'https://github.com/tinted-theming/schemes/blob/spec-0.11/base16/gruvbox-dark-medium.yaml',
  palette: {
    base00: '#282828', // Default Background
    base01: '#3c3836', // Lighter Background
    base02: '#504945', // Selection Background
    base03: '#665c54', // Comments, Line Highlighting
    base04: '#bdae93', // Dark Foreground
    base05: '#d5c4a1', // Default Foreground
    base06: '#ebdbb2', // Light Foreground
    base07: '#fbf1c7', // Lightest Foreground
    base08: '#fb4934', // Variables, Diff Deleted
    base09: '#fe8019', // Integers, Boolean, Constants
    base0A: '#fabd2f', // Classes, Markup Bold
    base0B: '#b8bb26', // Strings, Diff Inserted
    base0C: '#8ec07c', // Support, Regex, Escape
    base0D: '#83a598', // Functions, Methods
    base0E: '#d3869b', // Keywords, Storage
    base0F: '#d65d0e', // Deprecated, Embedded tags
  },
};
