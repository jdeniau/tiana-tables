import { AppTheme } from './types';

/**
 * Dracula, transcribed from the official implementations rather than from a
 * third-party base16 port:
 *  - https://github.com/dracula/visual-studio-code/blob/main/src/dracula.yml
 *  - https://github.com/dracula/textmate/blob/master/Dracula.tmTheme
 *
 * Note: draculatheme.com/spec claims orange is used for "numbers, constants,
 * booleans", but both official implementations color constants and numbers in
 * purple (`constant` -> PURPLE in the VS Code theme, `constant.numeric` ->
 * #bd93f9 in the TextMate one). The implementations win here.
 *
 * Dracula only defines 7 accent colors for the 8 base16 accent slots, so cyan
 * covers both "classes/types" (base0A) and "support/regex" (base0C).
 */
export const dracula: AppTheme = {
  name: 'Dracula',
  variant: 'dark',
  author: 'Zeno Rocha',
  source: 'https://github.com/dracula/visual-studio-code',
  palette: {
    base00: '#282a36', // Default Background          -> Background
    base01: '#21222c', // Lighter Background          -> Background Dark (ANSI black)
    base02: '#44475a', // Selection Background        -> Selection
    base03: '#6272a4', // Comments, Line Highlighting -> Comment / Current Line
    base04: '#9ea8c7', // Dark Foreground             -> muted foreground (not an official Dracula color)
    base05: '#f8f8f2', // Default Foreground          -> Foreground
    base06: '#f8f8f2', // Light Foreground            -> Foreground
    base07: '#ffffff', // Lightest Foreground         -> ANSI bright white
    base08: '#ff5555', // Variables, Diff Deleted     -> Red (errors, deletions)
    base09: '#bd93f9', // Integers, Boolean, Constants-> Purple (`constant` scope)
    base0A: '#8be9fd', // Classes, Markup Bold        -> Cyan (types, storage.type)
    base0B: '#f1fa8c', // Strings, Diff Inserted      -> Yellow (`string` scope)
    base0C: '#8be9fd', // Support, Regex, Escape      -> Cyan
    base0D: '#50fa7b', // Functions, Methods          -> Green (entity.name.function)
    base0E: '#ff79c6', // Keywords, Storage           -> Pink (`keyword`, `storage`)
    base0F: '#ffb86c', // Deprecated, Embedded tags   -> Orange (dates, parameters, generics)
  },
};
