# Design rules

How a screen in Tiana Tables is put together: a small set of rules so the next page does not invent its own layout. They come from a design folder drawn on the SQL page in Dracula and Unikitty Light (kept outside the repo); where the code later departed from it on purpose, this file says what the code does.

**Frame** below means the app furniture: title bar, region names, sidebar, tab strips, status rows — everything that is the application rather than the user's data.

## The constraint that produces everything else

The user picks one of the base16 palettes of `src/configuration/palettes/`, which rules out depth as a structural device:

- `base01` is _darker_ than `base00` on Unikitty Light and _lighter_ than it on Rosé Pine Dawn: surface stacking inverts with the theme.
- On Catppuccin Latte the two differ by about 2 %, which is invisible.

So structure is carried by **`base03` hairlines**, the only slot guaranteed to sit at mid contrast against `base00` on every theme. Lines, not layers: no panel has a fill of its own, and there are no shadows and no gradients.

## The seven rules

1. **One shell, three regions.** Title bar on top, table list on the left, workspace on the right. A route fills the workspace; it never sets its own outer padding, background or title.
2. **One background.** `base00`, everywhere. `base01` is unused.
3. **Regions are bounded by a 1px `base03` rule**, and named in condensed caps at 15px, sitting inside the region they name.
4. **One spacing scale, and no margins.** 4 · 8 · 12 · 16 · 24. The parent owns the `gap`. Between regions there is only the 1px rule.
5. **Two faces, four sizes, one weight.** Condensed sans for region names, monospace for everything else. 11 (meta and column heads), 12 (table names), 13 (data and SQL), 15 (region names). The software's name in the title bar is the one exception, in its own face (`brand`).
6. **A label is not a control.** No "Langue :", "Thème :", "Résultat :" captions. If a control needs a word, the word goes inside it.
7. **The accent is a mark, not a surface.** `base0D` at full strength, three uses per screen: the solid button of a region (Run), the pip on the active item, the rule beside the current statement. Never a wash, never a panel edge.

## Slot contract

Every colour on screen comes from this table. Nothing else gets a colour.

| Slot     | Role                                                | Dracula   | Unikitty Light |
| -------- | --------------------------------------------------- | --------- | -------------- |
| `base00` | the only background                                 | `#282a36` | `#ffffff`      |
| `base01` | **unused** — unusable as structure                  | `#21222c` | `#e1e1e2`      |
| `base02` | selection fill, scrollbar thumb, cell separators    | `#44475a` | `#c4c3c5`      |
| `base03` | structural rules, meta text, line numbers           | `#6272a4` | `#a7a5a8`      |
| `base05` | body text, table names, cell values                 | `#f8f8f2` | `#6c696e`      |
| `base07` | emphasis: region names, selected row text           | `#ffffff` | `#322d34`      |
| `base09` | numbers in results                                  | `#bd93f9` | `#d65407`      |
| `base0D` | the accent mark: Run, active pip, current statement | `#50fa7b` | `#775dff`      |

The text on the accent fill is `base00`, which holds at least 3.4:1 on every palette where white drops to 1.3:1. `base02` on `base00` is weak for the selected row on some light palettes (about 1.1:1 on Rosé Pine Dawn, Tokyo Night Light, One Light): accepted, since the selected table's 3px `base0D` rule carries the signal there.

## Selection: one motif

An active item is marked by a **6px `base0D` square** before its label: the active connection in the title bar, the current statement in the result tab strip, the active table tab. Not an underline — it crowded the descenders.

