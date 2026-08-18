import { AppTheme } from './types';

/**
 * Gruvbox light, medium, a native base16 scheme copied verbatim from its tinted-theming spec:
 * https://github.com/tinted-theming/schemes/blob/spec-0.11/base16/gruvbox-light-medium.yaml
 * (MIT, Copyright (c) 2022 Tinted Theming).
 */
export const gruvboxLightMedium: AppTheme = {
  name: 'Gruvbox Light',
  variant: 'light',
  author: 'Dawid Kurek',
  source:
    'https://github.com/tinted-theming/schemes/blob/spec-0.11/base16/gruvbox-light-medium.yaml',
  palette: {
    base00: '#fbf1c7', // Default Background
    base01: '#ebdbb2', // Lighter Background
    base02: '#d5c4a1', // Selection Background
    base03: '#bdae93', // Comments, Line Highlighting
    base04: '#665c54', // Dark Foreground
    base05: '#504945', // Default Foreground
    base06: '#3c3836', // Light Foreground
    base07: '#282828', // Lightest Foreground
    base08: '#9d0006', // Variables, Diff Deleted
    base09: '#af3a03', // Integers, Boolean, Constants
    base0A: '#b57614', // Classes, Markup Bold
    base0B: '#79740e', // Strings, Diff Inserted
    base0C: '#427b58', // Support, Regex, Escape
    base0D: '#076678', // Functions, Methods
    base0E: '#8f3f71', // Keywords, Storage
    base0F: '#d65d0e', // Deprecated, Embedded tags
  },
};
