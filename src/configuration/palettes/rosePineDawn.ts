import { AppTheme } from './types';

/**
 * Rosé Pine Dawn, a native base16 scheme copied verbatim from its tinted-theming spec:
 * https://github.com/tinted-theming/schemes/blob/spec-0.11/base16/rose-pine-dawn.yaml
 * (MIT, Copyright (c) 2022 Tinted Theming).
 */
export const rosePineDawn: AppTheme = {
  name: 'Rosé Pine Dawn',
  variant: 'light',
  author: 'Emilia Dunfelt <edun@dunfelt.se>',
  source:
    'https://github.com/tinted-theming/schemes/blob/spec-0.11/base16/rose-pine-dawn.yaml',
  palette: {
    base00: '#faf4ed', // Default Background
    base01: '#fffaf3', // Lighter Background
    base02: '#f2e9de', // Selection Background
    base03: '#9893a5', // Comments, Line Highlighting
    base04: '#797593', // Dark Foreground
    base05: '#575279', // Default Foreground
    base06: '#575279', // Light Foreground
    base07: '#cecacd', // Lightest Foreground
    base08: '#b4637a', // Variables, Diff Deleted
    base09: '#ea9d34', // Integers, Boolean, Constants
    base0A: '#d7827e', // Classes, Markup Bold
    base0B: '#286983', // Strings, Diff Inserted
    base0C: '#56949f', // Support, Regex, Escape
    base0D: '#907aa9', // Functions, Methods
    base0E: '#ea9d34', // Keywords, Storage
    base0F: '#cecacd', // Deprecated, Embedded tags
  },
};
