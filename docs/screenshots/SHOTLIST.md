# README screenshots

All four are captured from the Electron app in dev mode, against the dev MariaDB, so they can be regenerated when the UI changes:

```sh
docker compose up -d --wait         # the dev databases, see dev/fixtures/README.md
node docs/screenshots/shots.mjs     # Node 26; no other Tiana instance running
```

The script starts the app on a throwaway profile, creates a "Le Fil (dev)" connection through the form, stages the rest through the app's own `window.config` calls (column order and widths, filter, theme, panel size), then drives it over the devtools protocol and quits.

| File             | What                                                                                                                                                                                 | Theme                             | Note                                                         |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------- | ------------------------------------------------------------ |
| `hero.png`       | The whole window on `article`, filtered on `statut <> 'archive'`, columns reordered to show an enum, a foreign key, a datetime and its NULLs, numbers, a decimal, a boolean and JSON | Dracula                           | 1200 × 760 css px at 1.5×.                                   |
| `sql-editor.png` | The SQL page, typed up to `WHERE a.` so the suggest widget lists `article`'s columns                                                                                                 | Dracula                           | Cropped to the Query region.                                 |
| `chart.png`      | Monthly reads from `vue_audience_mensuelle`, flipped to a chart on the axes it picks itself                                                                                          | Dracula                           | Cropped to the Result region, with the editor shrunk to 28%. |
| `themes.png`     | The top-left corner of the hero window                                                                                                                                               | Unikitty Light + Tokyo Night Dark | Two 560 × 380 css px crops at 1.5×, side by side.            |

The window is emulated at 1200 css px and a 1.5 scale factor, the 1800 px the README shows at 900, so nothing is upscaled. The two dev-only marks are hidden before each capture: the path bar through its View › Developer tools menu item, the "(dev mode)" label of the title bar with an inline style. Needs Python with Pillow for the `themes.png` montage.
