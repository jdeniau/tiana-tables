# Design rules

How a screen in Tiana Tables is put together. Not a redesign: a small set of
rules so the next page does not invent its own layout.

Reference: `Board Refined.dc.html` — the SQL page drawn in Dracula and Unikitty
Light. Both specimens are the same markup with different slot values.

**Frame** below means the app furniture: title bar, region names, sidebar, tab
strips, status rows. Everything that is the application rather than the user's
data.

## The constraint that produces everything else

The user picks one of eighteen base16 palettes. That rules out depth as a
structural device:

- `base01` is *darker* than `base00` on Unikitty Light and *lighter* than it on
  Rosé Pine Dawn. Surface stacking inverts depending on the theme.
- On Catppuccin Latte the two differ by about 2%, which is invisible.

So structure is carried by **`base03` hairlines**, the only slot guaranteed to
sit at mid contrast against `base00` on every theme. Lines, not layers. No
panel has a fill of its own, and there are no shadows and no gradients.

## The seven rules

1. **One shell, three regions.** Title bar on top, table list on the left,
   workspace on the right. A route fills the workspace; it never sets its own
   outer padding, background or title.
2. **One background.** `base00`, everywhere. `base01` is unused.
3. **Regions are bounded by a 1px `base03` rule**, and named in condensed caps
   at 15px, sentence position, sitting inside the region they name.
4. **One spacing scale, and no margins.** 4 · 8 · 12 · 16 · 24. The parent owns
   the `gap`. Between regions there is only the 1px rule.
5. **Two faces, four sizes, one weight.** Condensed sans for region names,
   monospace for everything else. 11 (meta and column heads), 12 (table
   names), 13 (data and SQL), 15 (region names).
6. **A label is not a control.** No "Langue :", "Thème :", "Résultat :"
   captions. If a control needs a word, the word goes inside it.
7. **The accent is a mark, not a surface.** `base0D` at full strength, three
   uses per screen: the Run fill, the pip on the active item, the rule beside
   the current statement. Never a wash, never a panel edge.

## Slot contract

Every value in the specimens comes from this table. Nothing else gets a colour.

| Slot     | Role                                            | Dracula   | Unikitty Light |
| -------- | ----------------------------------------------- | --------- | -------------- |
| `base00` | the only background                             | `#282a36` | `#ffffff`      |
| `base01` | **unused** — unusable as structure              | `#21222c` | `#e1e1e2`      |
| `base02` | selection fill, scrollbar thumb, cell separators | `#44475a` | `#c4c3c5`      |
| `base03` | structural rules, meta text, line numbers       | `#6272a4` | `#a7a5a8`      |
| `base05` | body text, table names, cell values             | `#f8f8f2` | `#6c696e`      |
| `base07` | emphasis: region names, selected row text       | `#ffffff` | `#322d34`      |
| `base09` | numbers in results                              | `#bd93f9` | `#d65407`      |
| `base0D` | the accent mark: Run, active pip, current statement | `#50fa7b` | `#775dff` |

Two checks to run across all eighteen before shipping: `base0D` on `base00` for
the Run fill (Solarized Dark and Outrun Dark are the tight ones), and `base02`
on `base00` for the selected row on the flat light themes.

## Selection: one motif

An active item is marked by a **6px `base0D` square** before its label. Same
motif for the active connection in the title bar and the current statement in
the result tab strip. Not an underline — it crowded the descenders.

The selected **table** additionally gets a `base02` row fill and a 3px `base0D`
left border. The selected **row** gets the `base02` fill and `base07` text.

## Separators

Runs of sibling items — connections, statement tabs — are separated by a 1px
`base03` rule with 12–14px of padding either side, never by whitespace alone.
Three or more items must degrade evenly: every item gets
`flex: 0 1 auto; min-width: 44px; overflow: hidden; text-overflow: ellipsis`.
If only the last item can shrink, it collapses to a bare separator.

Beyond 4–5 statements the strip needs a real answer: horizontal scroll, or an
overflow menu. Undecided.

## Element heights

| Element                  | Height |
| ------------------------ | ------ |
| Title bar                | 38px   |
| Region header row        | 32px   |
| Controls, sidebar rows   | 24px   |
| Grid row                 | 26px   |
| Editor line              | 22px   |
| Segmented control        | 20px   |

## The current statement

The accent rule sits **immediately right of the line-number gutter**, and spans
only the lines of the statement the caret is in. It is not on the panel edge —
a panel edge cannot say which statement is current.

