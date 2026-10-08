---
name: verify-live
description: >
  Use when a claim about Tiana Tables has to be proven on the real thing rather than reasoned about: driving the running Electron app over CDP (keyboard, mouse, DOM, console, native menu), reproducing an interaction bug, measuring performance or timing, checking stories headless, or probing the dev MariaDB / PostgreSQL containers. Triggers on "reproduce", "prove", "measure", "benchmark", CDP, remote debugging, long tasks, "does it mount", or any sentence about what the app or a server does that was not run yet.
---

# Proving it live

The project's recurring lesson: **a claim is measured before code is built on it or a sentence is written about it.** Most wrong turns came from reasoning about a mount, a timing, a tooltip, a cost or a server instead of running it.

## Driving the app over CDP

Wayland session, no xdotool: launch the app with a debugging port and drive it through a CDP WebSocket (Node 26 has a global `WebSocket`, nothing to install).

```sh
tmux new-session -d -s tiana -x 200 -y 50
tmux send-keys -t tiana "yarn electron-forge start -- \
  --user-data-dir=<isolated-profile> --remote-debugging-port=9222" Enter
```

- electron-forge 8 keeps the app up with stdin closed (`… < /dev/null &` is enough); in tmux it shows its interactive screen, where `r` relaunches the app.
- **`--user-data-dir` isolates the configuration**; without it the run writes into the user's real connections. The profile keeps its connections between runs, so create one once (`#/connect/create`, ids `name`/`host`/`port`/`user`/`password`, button "SAVE AND CONNECT" — a new profile is in English), named with `(dev)`.
- The page target is the one whose url starts with `http://localhost:517x`.
- `docs/screenshots/shots.mjs` (the README screenshots) is a working harness: throwaway profile, connection form, `window.config` staging, a native menu click, `clip`ped captures.
- The main process is not hot-reloaded: any change to `menu.ts`, the preload or an IPC handler needs a full relaunch.
- Clean up with `pkill -f "remote-debugging-port=922[2]"` — the brackets matter: the bare pattern matches the shell's own command line and kills it (exit 144), and so does any other spelling of the flag in the same command. Then check `pgrep -f "electron/dist/electro[n]"` is empty: a second instance keeps port 9222 and every CDP call hangs on it.

Traps that each cost half an hour:

- **Focus**: with the window in the background Monaco never takes focus. Send `Page.bringToFront` **and** `Emulation.setFocusEmulationEnabled {enabled: true}`, then focus `.monaco-editor .native-edit-context` (a click is not always enough).
- **Who consumed a key**: Monaco calls both `preventDefault` and `stopPropagation`, so install **two** listeners on `window`, one capturing (what the renderer saw), one bubbling (`defaultPrevented`). Make the probe idempotent: an `if (!window.__probeBound)` guard left by a previous pass installs nothing.
- **No synthetic key fires a native menu accelerator** — neither `Input.dispatchKeyEvent` nor `webContents.sendInputEvent`, even focused with the system title bar (Electron 44, Wayland): the page sees the key, the menu does not. An accelerator is proven by a real keypress, while the main inspector records `webContents.send`. Modifiers: Alt=1, Ctrl=2, Meta=4, Shift=8; `rawKeyDown` then `keyUp`.
- **Native menu items**: add `--inspect-electron`, a forge flag that goes before the `--`; the main-process inspector listens on **9229**. `require` is not global there, use `process.mainModule.require('electron')`. `MenuItem`'s wrapper toggles `checked` before calling the handler, so a programmatic `item.click()` is exactly a real click.
- **Quitting rewrites `config.json`** from memory: test persistence through the app's action, never by editing the file while it runs.
- **Timing**: sample with a 1 ms sampler installed through `Page.addScriptToEvaluateOnNewDocument` rather than reasoning about async order (e.g. `window.isDev` is defined ~90 ms in, while `Root` first renders at ~650 ms because `ConfigurationContextProvider` waits for its IPC answer).
- **After a hot reload, reload the page** (`Page.reload`) before measuring anything: Vite leaves listeners from older module versions registered (stale Monaco markers, inflated mounts). After a lockfile change too: the dev server re-optimizes its dependencies on the first load, and a lazy route shows "Failed to fetch dynamically imported module" until the page is reloaded.

Ask the user to test in their place only once this harness has been tried.

## Proving what the screen shows

- Colours: `getComputedStyle(el).color`, not screenshots — and pick a theme whose slots differ (Dracula has `base0A === base0C`; Nord is a good default).
- A border or a rule: `getComputedStyle(el).borderInlineStartWidth` on the real element.
- A tooltip or a click target: `document.elementsFromPoint(x, y)`.
- A scroller: `scrollHeight > clientHeight` over every `overflow: auto` ancestor.
- An antd token: the generated rule in `document.styleSheets`, filtered on the component's class.
- What a copy writes: record `DataTransfer.prototype.setData` in the page. Reading the system clipboard from the main process proves it only while the window holds the keyboard focus: on Wayland, an unfocused window's write never lands, and the read returns what the user copied elsewhere.

## Measuring performance

- **Attribute by A/B isolation**: swap one layer for a plain element and compare; never name a culprit from reading the code.
- `Performance.getMetrics` deltas around the gesture (`ScriptDuration`, `LayoutDuration`, `RecalcStyleDuration`) say which layer pays; the sampling profiler then says which function; a probe on a `memo` comparator names the prop that changes.
- Count long tasks with `PerformanceObserver({ entryTypes: ['longtask'] })`. On a hidden page (`document.hidden`) rAF runs at ~1 Hz: dispatch `new Event('scroll')` by hand.
- Hard-reload before measuring (repeated HMR inflates mounts ~4×). Machine load skews absolutes 2-3×: interleave A and B on the same page state and compare ratios.
- A React DevTools dev profile is fine for A/B: `measureHostInstance` inflates both sides equally.
- **A memory peak is measured in a capped scope, never on the bare desktop**: `systemd-run --user --scope --unit=<name> -p MemoryMax=6G -p MemorySwapMax=0 -- <cmd>` OOM-kills inside the scope only. While it runs, sample `/sys/fs/cgroup/user.slice/user-$UID.slice/user@$UID.service/app.slice/<name>.scope/`: `memory.peak`, `memory.stat` (`anon` vs `file`, the peak counts page cache) and `cgroup.procs` for who holds it; the directory vanishes with the command. A run that hits the cap exits 137 or 143, and `journalctl --user` names the unit the OOM killer hit.

## Stories headless

Nothing fails in CI when a story breaks. After adding a hook that reads a context, load every story: ids from Storybook's `index.json`, open `iframe.html?id=…` headless, count `body.sb-show-errordisplay`, before and after.

## Probing the dev databases

Servers and credentials are in `dev/fixtures/README.md` (`docker compose up -d --wait`).

- **Only connections whose name carries `(dev)`**; anything I create carries it from the start.
- Scratch roles, users, schemas and tables are created and dropped **in the same command**.
- A claim about what a server accepts goes through the **real driver** when it is about the driver, and over **every schema** of the server.
- A database spun up to verify something is created persistent (named volume, no `--rm`, `--restart unless-stopped`). **Never clean up what I did not have to create**, and never `docker compose down -v` without being asked: it deletes the volumes.
- **A script tested against a throwaway stack runs with the override on every call**, never bare: the defaults of `dev/fixtures/*/load.sh` point at the real dev servers. In zsh, `$OPTS` holding several flags is not word-split — spell the flags out or use an array.
- There is no MySQL 8 container: a MySQL-only behaviour (`CAST(… AS JSON)`, `DEFAULT_GENERATED`) cannot be checked on MariaDB — say so.
