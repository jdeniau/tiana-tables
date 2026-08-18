import { AppTheme } from './types';

/**
 * Monokai, a native base16 scheme copied verbatim from its tinted-theming spec:
 * https://github.com/tinted-theming/schemes/blob/spec-0.11/base16/monokai.yaml
 * (MIT, Copyright (c) 2022 Tinted Theming).
 */
export const monokai: AppTheme = {
  name: 'Monokai',
  variant: 'dark',
  author: 'Wimer Hazenberg',
  source:
    'https://github.com/tinted-theming/schemes/blob/spec-0.11/base16/monokai.yaml',
  palette: {
    base00: '#272822', // Default Background
    base01: '#383830', // Lighter Background
    base02: '#49483e', // Selection Background
    base03: '#75715e', // Comments, Line Highlighting
    base04: '#a59f85', // Dark Foreground
    base05: '#f8f8f2', // Default Foreground
    base06: '#f5f4f1', // Light Foreground
    base07: '#f9f8f5', // Lightest Foreground
    base08: '#f92672', // Variables, Diff Deleted
    base09: '#fd971f', // Integers, Boolean, Constants
    base0A: '#f4bf75', // Classes, Markup Bold
    base0B: '#a6e22e', // Strings, Diff Inserted
    base0C: '#a1efe4', // Support, Regex, Escape
    base0D: '#66d9ef', // Functions, Methods
    base0E: '#ae81ff', // Keywords, Storage
    base0F: '#cc6633', // Deprecated, Embedded tags
  },
};
