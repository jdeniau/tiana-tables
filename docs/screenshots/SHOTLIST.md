# README screenshots

All four were captured from Storybook (`yarn storybook`) in headless Chromium,
so they can be regenerated when the UI changes.

| File             | Story                                   | Theme                              | Note                                                                 |
| ---------------- | --------------------------------------- | ---------------------------------- | -------------------------------------------------------------------- |
| `hero.png`       | `TableGrid / Default`                   | Dracula                            | 1180 px wide, cropped to the last whole row.                         |
| `sql-editor.png` | `MonacoEditor / RawSqlEditor / Primary` | Dracula                            | Query retyped, then `Ctrl+Space` on `e.` to open the suggest widget. |
| `chart.png`      | `Chart / ChartPanel / Default`          | Dracula                            | 980 px wide.                                                         |
| `themes.png`     | `TableGrid / Default`                   | Solarized Light + Tokyo Night Dark | Two 560 px captures, montaged side by side.                          |

Each file is then resized to exactly twice the width the README renders it at,
and reduced to a 256-color palette without dithering — flat UI screenshots lose
nothing to it, and it divides the total weight by four:

```sh
magick hero.png -filter Lanczos -resize 1800x +dither -colors 256 \
  -strip -define png:compression-level=9 PNG8:hero.png
```

`hero.png` is the grid component alone, without the surrounding window. A
capture of the real app — nav bar, table list, filter bar — would be a better
lead image; it is the one shot Storybook cannot produce.
