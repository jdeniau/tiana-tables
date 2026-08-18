import { AppTheme } from './types';

/**
 * Visual Studio (light), using the syntax colors shipped by Visual Studio and
 * VS Code's "Light+" theme:
 * https://github.com/microsoft/vscode/blob/main/extensions/theme-defaults/themes/light_plus.json
 *
 * The previous TextMate file colored integers like strings (both #a31515),
 * which made numeric and text cells indistinguishable in the grid; numbers use
 * the actual VS number color (#098658) here.
 */
export const visualStudio: AppTheme = {
  name: 'Visual Studio',
  variant: 'light',
  source: 'https://code.visualstudio.com',
  palette: {
    // light theme: base00 -> base07 run from light to dark
    base00: '#ffffff', // Default Background
    base01: '#f3f3f3', // Lighter Background          -> gutter, status bar
    base02: '#add6ff', // Selection Background
    base03: '#008000', // Comments, Line Highlighting -> comment (green)
    base04: '#6d6d6d', // Dark Foreground             -> line numbers
    base05: '#000000', // Default Foreground
    base06: '#2d2d2d', // Light Foreground
    base07: '#1e1e1e', // Lightest Foreground
    base08: '#001080', // Variables
    base09: '#098658', // Integers, Boolean, Constants
    base0A: '#2b91af', // Classes, Types
    base0B: '#a31515', // Strings, Diff Inserted
    base0C: '#0451a5', // Support, Regex, Escape
    base0D: '#795e26', // Functions, Methods
    base0E: '#0000ff', // Keywords, Storage
    base0F: '#cd3131', // Deprecated, errors
  },
};
