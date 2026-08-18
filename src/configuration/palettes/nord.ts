import { AppTheme } from './types';

/**
 * Nord, a native base16 scheme copied verbatim from its tinted-theming spec:
 * https://github.com/tinted-theming/schemes/blob/spec-0.11/base16/nord.yaml
 * (MIT, Copyright (c) 2022 Tinted Theming).
 */
export const nord: AppTheme = {
  name: 'Nord',
  variant: 'dark',
  author: 'arcticicestudio',
  source:
    'https://github.com/tinted-theming/schemes/blob/spec-0.11/base16/nord.yaml',
  palette: {
    base00: '#2e3440', // Default Background
    base01: '#3b4252', // Lighter Background
    base02: '#434c5e', // Selection Background
    base03: '#4c566a', // Comments, Line Highlighting
    base04: '#d8dee9', // Dark Foreground
    base05: '#e5e9f0', // Default Foreground
    base06: '#eceff4', // Light Foreground
    base07: '#8fbcbb', // Lightest Foreground
    base08: '#bf616a', // Variables, Diff Deleted
    base09: '#d08770', // Integers, Boolean, Constants
    base0A: '#ebcb8b', // Classes, Markup Bold
    base0B: '#a3be8c', // Strings, Diff Inserted
    base0C: '#88c0d0', // Support, Regex, Escape
    base0D: '#81a1c1', // Functions, Methods
    base0E: '#b48ead', // Keywords, Storage
    base0F: '#5e81ac', // Deprecated, Embedded tags
  },
};