The selected **table** in the sidebar also gets a `base02` row fill and a 3px `base0D` left border (antd's Menu can only draw its bar on the right, so the rule is ours, on `TableLink`). The selected **row** of a grid gets the `base02` fill and `base07` text. The grid keeps a `base02` separator between rows.

## Separators

Runs of sibling items — connections, statement tabs, table tabs — are separated by a 1px `base03` rule with 12–14px of padding either side, never by whitespace alone. Three or more items degrade evenly: every item gets `flex: 0 1 auto; min-width: 44px; overflow: hidden; text-overflow: ellipsis`. If only the last item could shrink, it would collapse to a bare separator.

Beyond 4–5 items the run scrolls horizontally, with no scrollbar of its own and the active item scrolled into view. **A vertical wheel over the run scrolls it sideways** — a mouse has no other wheel, and the platform scrollbar is not an option: Chromium draws it with rounded corners and arrow buttons, and it takes a third of a 32px row. The item clipped at the edge is the sign that there is more. The floor comes first: items shrink evenly until they reach it, and only then does the run overflow. It is 44px for a bare item, 96px for one carrying a close button — at 44px such a tab is its padding and its cross, with a single character between them.

## Element heights

| Element                | Height |
| ---------------------- | ------ |
| Title bar              | 38px   |
| Region header row      | 32px   |
| Controls, sidebar rows | 24px   |
| Grid row               | 26px   |
| Editor line            | 22px   |
| Segmented control      | 20px   |

## The current statement

The accent rule sits **immediately right of the line-number gutter**, and spans only the lines of the statement the caret is in. It is not on the panel edge — a panel edge cannot say which statement is current. The same lines carry a translucent `base02` band, which leaves Monaco's current-line highlight visible.

The editor carries a `base02`-at-low-opacity dot grid on a 22px pitch, offset so a dot falls between code lines rather than behind glyphs.

## Scrollbars

`scrollbar-width: thin` plus `scrollbar-color: <base02> <base00>` — Chromium honours both, so no `::-webkit-scrollbar` rules are needed. Same pair as the selected row, so scrollbars introduce no value the palette did not supply.

## Where the values live

One owner per value, or both places drift. The code is the reference for the numbers; this section says where to look.

- **antd owns the components**: the `ConfigProvider` theme in `src/contexts/ThemeContext.tsx` — the global tokens (the slots of the contract above, `controlHeight` 24 / `controlHeightSM` 20, `borderRadius` 0, the mono face and the type scale, `padding` 8) and the component tokens (Button, Menu, Form, Layout, Tabs, Splitter, Segmented). Change a token before writing CSS. antd's semantic seeds (`colorError`, `colorWarning`, `colorSuccess`, `colorInfo`, `colorLink`) are mapped to slots and pinned through the dark algorithm, which would otherwise re-tune them.
- **`src/renderer/theme/index.ts` owns layout and colour for our own elements**: one accessor per slot named after its role (`background`, `selection`, `commentForeground`, `foreground`, `emphasisForeground`, `accent`…), `space` (the spacing scale), `size` (the heights above), `fontScale` / `fontSize` (derived from one `BASE_FONT_SIZE`, since the size will become a setting), `mono`, `display` + `displayWeight`, `brand`. A raw pixel value in a styled-component is a review comment.
- **The frame's colours go through `frame`**: five CSS custom properties whose default value is the slot each replaces. A title bar tinted by the connection's colour (`resolveConnectionTint`, `src/renderer/theme/connectionTint.ts`) re-points them on itself, so the popups it opens — in a portal, outside it in the DOM — keep the palette. Use them in anything the title bar renders, the accessors everywhere else.

## The frame components

`src/renderer/component/Style/` builds every rule above once, so no route rebuilds it; the visual ones have a story.

- `Region.tsx` — `Region`, `RegionHeader`, `RegionGroup`, `RegionTools` (the controls' side of the header), `RegionName`, `RegionMeta`, `RegionDetail`, `RegionBody` (the scroller, with the scrollbar pair), `RegionFoot`; `FramedRegion` + `Centered` for the connect screen. A region draws no rule of its own: its parent does (the Splitter bar is a 1px `base03` rule).
- `TabStrip.tsx` — a run of siblings separated by rules, the current one pipped: `TabStripItem` (acts), `TabStripLink` (navigates), `TabStripClosableLink`.
- `ViewSwitch.tsx` — a framed run of `NavLink` segments, the current one filled: the look of a switch at the right of a result region's header (Data/Structure), matching the SQL page's Data/Chart `Segmented`.
- `RegionSegmented.tsx` — the antd `Segmented` of a region header (Data/Chart, the dates' zone): its frame and caps set once, so no page passes `styles`.
- `TitleBar.tsx` — the bar, its groups and the `Brand`.
- `ActionButton.tsx` — the one solid block of a region (Run, Filter, Save and connect): the accent fill, the word in the display face, in caps.
- `fill.ts` — the three declarations that make a box fill its parent, whatever the parent's `display`.

## Screen notes

- **Title bar** — 38px, drawn in place of the system's: it moves the window, and the system window controls sit over its end (right, or the traffic lights left on macOS) in its own fill and text colour. Left: "Tiana Tables" in the `brand` face (followed by "(dev mode)" in 11px muted text when run from the sources), the ☰ right after it (it opens the native menu; none on macOS, where the menu stays in the system bar), then the connections as a run separated by `base03` rules, the active one carrying its pip. Right: the SQL link, in `base05` whether its page is open or not, the pip alone marking it — a lone item has no siblings to be muted against.
  - **The one exception to the single background**: a connection may be marked with a colour, and the bar is then filled with it, so that a production connection is impossible to miss. Everything in the bar turns `base07` or `base00`, whichever contrasts more with the fill, and the hairlines and inactive items take 70 % of that tone over the fill. The colour is one of the eight colourful slots, so it follows the theme, or one of the user's own.
- **Sidebar** — 200px on first run, then resizable (its width is kept as a ratio). Database name in the display face with a caret, the ⌘K "Go to table…" button directly under it (deliberately _not_ in the title bar: it belongs next to the tables it searches), then 24px mono rows, and a row count at the foot.
- **Query region** — name, statement count, and the Run button with its select caret, all in the header row. Editor below.
- **Result region** — one header row: name, statement tabs, then a 24px gutter, then row count and the Data/Chart switch. The grid starts flush at the region edge: 11px uppercase column heads over a `base03` rule, 26px rows, numbers right-aligned in `base09` with `base02` cell separators.
- **Table tabs** — a 32px row over the whole content panel, under the title bar and right of the sidebar, with a `base03` rule under it. The open tables as a run: the active one carries the pip, the temporary one is in italics, each carries a `×` shown on hover and on the active tab. It belongs to the workspace rather than to the table below it, so it stays in place between Data and Structure; with no tab open there is no row at all.
  - A single click on a table opens it **temporarily** — one such tab at a time, the next single click replaces it. A double click **memorises** it: it is written to the configuration and stays until it is closed. The temporary tab is always last, so memorising it moves nothing.
- **Table view** — the same two-region split as the SQL page, so the two screens read as siblings. Filters on top, data below. Table name, its count and the Data/Structure `ViewSwitch` in the region header; the structure view carries that header over the column detail of the table. "Load more rows" is a foot row, not a centred button in the flow.
- **Connect** — a screen with no data in it: a single 480px `FramedRegion` centred on `base00`. `/connect` lists the connections (rows, Edit on hover, a `+` at the foot); the form stands alone on `/connect/create` and `/connect/edit/:slug`, never next to the list. `space.lg` padding, `space.xl` between field groups, one solid button.
- **Settings** — `/settings`, reached from the native menu (`Ctrl+,`): language, theme and version in the same 480px `FramedRegion` as Connect.
