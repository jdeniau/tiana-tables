---
paths:
  - 'src/renderer/component/TableGrid*'
  - 'src/renderer/component/Cell*'
  - 'src/renderer/component/Cell*/**'
  - 'src/renderer/component/cellValueToText*'
  - 'src/renderer/component/ForeignKeyLink*'
  - 'src/renderer/component/columnWidth*'
  - 'src/renderer/component/useWrittenCellFlash.ts'
  - 'src/renderer/component/TableLayout/**'
---

# The data grid (`TableGrid`)

## TanStack Table v9

- **Its API is not v8's.** Features are imported and passed to `useTable({ features, ... })`, headers render through `<table.FlexRender />`. Work from the official `examples/react/` of the TanStack repo and the feature's guide page, never from blog posts or v8 memory — a pattern that compiles can be the one the v9 guide calls "Legacy v8-Style".
- **State the owner reads lives in an external atom**: `useCreateAtom` (`@tanstack/react-store`), read with `useSelector`, handed over in `atoms: { sorting }` — no `state` + `onXChange` bridge. An external atom is wrapped once at construction, so it must be stable for the grid's whole life: gate a feature with `enableX`, never by passing the atom on some renders only.
- **The grid subscribes to no table state** (`useTable(options, () => ({}))`), so a part that shows a state subscribes itself: `<table.Subscribe selector={(state) => state.sorting}>`.
- **The `table` object `useTable` returns is a new object on every state change** (a wrapper rebuilt around the stable core), so it never sits in a `useMemo` / `memo` dependency list. A hand-written dependency list with an `eslint-disable` is an identity claim: verify it with a probe on the comparator.
- **The scroll element is held in a state, not a ref**: the virtualizer reads it in a layout effect that runs before the parent ref attaches.
- **The primary key columns lead the grid, in the order of `fields`, whatever the user's column order**: TanStack heads the pinned columns first, so `columnSources` sorts them first (`keyColumnsFirst`) for the body and the `--tg-*-N` indexes to match. "Displays after" still orders the key columns among themselves; where the key moves a column away from its anchor, the structure page warns (`listColumnsMovedByKey`).

## Performance in the virtualized body

Scrolling _mounts_ hundreds of cells per tick, so `memo` does nothing there: the mount cost of each layer is what counts. Measured (1 000×40 story, dev mode): a React component per cell ≈ plain DOM; one extra styled element per cell ≈ +15 %; antd `Flex` per cell ≈ +120 % with long tasks on every tick.

- **No antd component per cell, and every extra mounted element costs.** `styled(BaseCell)` variants fold into one DOM node and are free — do not collapse them into one component with a colour prop. The grid renders `GridCell` → `Cell.tsx` (the per-type renderer) → one typed styled span; `Cell.tsx` has no layout wrapper on purpose, the `<td>` (`.tg-cell`) is the flex context.
- **A per-cell closure is free**: wire it where the data is in scope, not through delegation on `<tbody>` with `data-*` and `closest()`.
- **A value that changes every frame never reaches the rows.** Column widths are CSS custom properties written imperatively (TanStack's `column-resizing-performant`): a `useLayoutEffect` subscribed to `table.atoms.columnSizing` sets `--tg-w-N` (and `--tg-l-N`, a pinned column's offset) on the `<table>`, cells read `width: var(--tg-w-N)`. A drag renders nothing (32 ms of script per drag, against 1 069 ms with widths in each cell's style).
- **A feature's own published state beats a custom event wrapper.** The resize handle is the doc's `onMouseDown={header.getResizeHandler()}` and nothing more; the grabbed rule's accent is `:active`; the width to persist comes from `table.atoms.columnResizing`, whose `isResizingColumn` dropping to `false` is the end of the drag.
- **Attribute a cost by A/B isolation before naming a culprit**: swap one layer for a plain element and compare. Hygiene of the measurement is in the `verify-live` skill.

## Cells

- **The `<td>` of `BodyRowInner` owns the pointer gestures** (double-click, context menu); what the cell renders owns only the rendering. The `<div>` covers neither the padding nor the foreign-key `<a>`.
- **A transient mark on one element is set imperatively on that element**, its CSS and timing in one module (`useWrittenCellFlash`, `setTitleIfTruncated`). Every prop added to `BodyRow` is a comparison paid by every row.
- **A cell renders in three tiers**: the shape of the value (`null`, bytes, any other object), then its `FieldKind` — which alone tells a date, the server's text, from any other string —, then `String(value)` — so no value can blank the grid.
- **Detect from the value, not from a convention**: JSON is recognised by `cellValueToText` from the value itself (starts with `{`/`[` and parses), never from a column comment or an ORM marker (Doctrine's `(DC2Type:json)` is alone of its kind and gone in DBAL 4).

## Copy formats (`CellContextMenu/rowFormats.ts`)

- **`cellValueToText` feeds four places at once**: the read-only modal, the editor's opening text, the conflict modal and "Copy value". A change to what it returns changes all four: name each in the PR (`grep -rn "cellValueToText(" src`).
- **"Copy value" copies what the detail modal shows** — for a date, the server's text, fraction and offset included; a row copied as JSON / CSV is data read by programs, so a point in time goes out as an ISO 8601 instant in UTC (`dateTextToIso`): a wall clock (a `DATETIME`, a `timestamp`) taken in the server's zone — left a wall clock when that zone is unknown —, a `timestamptz` resolved at its own offset. A `DATE` stays `YYYY-MM-DD`. The INSERT and "Copy as SQL" write the server's text: it round-trips into the same column, to the microsecond.
- **A date is parsed as Temporal only where it is computed on** (`utils/dateFormatter.ts`: the grid's format, the instant of JSON / CSV); the guard, the key and the literal send the server's text back as is, since a `DATETIME(6)` compares equal only to its full fraction. A test that depends on the machine's zone mocks `Temporal.Now.timeZoneId`, never the process `TZ`.
- **The date switch converts the display only** (`DateDisplayContext`, `utils/dateZones.ts`): the grid, its column heads and the chart's axis follow it; the editor, the modal, "Copy value" and every literal keep the server's wall clock. The server's zone is read once, in the connection loader: a `SET time_zone` run in the editor afterwards is not followed. A `DATETIME` or a `timestamp` holds no zone, and only a `TIMESTAMP` / `timestamptz` moves with the session's: the switch takes the others in the server's zone too, and its UTC and local segments say so (`dateDisplay.assumed`).
- **A date cell draws its offset with `::after { content: attr(data-offset) }`**, from `CellShell`'s `offset`: a span of its own would be one more element per mounted cell.
- `<Input type="datetime-local">` plus `CellEditor/dateTimeText.ts` edit the wall clock with no time zone attached.
