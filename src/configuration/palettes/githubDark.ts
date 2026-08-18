import { AppTheme } from './types';

/**
 * Github Dark, a native base16 scheme copied verbatim from its tinted-theming spec:
 * https://github.com/tinted-theming/schemes/blob/spec-0.11/base16/github-dark.yaml
 * (MIT, Copyright (c) 2022 Tinted Theming).
 */
export const githubDark: AppTheme = {
  name: 'GitHub Dark',
  variant: 'dark',
  author: 'Tinted Theming',
  source:
    'https://github.com/tinted-theming/schemes/blob/spec-0.11/base16/github-dark.yaml',
  palette: {
    base00: '#0d1117', // Default Background
    base01: '#161b22', // Lighter Background
    base02: '#484f58', // Selection Background
    base03: '#6e7681', // Comments, Line Highlighting
    base04: '#8b949e', // Dark Foreground
    base05: '#c9d1d9', // Default Foreground
    base06: '#f0f6fc', // Light Foreground
    base07: '#ffffff', // Lightest Foreground
    base08: '#ffa657', // Variables, Diff Deleted
    base09: '#79c0ff', // Integers, Boolean, Constants
    base0A: '#bb8009', // Classes, Markup Bold
    base0B: '#a5d6ff', // Strings, Diff Inserted
    base0C: '#7ee787', // Support, Regex, Escape
    base0D: '#d2a8ff', // Functions, Methods
    base0E: '#ff7b72', // Keywords, Storage
    base0F: '#ffa198', // Deprecated, Embedded tags
  },
};
