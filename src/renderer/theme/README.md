# How to create a theme

Themes are plain base16 palettes: 16 colors, each with a fixed semantic role
(see `Base16Palette` in `src/configuration/palettes/types.ts` for the roles,
quoted from the [base16 styling guidelines](https://github.com/tinted-theming/home/blob/main/styling.md)).

1. Copy `src/configuration/palettes/dracula.ts` to `<your-theme>.ts`.
2. Fill the 16 slots, set `name`, `variant` (`dark` or `light`), `author` and
   `source`.
3. Add it to `THEME_LIST_AS_ARRAY` in `src/configuration/themes.ts`.

That's it — the theme is selectable in the settings, and Monaco picks it up
through `buildMonacoTheme`.

## Where to find colors

Most themes here are copied verbatim from
[tinted-theming/schemes](https://github.com/tinted-theming/schemes) (MIT) —
each palette file links to the exact `.yaml` it came from. Roughly 340 schemes
are available there, so adding one is mostly a copy/paste.

Check a scheme before importing it, though: a few are filled by ANSI color
order rather than by editor role. Their `dracula.yaml`, for instance, puts
green in the "strings" slot whereas Dracula colors strings in yellow. When a
scheme looks off, transcribe from the **theme's own implementation** (its VS
Code or TextMate repository) instead — that is what its author intended, and
it is how `dracula.ts`, `nightOwl.ts`, `visualStudio.ts` and `active4d.ts`
were built.
