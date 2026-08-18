import { AppTheme } from './types';

/**
 * Synth Midnight, a native base16 scheme: copied verbatim from
 * https://github.com/tinted-theming/schemes/blob/spec-0.11/base16/synth-midnight-dark.yaml
 * (MIT, Copyright (c) 2022 Tinted Theming).
 *
 * Upstream calls it "Synth Midnight Terminal Dark"; shortened here to keep the
 * theme selector readable.
 */
export const synthMidnight: AppTheme = {
  name: 'Synth Midnight',
  variant: 'dark',
  author: 'Michaël Ball',
  source:
    'https://github.com/tinted-theming/schemes/blob/spec-0.11/base16/synth-midnight-dark.yaml',
  palette: {
    base00: '#050608', // Default Background
    base01: '#1a1b1c', // Lighter Background
    base02: '#28292a', // Selection Background
    base03: '#474849', // Comments, Line Highlighting
    base04: '#a3a5a6', // Dark Foreground
    base05: '#c1c3c4', // Default Foreground
    base06: '#cfd1d2', // Light Foreground
    base07: '#dddfe0', // Lightest Foreground
    base08: '#b53b50', // Variables, Diff Deleted
    base09: '#ea770d', // Integers, Boolean, Constants
    base0A: '#c9d364', // Classes, Markup Bold
    base0B: '#06ea61', // Strings, Diff Inserted
    base0C: '#42fff9', // Support, Regex, Escape
    base0D: '#03aeff', // Functions, Methods
    base0E: '#ea5ce2', // Keywords, Storage
    base0F: '#cd6320', // Deprecated, Embedded tags
  },
};
