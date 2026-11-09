---
paths:
  - 'src/main.ts'
  - 'src/main-process/**'
  - 'src/preload.ts'
  - 'src/preload/**'
  - 'src/configuration/**'
  - 'src/sql/index.ts'
---

# Main process, preload and IPC

## IPC

- **The main process is not hot-reloaded**: `plugin-vite` rebuilds `main.cjs` but never relaunches Electron, while the renderer takes HMR; `r` in forge's screen relaunches it. Its `hotRestart` option does nothing in forge 8.0.1: the watch build runs in a subprocess that never receives it. After changing an IPC contract, restart the app fully, and say so when a channel's return value changes — a stale handler produces symptoms that look nothing like the change.
- **The context bridge rebuilds an `Error` from `name`, `message` and `stack` alone** and drops every other property. Anything the renderer must read off an error travels as a plain object; only the last hop (a `throw` in a loader) may be error-shaped. Check with `window.sql.x().catch((e) => Object.keys(e))`.
- **A payload the renderer sends is parsed with zod in its handler, never with a hand-written guard**: a schema typed `z.ZodType<ChannelType>` fails the lint when the channel's type moves without it.
- **Before duplicating a write to shared main-process state "to be safe", name the caller that could get in between** and try it. If there is none, the second writer is the bug.
- **Select All is ours, never `role: 'selectAll'`**: the role selects the page's text whatever has the focus. The menu entry sends `EDIT_MENU_CHANNEL.SELECT_ALL` and Ctrl/Cmd+A is caught on `window`; both go to `renderer/selectAll.ts`, which selects the rows of the grid on screen unless the focus is in text, the SQL editor or a dialog.
- **The Edit menu has no Delete entry**: `role: 'delete'` only erases selected text, and beside the grid's Delete key it would read as deleting the selected rows.
- **`AppMenuButton` gives the focus back before an entry runs**: every Edit entry acts on the focused element. The button never takes it (`preventDefault` on `mousedown`), so the element focused at opening is the one remembered; the menu takes it while open, since rc-menu reads its arrows, Enter and Escape on its own list only, and gives it back on close (Escape focuses the button first) and before `clickMenuItem`, Enter's default prevented since rc-menu runs the item on its keydown. The menu it draws is the application menu, read through `GET_MENU` at each opening, and an entry runs as that `MenuItem`'s `click()` in the main process: an item added to `menu.ts` needs nothing else.
- **Every item of `menu.ts` has a `label` from `t()`, a `role` item too**: Electron labels its roles in English whatever the locale. A change of language rebuilds the menu (`languageChanged` in `main.ts`), so what must outlive a rebuild is bound once in `bindMenuListeners` and reads `Menu.getApplicationMenu()`, and an item's `enabled` is computed at build time.
- **Quitting the app rewrites `config.json` from memory** (`saveWindowState`): a file edited while the app runs is lost. Test persistence through the app's own action.
- **One instance per profile** (`requestSingleInstanceLock` in `main.ts`): each instance writes the whole file from its own copy, erasing what another saved. Dev and the installed app share `~/.config/Tiana Tables`, so a `yarn start` beside the installed app brings its window forward and quits; `--user-data-dir` is a separate profile.

## Configuration and encryption

Credentials are encrypted with Electron's `safeStorage`, config in `src/configuration/index.ts`, the safeStorage calls in `src/configuration/encryption.ts`.

- **Use the asynchronous API** (`encryptStringAsync` / `decryptStringAsync` / `isAsyncEncryptionAvailable`): on Linux it probes D-Bus and asks to unlock a locked keyring, where the synchronous one answers "unavailable" for the rest of the process — and disappears in Electron 46.
- **The configuration holds the ciphertext end to end**, in memory as on disk, decrypted in exactly one place: `#connect` in `src/sql/index.ts`. Hence:
  - loading and writing never encrypt, so they cannot fail and stay synchronous — a window move writes the file as it is, and an unreadable password is never overwritten by an empty one;
  - only `addConnectionToConfig` and `editConnection` encrypt, so they are the only async setters and the only writes reporting a keyring failure; nothing is mutated before the password is encrypted;
  - an empty password on an edit means "leave it as it is", which is why the form never receives a password.
- **A locked keyring is not a lost key** (`decryptStringAsync` rejecting as "temporarily unavailable" vs anything else): two `ConnectionFailure` reasons, the first worth a Retry, the second asking for the password again.
- `getSelectedStorageBackend()` describes the legacy detection, not the provider the async API picked, so the "only obfuscated" warning can be pessimistic. Left as is: Electron exposes nothing more precise.
- **`config.json` is written only through `writeConfiguration`, atomically** (`write-file-atomic`, sync): a temporary file renamed over it, so a crash leaves the previous file whole, and at most a `config.json.<number>` orphan after a `kill -9`.
- **Only a missing `config.json` is a first launch**: one that does not parse goes through `recoverUnreadableConfiguration`, whose dialog restores `config.previous.json` (saved at each readable startup), quits, or starts blank, the file kept as `config.json.bak-<date>` — never replaced in place.
- **The configuration file is not validated** (parsed with a cast). A missing or old field is decided in `loadConfiguration` (default engine, a port read with `Number()`), with no migration and no `version` bump.

## Dev tooling (`installReactDevToolsExtension.ts`)

- **`electron-devtools-installer` never refreshes its cache**: a re-download is forced when the cached `.crx` is older than 30 days.
- **React DevTools v7 needs its service worker started before the first navigation** (`serviceWorkers.startWorkerForScope` before `createWindow()`). A reload does not repair a hookless document, so the session that downloads the extension is always hookless.
- **Kill every app instance before measuring startup or extension behaviour**: a leftover one holds the profile's lock, so a new launch only brings it forward and quits. Repeat a run before calling a race fixed.
