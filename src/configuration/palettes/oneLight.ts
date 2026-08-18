import { AppTheme } from './types';

/**
 * One Light, a native base16 scheme copied verbatim from its tinted-theming spec:
 * https://github.com/tinted-theming/schemes/blob/spec-0.11/base16/one-light.yaml
 * (MIT, Copyright (c) 2022 Tinted Theming).
 */
export const oneLight: AppTheme = {
  name: 'One Light',
  variant: 'light',
  author: 'Daniel Pfeifer',
  source:
    'https://github.com/tinted-theming/schemes/blob/spec-0.11/base16/one-light.yaml',
  palette: {
    base00: '#fafafa', // Default Background
    base01: '#f0f0f1', // Lighter Background
    base02: '#e5e5e6', // Selection Background
    base03: '#a0a1a7', // Comments, Line Highlighting
    base04: '#696c77', // Dark Foreground
    base05: '#383a42', // Default Foreground
    base06: '#202227', // Light Foreground
    base07: '#090a0b', // Lightest Foreground
    base08: '#ca1243', // Variables, Diff Deleted
    base09: '#d75f00', // Integers, Boolean, Constants
    base0A: '#c18401', // Classes, Markup Bold
    base0B: '#50a14f', // Strings, Diff Inserted
    base0C: '#0184bc', // Support, Regex, Escape
    base0D: '#4078f2', // Functions, Methods
    base0E: '#a626a4', // Keywords, Storage
    base0F: '#986801', // Deprecated, Embedded tags
  },
};
