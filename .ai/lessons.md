# Lessons

Rules learned from past mistakes and audits. Review this file at the start of each session. Add a new entry after any correction from the user.

## Git / PRs

- **No "Generated with Claude" watermark.** The user does not want the `🤖 Generated with Claude Code` footer (or any similar attribution) in PR descriptions, nor `Co-Authored-By: Claude` trailers in commit messages. Omit them even though the default tooling instructions ask for them.

## Documentation

- **Don't trust CLAUDE.md version claims — verify `package.json` first.** An audit (2026-08-17) found CLAUDE.md claiming React 18 and Ant Design 5 while the project was on React 19 and antd 6. Check actual dependency versions before writing version-specific code.
- **When assessing a library's compatibility, check the published npm package, not GitHub issues.** A library-choice review (2026-08-17) wrongly declared glide-data-grid incompatible with React 19 based on a stale open issue — the fix PR had merged. Conversely, a merged PR may be unreleased: run `npm view <pkg> peerDependencies` on `latest` AND on pre-release dist-tags (`npm view <pkg> dist-tags`) to see what is actually installable.
- **Don't rank libraries from memory — check the current major version and its official examples first.** The same review dismissed TanStack Table as "build everything yourself" based on v8-era knowledge; v9 (stable, released 2026) ships official recipes for virtualized rows/columns/infinite scroll, editable cells, sticky pinned columns and cell selection. Browse `examples/` in the repo before estimating build cost.

## Testing

- **Vitest runs in the node environment by default in this repo** (`vitest.config.ts` sets no `environment`). Any test touching the DOM must declare `/** @vitest-environment happy-dom */` at the top of the file, or it will fail with `document is not defined`.

## Performance

- **Attribute performance costs by A/B isolation before naming a culprit.** A TableGrid optimization (2026-08-18) blamed the per-cell `ForeignKeyLink` (context reads + linear FK scan); the user challenged it twice, and ladder benchmarks proved them right: a React component per cell is free (~0%), per-cell styled-components cost ~+15%, and antd `Flex` ~+120% — the framework component was the culprit, not the user's code. Measure each layer separately (swap it for a plain element, compare) before removing it.
- **`memo` protects against re-renders, not mounts.** In a virtualized grid, vertical scrolling _mounts_ new rows continuously — memoization does nothing there; the mount cost of each component layer is what matters.
- **Benchmark hygiene in the Browser pane.** (1) Check `document.hidden`: rAF timings are frame-throttled (~1 Hz) on hidden pages — measure with `PerformanceObserver({ entryTypes: ['longtask'] })` and dispatch `new Event('scroll')` manually. (2) Hard-reload before measuring: repeated HMR updates inflate the page (~4× slower mounts observed). (3) Machine load (test runs, Vite rebuilds) skews absolute numbers ~2-3×: interleave A/B modes on the same page state and compare ratios, never absolutes across runs.

## SQL editor

- **A theme rule that "looks right" may match nothing — check the token the tokenizer actually emits.** `monaco-sql-languages` classifies `JOIN`, `AND`, `OR`, `NOT`, `IN`, `LIKE` and `UNION` as `operator.keyword`, not as keywords, so they come out as `operator.keyword.sql`. Theme rules match by dot segments: `operator.sql` is a _sibling_ branch and never applies, the token falls back to the generic `operator` rule. The same code had worked with Monaco's built-in SQL grammar, whose names differ — swapping a tokenizer silently invalidates every `*.sql` theme rule.
- **Never assert beyond the schema that was actually loaded.** `getAllColumns` and the table list are filtered on the current database, so `other_db.users` cannot be verified. Coloring it anyway would mark typos as valid; the rule is to leave unverifiable names alone. Same reasoning for column warnings: only qualified references to a resolved table are checked, never bare columns (subqueries, CTEs, expression aliases).
- **Do not derive the caret's qualifier from `getSuggestionAtCaretPosition`.** It reports a `column` context only while the name is still empty — `alias.na` becomes a `function` context, and inside a `WHERE` it can return nothing. Read the qualifier from the model instead (`getWordUntilPosition` plus the preceding character). Symmetrically, the alias table must be extracted from the **whole** model, not from the text before the caret: `SELECT e.| FROM employee e` needs the `FROM` clause that follows.
- **Verify syntax highlighting through computed styles, not screenshots.** `getComputedStyle(span).color` over `.view-line span span` gives the exact token colors. And pick a theme whose slots differ: Dracula defines `base0A === base0C`, so tables and aliases render identically there and a screenshot proves nothing.

