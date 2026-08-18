import { AppTheme } from './types';

/**
 * Eva, a native base16 scheme: copied verbatim from
 * https://github.com/tinted-theming/schemes/blob/spec-0.11/base16/eva.yaml
 * (MIT, Copyright (c) 2022 Tinted Theming).
 */
export const eva: AppTheme = {
  name: 'Eva',
  variant: 'dark',
  author: 'kjakapat',
  source:
    'https://github.com/tinted-theming/schemes/blob/spec-0.11/base16/eva.yaml',
  palette: {
    base00: '#2a3b4d', // Default Background
    base01: '#3d566f', // Lighter Background
    base02: '#4b6988', // Selection Background
    base03: '#55799c', // Comments, Line Highlighting
    base04: '#7e90a3', // Dark Foreground
    base05: '#9fa2a6', // Default Foreground
    base06: '#d6d7d9', // Light Foreground
    base07: '#ffffff', // Lightest Foreground
    base08: '#c4676c', // Variables, Diff Deleted
    base09: '#ff9966', // Integers, Boolean, Constants
    base0A: '#ffff66', // Classes, Markup Bold
    base0B: '#66ff66', // Strings, Diff Inserted
    base0C: '#4b8f77', // Support, Regex, Escape
    base0D: '#15f4ee', // Functions, Methods
    base0E: '#9c6cd3', // Keywords, Storage
    base0F: '#bb64a9', // Deprecated, Embedded tags
  },
};