The editor carries a `base02`-at-low-opacity dot grid on a 22px pitch, offset
so a dot falls between code lines rather than behind glyphs. Decorative; drop it
if it reads as noise at 100%.

## Scrollbars

`scrollbar-width: thin` plus `scrollbar-color: <base02> <base00>` — Chromium
honours both, so no `::-webkit-scrollbar` rules are needed. Same pair as the
selected row, so scrollbars introduce no value the palette did not supply.

## Where the values live

Unambiguous split, or both places drift.

**antd owns components.** One block in the `ConfigProvider` theme in
`src/contexts/ThemeContext.tsx`:

```ts
token: {
  colorPrimary: accent({ theme }),        // base0D
  colorBgContainer: background({ theme }), // base00
  colorBorder: comment({ theme }),         // base03
  controlHeight: 24,
  controlHeightSM: 20,
  borderRadius: 0,
  fontSize: 13,
  fontFamily: mono,
  padding: 8,
  paddingXS: 4,
  margin: 8,
},
components: {
  Menu:  { itemHeight: 24, padding: 8, itemBorderRadius: 0 },
  Tabs:  { horizontalItemPadding: '0 14px' },
  Table: { cellPaddingBlockSM: 4, headerBg: 'transparent' },
},
```

**Accessors own layout.** Added to `src/renderer/theme/index.ts`, next to the
existing colour accessors:

```ts
export const space = {
  xs: '4px', sm: '8px', md: '12px', lg: '16px', xl: '24px',
} as const;

export const size = {
  titleBar: '38px', regionHeader: '32px', control: '24px',
  row: '26px', line: '22px',
} as const;

export const mono = "'SF Mono', Menlo, Consolas, monospace";
export const display = "'Oswald', 'Archivo Narrow', system-ui, sans-serif";
```

Raw pixel values in a styled-component are a review comment.

## The one new component

`src/renderer/component/Style/Region.tsx` — rule 3 in one place, so no route
rebuilds it:

```ts
export const Region = styled.section`
  display: flex; flex-direction: column; min-height: 0;
  border-bottom: 1px solid ${comment};
`;

export const RegionHeader = styled.header`
  display: flex; align-items: center; justify-content: space-between;
  height: ${size.regionHeader}; padding: 0 ${space.md};
`;

export const RegionName = styled.h2`
  margin: 0;
  font-family: ${display};
  font-size: 15px; letter-spacing: 0.05em; text-transform: uppercase;
  color: ${foreground};
`;

export const RegionBody = styled.div`
  flex: 1; min-height: 0; overflow: auto;
  scrollbar-width: thin;
  scrollbar-color: ${selection} ${background};
`;
```

Ship it with a Storybook story — the repo already has Storybook.

## Screen notes

- **Title bar** — 38px. Left: "Tiana Tables" in the display face, then the
  connections as a run separated by `base03` rules, the active one carrying its
  pip. Right: one settings affordance. Nothing in the middle. The inline
  language and theme selectors move into the settings menu with the version.
- **Sidebar** — 212px. Database name in the display face with a caret, the ⌘K
  "Go to table…" input directly under it (it is deliberately *not* in the title
  bar — it belongs next to the tables it searches), then 24px mono rows, and a
  row count at the foot.
- **Query region** — name, statement count, and the Run button with its select
  caret, all in the header row. Editor below with a 34px gutter.
- **Result region** — one header row: name, statement tabs, then a 24px gutter,
  then row count and the Data/Chart switch. The grid starts flush at the region
  edge: 11px uppercase column heads over a `base03` rule, 26px rows, numbers
  right-aligned in `base09` with `base02` cell separators.
- **Table view** — the same two-region split as the SQL page, so the two screens
  read as siblings. Filters on top, data below. Table name and its Structure
  link in the data region header. "Load more rows" is a foot row, not a centred
  button in the flow.
- **Connect** — the one screen with no data in it: a single 480px region
  centred on `base00`, `space.lg` padding, `space.xl` between field groups, one
  solid button.

## Order of work

Cheapest first, each step independently shippable:

1. antd tokens in `ThemeContext`. One file, the whole app tightens.
2. `space` / `size` / `mono` / `display` accessors. One file, lint-able.
3. `Region` / `RegionHeader` / `RegionName` / `RegionBody` + a story.
4. Convert `routes/sql.$connectionSlug.tsx`, then `TableLayout`. Delete caption
   labels as you pass.
5. Title bar and sidebar last: most visible, least broken.
