import { AppTheme } from './types';

/**
 * OneDark, a native base16 scheme copied verbatim from its tinted-theming spec:
 * https://github.com/tinted-theming/schemes/blob/spec-0.11/base16/onedark.yaml
 * (MIT, Copyright (c) 2022 Tinted Theming).
 */
export const onedark: AppTheme = {
  name: 'OneDark',
  variant: 'dark',
  author: 'Lalit Magant',
  source:
    'https://github.com/tinted-theming/schemes/blob/spec-0.11/base16/onedark.yaml',
  palette: {
    base00: '#282c34', // Default Background
    base01: '#353b45', // Lighter Background
    base02: '#3e4451', // Selection Background
    base03: '#545862', // Comments, Line Highlighting
    base04: '#565c64', // Dark Foreground
    base05: '#abb2bf', // Default Foreground
    base06: '#b6bdca', // Light Foreground
    base07: '#c8ccd4', // Lightest Foreground
    base08: '#e06c75', // Variables, Diff Deleted
    base09: '#d19a66', // Integers, Boolean, Constants
    base0A: '#e5c07b', // Classes, Markup Bold
    base0B: '#98c379', // Strings, Diff Inserted
    base0C: '#56b6c2', // Support, Regex, Escape
    base0D: '#61afef', // Functions, Methods
    base0E: '#c678dd', // Keywords, Storage
    base0F: '#be5046', // Deprecated, Embedded tags
  },
};
