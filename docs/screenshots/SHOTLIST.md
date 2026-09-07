# README screenshots

All four are captured from Storybook (`yarn storybook`) in headless Chromium,
so they can be regenerated when the UI changes:

```sh
yarn storybook          # in one terminal
docs/screenshots/shots.sh   # in another, once Storybook answers on :6006
```

| File             | Story                                   | Theme                              | Note                                                                                                           |
| ---------------- | --------------------------------------- | ---------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| `hero.png`       | `TableGrid / Default`                   | Dracula                            | 1200 css px at 1.5×, cropped to the header and 20 whole rows.                                                  |
| `sql-editor.png` | `MonacoEditor / RawSqlEditor / Primary` | Dracula                            | Retyped up to `WHERE e.` through the devtools protocol, so the suggest widget is open (`sql-editor-shot.mjs`). |
| `chart.png`      | `Chart / ChartPanel / Default`          | Dracula                            | 980 css px at 1400/980.                                                                                        |
| `themes.png`     | `TableGrid / Default`                   | Solarized Light + Tokyo Night Dark | Two 560 css px captures at 1.25×, montaged side by side.                                                       |

Each story is rendered at the device scale factor that gives exactly twice the
width the README renders it at, so nothing is upscaled, and the 16 px Storybook
padding is cropped away. Needs `chromium-browser` (or `CHROMIUM=…`), `node` and
Python with Pillow.

`hero.png` is the grid component alone, without the surrounding window. A
capture of the real app — title bar, table list, filters — would be a better
lead image; it is the one shot Storybook cannot produce.
