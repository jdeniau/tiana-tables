import { AppTheme } from './types';

/**
 * Github, a native base16 scheme copied verbatim from its tinted-theming spec:
 * https://github.com/tinted-theming/schemes/blob/spec-0.11/base16/github.yaml
 * (MIT, Copyright (c) 2022 Tinted Theming).
 */
export const github: AppTheme = {
  name: 'GitHub Light',
  variant: 'light',
  author: 'Tinted Theming',
  source:
    'https://github.com/tinted-theming/schemes/blob/spec-0.11/base16/github.yaml',
  palette: {
    base00: '#ffffff', // Default Background
    base01: '#f6f8fa', // Lighter Background
    base02: '#afb8c1', // Selection Background
    base03: '#8c959f', // Comments, Line Highlighting
    base04: '#6e7781', // Dark Foreground
    base05: '#424a53', // Default Foreground
    base06: '#32383f', // Light Foreground
    base07: '#1f2328', // Lightest Foreground
    base08: '#953800', // Variables, Diff Deleted
    base09: '#0550ae', // Integers, Boolean, Constants
    base0A: '#bf8700', // Classes, Markup Bold
    base0B: '#0a3069', // Strings, Diff Inserted
    base0C: '#116329', // Support, Regex, Escape
    base0D: '#8250df', // Functions, Methods
    base0E: '#cf222e', // Keywords, Storage
    base0F: '#82071e', // Deprecated, Embedded tags
  },
};
