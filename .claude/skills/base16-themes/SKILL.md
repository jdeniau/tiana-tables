---
name: base16-themes
description: >
  Use when working on Tiana Tables color themes — adding or fixing a theme in
  src/configuration/palettes/, picking a base16 slot for a new UI element or
  syntax token, mapping slots to Monaco/styled-components, or importing a
  scheme from tinted-theming. Triggers on base16, base0X slot names,
  tinted-theming, Dracula/Nord/Solarized/Catppuccin…, or any change to
  buildMonacoTheme / src/renderer/theme/index.ts.
---

# base16 palettes in Tiana Tables

Every theme in this app is a **base16 palette**: 16 hex colors, each with a
prescribed semantic role. There is no other theming layer — antd, Monaco and
styled-components all read these 16 slots.

Official guidelines (v0.4.2):
<https://github.com/tinted-theming/home/blob/main/styling.md>

## The 16 slots

| Slot   | Role                                                           |
| ------ | -------------------------------------------------------------- |
| base00 | Default Background                                             |
| base01 | Lighter Background — status bars, line numbers, table headers  |
| base02 | Selection Background                                           |
| base03 | Comments, Invisibles, Line Highlighting                        |
| base04 | Dark Foreground — status bars, muted text                      |
| base05 | Default Foreground, Caret, Delimiters, Operators               |
| base06 | Light Foreground (rarely used)                                 |
| base07 | Lightest Foreground (rarely used)                              |
| base08 | Variables, XML Tags, Markup Lists, Diff Deleted                |
| base09 | Integers, Boolean, Constants, XML Attributes, Markup Link Url  |
| base0A | Classes, Markup Bold, Search Text Background                   |
| base0B | Strings, Inherited Class, Markup Code, Diff Inserted           |
| base0C | Support, Regular Expressions, Escape Characters, Markup Quotes |
| base0D | Functions, Methods, Attribute IDs, Headings                    |
| base0E | Keywords, Storage, Selector, Markup Italic, Diff Changed       |
| base0F | Deprecated, Opening/Closing Embedded Language Tags             |

## Four rules that prevent every mistake made so far

### 1. Slots are semantic, never chromatic

`base0B` means "the string color", _whatever hue the author picked_. The
guidelines say so explicitly: "base0B (green by default) could be replaced with
red". Never reason as "base09 is the orange one" — check the actual theme.

### 2. Never invent a hex value

Colors are transcribed, not designed. Source order of preference:

1. **The theme's own official implementation** (its VS Code `.yml`, its
   `.tmTheme`) — this is the ground truth for what the author meant.
2. **tinted-theming/schemes** — <https://github.com/tinted-theming/schemes>,
   directory `base16/<name>.yaml`, for schemes that are natively base16.

Put the source URL in the file header _and_ in the `source` field, so a future
maintainer can diff against upstream.

### 3. The tinted-theming ANSI trap

Some `schemes/base16/*.yaml` files are filled **by ANSI color order**
(black, red, green, yellow, blue, magenta, cyan, white → base08…base0F), not by
editor role. `dracula.yaml` is one of them: it puts orange in base09 because
ANSI slot 3 is orange, while every official Dracula implementation colors
numbers and constants **purple** (`constant.numeric` → `#bd93f9`).
`draculatheme.com/spec` is wrong about this too — the implementations win.

Symptom to watch for: the yaml's accent colors read as a perfect rainbow in
slot order. That is ANSI ordering, not role assignment. Transcribe from the
official implementation instead, and document the discrepancy in the file
header (see `palettes/dracula.ts`).

### 4. Light themes invert the base00–base07 ramp

In a light scheme, base00 is the **lightest** and base07 the **darkest**, while
the slot names still read "Lighter Background" / "Lightest Foreground". Check
`solarizedLight.ts`: base00 `#fdf6e3`, base07 `#002b36`. Never reorder these to
match the names — set `variant: 'light'` and leave the ramp as upstream has it.

## Slots already allocated in this app

Check this before assigning a slot to anything new — the useful accent slots
are nearly all taken.

**styled-components** (`src/renderer/theme/index.ts`) exposes one accessor per
slot, named after the role: `background` (base00), `backgroundAlt` (base01),
`selection`, `commentForeground`, `mutedForeground`, `foreground` (base05),
`variableForeground` (base08), `constantForeground` (base09),
`classForeground` (base0A), `stringForeground` (base0B), `supportForeground`
(base0C), `functionForeground` (base0D), `keywordForeground` (base0E).
Use these in styled-components — never a raw `theme.palette.base0X`.

**Monaco / SQL editor** (`MonacoEditor/themes.ts`):

| Slot   | SQL tokens                                                                                                    |
| ------ | ------------------------------------------------------------------------------------------------------------- |
| base03 | comments                                                                                                      |
| base05 | identifiers, delimiters, symbolic operators                                                                   |
| base09 | numbers, constants                                                                                            |
| base0A | table names _(semantic tokens)_                                                                               |
| base0B | strings                                                                                                       |
| base0C | aliases, italic _(semantic tokens)_                                                                           |
| base0D | `predefined` (built-in functions)                                                                             |
| base0E | keywords **and** `operator.sql` — Monaco's SQL grammar classifies AND/OR/JOIN/NOT… as operators, not keywords |

Free in practice for SQL: **base08** (only `@var` uses it) and base0F
(deprecated slot, avoid).

Two cautions when picking an accent slot:

- **base08 is red in almost every theme** (`#dc322f`, `#fb4934`, `#d20f39`…).
  Avoid it for anything frequent, and for anything that could be confused with
  the error squiggle.
- **Check for duplicate values before using two slots side by side.** Dracula
  defines only 7 accents for 8 slots, so `base0A === base0C === #8be9fd`:

  ```bash
  cd src/configuration/palettes && for f in *.ts; do
    [ "$f" = types.ts ] && continue
    a=$(grep -oE "base0A: '#[0-9a-f]{6}'" "$f" | grep -oE '#[0-9a-f]{6}')
    c=$(grep -oE "base0C: '#[0-9a-f]{6}'" "$f" | grep -oE '#[0-9a-f]{6}')
    [ "$a" = "$c" ] && echo "$f: base0A == base0C ($a)"
  done
  ```

## Adding a theme

1. Create `src/configuration/palettes/<camelCaseName>.ts`, exporting a
   `const <name>: AppTheme`.
2. File header comment: what the theme is, the **URL it was transcribed from**,
   and any discrepancy worth remembering (see `dracula.ts`, `nord.ts`).
3. Fill `name`, `variant`, `author`, `source`, then the 16 slots — **one
   trailing comment per slot** giving the base16 role, and for hand-transcribed
   themes the upstream scope it came from.
4. Register it in the `THEME_LIST_AS_ARRAY` of
   `src/configuration/themes.ts` (alphabetical; the first entry is the
   default theme).
5. `yarn lint` — the `Base16Palette` type catches a missing slot.

The theme picker groups by `variant` and shows a palette preview, so a new
theme needs no UI change.

## Monaco gotcha

Monaco's built-in `vs`/`vs-dark` themes hardcode a few `*.sql` rules — notably
`string.sql` in bright red `#ff0000`. Since `buildMonacoTheme` inherits from
them (`inherit: true`), those more specific rules beat the generic `string`
rule. Any SQL token that looks wrong despite a correct generic rule needs an
explicit `<token>.sql` override in the rules array.