## Electron dev tooling

- **Only ever run ONE app instance while measuring startup or extension behaviour.** Debugging the React DevTools extension (2026-08-18) produced contradictory results — the same code "worked" at 11:15 and failed at 11:19 — because several `yarn start` instances were alive at once, all sharing the same `userData` profile and extension store. It led to a confidently wrong A/B conclusion. Kill every instance (`Get-Process electron | Stop-Process`) before each measurement, and repeat a run before calling a race fixed.
- **`electron-devtools-installer` never refreshes its cache.** `downloadChromeExtension` returns early when `<userData>/extensions/<id>` exists, so a CRX downloaded years ago is reused forever — that is how React DevTools 5.0.2 (March 2024) ended up facing React 19 and reporting "Unsupported React version detected". `installReactDevToolsExtension.ts` now forces a re-download when the cached `.crx` is older than 30 days.
- **React DevTools v7 needs its service worker started before the first navigation.** The devtools hook is no longer a static content script: the MV3 service worker registers it via `chrome.scripting.registerContentScripts`, and Electron only puts that registration in force once the worker runs. Hence the awaited `session.defaultSession.serviceWorkers.startWorkerForScope(extension.url)` before `createWindow()` (~1-2 s of dev startup). Reloading the window does **not** repair a document that loaded without the hook: Vite's react-refresh then owns `__REACT_DEVTOOLS_GLOBAL_HOOK__` as a non-configurable property and `installHook.js` gives up. The session that downloads the extension is therefore always hookless — only the next start works.

## Component design

- **`styled(AnotherStyledComponent)` composition folds into one DOM element — it is not the "+15% per extra styled-component" the TableGrid benchmark warns about.** Verified in the browser: chaining `styled(BaseCell)` for `NullSpan`/`StringSpan`/`NumberSpan`/etc. in `Cell.tsx` still renders a single `<div>` with two class names, no wrapper. The benchmark's cost applies to an _additional element actually mounted_ per cell (a wrapper span, an antd component), not to how many `styled(...)` calls sit in the chain that produces that one element. Don't collapse per-variant styled components into one with a color prop to "save" a cost that composition never incurs.
- **In `TableGrid`'s virtualized body, a per-cell closure (e.g. `onDoubleClick={() => ...}`) is effectively free — wire it where the data already lives (`GridCell`, which already has `column`/`value`), not via DOM delegation on a parent (`<tbody onDoubleClick>` + `data-*` attributes + `closest()`).** The real cost ranking measured in this codebase is antd components (~+120%) > styled-components per extra rendered element (~+15%) > plain closures/components (~0%). Delegation trades a free in-scope lookup for DOM traversal to reconstruct what was already known — only worth it if the per-item cost would otherwise be a mounted component.

## ORM / framework conventions

- **Don't special-case one ORM's convention when it doesn't generalize.** Considered and rejected: parsing Doctrine DBAL's `(DC2Type:json)` column-comment marker to decide JSON rendering. Doctrine is essentially alone in encoding type metadata in SQL comments (DBAL 2/3 introspects a live schema with no code-side model; DBAL 4 dropped the markers for platform type maps). Other ORMs (Rails, EF Core, Prisma, Django, SQLAlchemy, Hibernate, TypeORM) keep a code-side schema and never needed this. A framework-specific heuristic here is a dead end for every other ORM/raw-SQL user and doesn't even survive Doctrine's own next major version.
- **Prefer detecting behavior from the value itself over trusting metadata from a specific convention.** A column's declared SQL type can lie about the data (JSON-in-text-column is common; MariaDB's `JSON` type is itself just an alias for `LONGTEXT` + a `CHECK` constraint, so even the "real" type can mislead). `cellValueToText` (`src/renderer/component/cellValueToText.ts`) tests the value at runtime — starts with `{`/`[` and `JSON.parse` succeeds — rather than branching on column comments or ORM markers. Generalize by capability, not by vendor convention.

## Renderer / dependencies

- **Never import from `mysql2` in renderer code.** `mysql2` is CommonJS and breaks in the renderer bundle. Import type-only symbols from `mysql2/promise` with `import type`, and runtime values like `Types` from the legacy `mysql` package (see `src/renderer/component/Cell.tsx`).
- **Do not add a date library, and question any dependency reachable only through antd.** Building the cell editor (2026-08-24) I reached for antd's `DatePicker`, which drags in `dayjs`; the user rejected it — the app runs on Electron, so the platform is already modern. Two lessons: (1) a `dayjs` that resolves only because antd depends on it is an undeclared dependency, and declaring it is a real cost for a date picker; (2) the need was imaginary — a MySQL `DATE`/`DATETIME` is a _wall clock_ with no offset, so `<Input type="datetime-local">` plus the punctuation swap of `src/renderer/component/CellEditor/dateTimeText.ts` (`2026-01-15 10:30:00` ⇄ `2026-01-15T10:30:00`) does the job with no library at all. Parsing the literal into a `Date`/`Temporal.Instant` would attach a time zone the stored value never had and shift it on the way back. Reach for a date library only when actual calendar arithmetic is needed.

