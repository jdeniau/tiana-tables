import { AppTheme } from './types';

/**
 * SynthWave '84 — not published as a base16 scheme on tinted-theming, so this
 * is transcribed from the official VS Code theme:
 * https://github.com/robb0wen/synthwave-vscode/blob/master/themes/synthwave-color-theme.json
 *
 * Two slots are derived rather than copied: the theme paints its selection
 * with a translucent white (#ffffff20) which cannot be stored as a solid
 * color, and has no dedicated muted foreground.
 */
export const synthwave84: AppTheme = {
  name: "SynthWave '84",
  variant: 'dark',
  author: 'Robb Owen',
  source: 'https://github.com/robb0wen/synthwave-vscode',
  palette: {
    base00: '#262335', // Default Background          -> editor.background
    base01: '#241b2f', // Lighter Background          -> sideBar, tabs
    base02: '#463465', // Selection Background        -> derived (upstream is translucent)
    base03: '#848bbd', // Comments, Line Highlighting -> comment
    base04: '#b6b1b1', // Dark Foreground             -> derived
    base05: '#ffffff', // Default Foreground          -> colors.foreground
    base06: '#f0eff1', // Light Foreground
    base07: '#ffffff', // Lightest Foreground
    base08: '#ff7edb', // Variables                   -> variable (the signature pink)
    base09: '#f97e72', // Integers, Boolean, Constants-> constant.numeric
    base0A: '#fe4450', // Classes, Types              -> entity.name.type
    base0B: '#ff8b39', // Strings, Diff Inserted      -> string.quoted
    base0C: '#72f1b8', // Support, Regex, Escape
    base0D: '#36f9f6', // Functions, Methods          -> entity.name.function
    base0E: '#fede5d', // Keywords, Storage           -> storage.type
    base0F: '#2ee2fa', // Deprecated, Embedded tags
  },
};