## i18n

- **Never build a translation key at the call site.** `t(\`cell.detail.readOnly.${reason}\`)`was rejected (2026-08-24): a key that only exists once a variable is interpolated is invisible to any extractor, unverifiable against`locales/type.ts`, and impossible to grep. One message with several variants stays **one key** holding an ICU `select`, chosen at runtime from the variable: `t('cell.detail.readOnly', { reason })`against`'{reason, select, binary {…} other {…}}'`. `i18next-icu`+`intl-messageformat`are installed and wired in`src/i18n.ts`. Always give the `select`an`other`branch. Note on French: ICU treats`'`as an escape only before`{`, `}`or another`'`, so `n'identifie`is safe as written —`'{` would not be.

## SQL semantics

- **A `PRIMARY KEY` column is never NULL — MySQL forces `NOT NULL` on all of them.** So the `WHERE` that targets a row uses plain `=`; the null-safe `<=>` is for the _guarded_ column only, where NULL is a real value. Writing `<=>` on the key was flagged (2026-08-24) precisely because it made a reader wonder when a key could be NULL. `getPrimaryKeys` reads `SHOW KEYS … WHERE Key_name = 'PRIMARY'`, never a unique index, so there is no case to hedge against. Encode the impossibility in the type too: `PrimaryKeyValue = Exclude<SqlBoundValue, null>`.
- **Types describing an _action_ do not belong in `src/sql/types.ts`.** That file holds the shapes MySQL answers with (`RowDataPacket` derivatives). A command and its outcome — `UpdateCellRequest`, `UpdateCellOutcome` — live in their own module next to the code that serves them (`src/sql/updateCell.ts`), together with any result row that exists only to serve them.

## Enums over string unions for external vocabularies

- **A closed set of values coming from outside the code gets a real enum, not string literals.** Two places were corrected (2026-08-24): the `DATA_TYPE` values of INFORMATION_SCHEMA, now `DataType` in `src/sql/dataType.ts`, and the reasons a cell is read-only, now `NotEditableReason` in `src/sql/columnEditing.ts` (which doubles as the ICU selector of its message). Same for `ValidationError` in `CellEditor/editableValue.ts`. Values read from the database stay typed `string` and are _compared_ against enum members — narrowing them to the enum would lie, since a server can answer something absent from the list (MariaDB's `inet6`, `uuid`).
- **The rule covers internal discriminants too, not just values crossing a boundary.** `EditorKind` was left as a string union with bare `case 'json':` labels and was corrected (2026-08-24): it is an enum, and `CellEditor` switches on `EditorKind.Json` & co. A closed set of names gets an enum, wherever it comes from.
- **`typeof x === 'undefined'` is ES5 habit — write `x === undefined`.** `typeof` is only needed for an identifier that may not be _declared_; for a variable, a parameter or a property it is noise. Applied across `src/` (2026-08-24).
- **Check whether the driver already exports the constants before writing a list.** `mysql2` (and `mysql`, the one the renderer may import) exports `Types` — the **wire protocol** field types. That is a _different_ vocabulary from INFORMATION_SCHEMA's `DATA_TYPE`, and mixing them up is easy: the protocol collapses `TEXT`/`BLOB` into one type and announces an `ENUM` column as a plain string. Rule: read `Types` wherever the protocol can answer (numbers, dates, JSON — this also keeps `resolveEditorKind` in step with `Cell.tsx`), and `DATA_TYPE` only where it cannot (`enum`/`set`, `text` vs `blob`). Do not hand-maintain a parallel list of either.

## Routing

- **Do not upgrade to React Router 7.** The migration was attempted in PR #132 and partially reverted in PR #142 (redirect issues on connect). The project intentionally stays on React Router v6 with its file-name-convention routes in `src/renderer/routes/`. `react-router.config.ts.bak` is a leftover from that aborted migration.

## IPC

- **Channel enums must stay in dedicated `src/preload/*Channel.ts` files.** They are imported by both preload and main; importing any other preload file into the main process breaks the build.
