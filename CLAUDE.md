# Project Guidelines

## Language

- **ALWAYS answer in the same language as the user.** If the user speaks French, answer in French. This also applies to plans and explanations.
- **Code and all comments in code MUST always be in English.**

## How to work

### Plan, then prove

- For any non-trivial task (3+ steps, an architectural decision, several packages), write a plan before editing: the files touched, the contracts changed, the tests added. If something goes sideways, **stop and re-plan** rather than push through.
- One task, one thread: no unrelated change. A pre-existing problem found on the way is named, not swept in.
- **Never call a task done without proving it works.** When behaviour changes, diff before/after explicitly and say what changed. Would a staff engineer approve the PR?

### Measure, don't assume

The mistake made most often here. Before code is built on a claim, or a sentence is written about it:

- **what a server accepts** costs a container: the `(dev)` servers, through the real driver when it is about the driver, on every schema of the server;
- **what the app does** — a mount, a timing, focus, a tooltip, a performance cost — is run, not read (the `verify-live` skill);
- **what a library does** comes from the guide and examples of the installed major, the published package (`npm view`) and a run — not from memory, GitHub issues or the shape of its source. Versions come from `package.json`, not from docs;
- **a caveat or a limitation in a recap** is measured first, then named part by part.

### Git

- **Never commit or push without being told to, in that very message.** Staging is fine. A review is walked hunk by hunk: contract → implementation → main process → IPC → renderer → fixtures → docs (the `interactive-review` skill stages the approved hunks, or marks a PR's files as viewed).
- **Markdown is never hard-wrapped** — `.md` files, PR descriptions, issues, review comments: one paragraph, or one list item, per line. Every renderer reflows it, and a wrapped sentence escapes `grep` and turns a one-word edit into a reflowed paragraph. Only commit messages wrap, at 72 columns: `git log` is a terminal.
- `eslint --fix` only on files named explicitly, checking it moved imports and nothing else. Never `prettier --write` a whole directory.

### Before handing a change over

- `yarn lint && yarn knip && yarn test` are clean (a PostToolUse hook runs them after every edit).
- Every new test has been checked by breaking what it covers.
- List the comment blocks the diff adds that run over two lines, and every `//` pair: each justifies itself or becomes one line. Re-read the comments above what a refactor touched — a stale comment is worse than a long one.
- After a change to the main process or an IPC contract, say the app needs a full restart.

### Learning from corrections

After a correction, write one rule where it will be loaded when it matters: the `.claude/rules/` file whose `paths` cover the code, the relevant skill, or this file when it is cross-cutting — or needed when _creating_ a file, since a path rule loads only when a matching file is read. Format: **one bold sentence stating the rule**, then the non-obvious mechanism or how to check it, three lines at most. No date, quote or story: those go in the commit message. Update a rule rather than add a near-duplicate, and delete one that became false.

## Writing code

- **A comment states what the code cannot.** A docblock is one line by default; a second line must be something the signature and the next statements do not say. Never narrate the reasoning, justify a design (commit message) or describe a defunct alternative. Break a comment at a thought (comma, colon, dash, full stop), never mid-sentence — a long line beats a wrapped one.
- **Before inventing a shape, grep for an existing convention** (`testables`, `SqlErrorComponent`, `fill`, a `TabStrip` variant…).
- **A name says what the value holds in this code**, as the CSS property or type it ends up in would (`selectedBorderColor`, not the design word `rule`). A predicate names the exact set it accepts (`isNullish`, not `isNull`).
- **A helper module's name differs from every PascalCase component of its directory by more than case**: on macOS and Windows, `./TableTabs` resolves to `tableTabs.ts` first, and nothing warns on Linux. Check with `ls | tr 'A-Z' 'a-z' | sort | uniq -d`.
- **A closed set of values gets an enum**, never bare string literals — including a library's string union.
- **A derived value is written as its formula in theme tokens** (`0.6 * fontScale.base`), not measured at runtime.
- **Reach for a library before hand-rolling**; a circumstantial reason to hand-roll is re-checked before the code lands.

## Talking to the user

- **A base16 slot is never written alone: its role follows in brackets** — `base07 [texte d'emphase]`, `base0D [accent]`, `base02 [fond de sélection]`, `base00 [fond]`, `base03 [filets, texte secondaire]` (roles from the slot table of `DESIGN.md`).
- **A library internal is explained by what it does on screen, with the before/after values**: "antd recomputes the accent for dark themes, `#36f9f6` came out as `#31d7d4`". The token name can follow in a code span.
- **No design jargon**: say « le dossier de design », « la maquette », « la couleur », never « handoff », « mock », « slot ».
- **A disagreement between two sources is presented as a decision**: what each option looks like on a dark and a light theme, which one the mockup shows, and a recommendation.

## Commands

```sh
yarn install          # Install dependencies (requires Node.js 26 + corepack, see Environment)
yarn start            # Run the Electron app in development mode
yarn test             # Run Vitest test suite
yarn test <file>      # Run a single test file
yarn knip             # Run knip to find unused dependencies, exports and files
yarn lint             # Type-check + ESLint
yarn lint:types       # TypeScript type check only
yarn lint:eslint      # ESLint only
yarn storybook        # Start Storybook dev server on port 6006
yarn make             # Build distributable packages
```

## Environment

- **Node 26**: it ships `Temporal` natively, as Electron 44 does, so the tests run on the same API with no polyfill. Node ships corepack no more since 25: `npm install -g corepack && corepack enable yarn`.
- **The Electron binary is not downloaded by `yarn install`** (no `postinstall` since Electron 42): the `electron` bin fetches it on first run, `start` / `package` / `make` / `publish` chain `install-electron` themselves, and a script calling `electron-forge` directly runs `yarn install-electron` first.
- **In a cloud session, install the dependencies first**, fetching Yarn from npm: `COREPACK_NPM_REGISTRY=https://registry.npmjs.org yarn install` (the proxy refuses `repo.yarnpkg.com`). A hook that fails with no output is a tool that could not start: check `node_modules` before re-reading the edit.
- **Dev databases**: `docker compose up -d --wait` starts `tiana-dev-mysql` (MariaDB 11, `127.0.0.1:13306`, `root` / `devpassword`) and `tiana-dev-postgres` (PostgreSQL 18, `127.0.0.1:15432`, `postgres` / `devpassword`), both with database `tiana_dev` holding the same "Le Fil" dataset (details in `dev/fixtures/README.md`). **Never open a connection whose name lacks `(dev)`**, and name every connection created `… (dev)`. Never `docker compose down -v` without being asked.

## Architecture

Tiana Tables is an **Electron desktop app** for browsing and querying MySQL/MariaDB and PostgreSQL databases, in the standard three-process model:

- **Main process** (`src/main.ts`) — app lifecycle, window management, config, IPC handlers. Imports from `src/configuration/`, `src/sql/`, and `src/main-process/`.
- **Preload script** (`src/preload.ts`, `src/preload/`) — the secure bridge, exposing typed APIs to the renderer via `contextBridge`.
- **Renderer process** (`src/renderer/`) — React 19 + React Router 6 SPA.

### IPC channels

1. `src/preload/*Channel.ts` defines a `XXXX_CHANNEL` enum. These files **must stay separate**: preload and main both import them, and no other preload file may be imported into the main process.
2. `src/preload/xxx.ts` exposes the channel to the renderer (`window.sql.executeQuery()`) via `bindChannel.ts`.
3. Each domain registers its handlers from `src/main.ts`: `bindIpcMainConfiguration` (`src/configuration/index.ts`), `bindIpcMainSqlFileStorage` (`src/main-process/sqlFileStorage.ts`), `bindIpcMainClipboard` (`src/main-process/clipboard.ts`), `connectionStackInstance.bindIpcMain` (`src/sql/index.ts`).

### Renderer

`src/renderer/routes/` uses file-name routes with dynamic segments `$connectionSlug`, `$databaseName`, `$tableName`. State is React Context (no Redux/Zustand), in `src/contexts/`. UI components live in `src/renderer/component/` with colocated `*.stories.tsx`; hooks in `src/renderer/hooks/`, theming in `src/renderer/theme/`.

### Design system

The rules are in `DESIGN.md`: one background (base00), structure by 1px base03 hairlines, radius 0, 24px controls, mono everywhere except region names, the accent (base0D) as a mark only. Its "Where the values live" section says which file owns each value (antd tokens in `ThemeContext`, our accessors in `renderer/theme`, the title bar's colours through `frame`), and `src/renderer/component/Style/` holds the frame components that routes compose and never rebuild.

### Configuration and encryption

Credentials are encrypted with the **asynchronous** `safeStorage` API, and the configuration holds the **ciphertext end to end**: it is decrypted in exactly one place, `#connect` in `src/sql/index.ts`. The consequences are in `.claude/rules/main-process.md`.

### SQL engines

A connection has an **engine** (`DatabaseEngine`, `src/sql/engine.ts`): MySQL (MariaDB included) or PostgreSQL. What differs lives in three places keyed by engine, and nowhere else — no `if (engine === …)` in between: `src/sql/dialect/` (SQL text, no driver import, so the renderer loads it), `src/sql/driver/` (main process only, lazily imported), `src/sql/parser/` with `MonacoEditor/language.ts` (the editor's grammar). **The UI's "database" is a PostgreSQL schema**, so routing and contexts are the same for both engines. Adding or changing an engine: the `sql-engines` skill.

### SQL statements

**A query sent to the server is always a single statement**: `multipleStatements` stays off on mysql2, the PostgreSQL driver always uses the extended protocol. When the editor holds several statements, `src/sql/splitStatements.ts` splits them: the one **under the caret** is sent, and the submit button can run them all in order, stopping at the first error (`RunMode`, `src/sql/runMode.ts`). The caret statement is decided in the action, from the content plus the caret offset (`RawSqlEditorHandle`). Split on the `;` tokens of `getAllTokens` (lexing never fails, and a token's `channel` tells code from comments) — never with `splitSQLByStatement`, which returns `null` on any syntax error.

### SQL editor

Monaco, with `monaco-sql-languages` for the `mysql` / `pgsql` languages and their tokenizers, and `dt-sql-parser` for the grammar. The completion and diagnostics of `monaco-sql-languages` are **disabled** (their worker never answers) and rebuilt on `dt-sql-parser` in `useCompletion.tsx`. **The schema held is the current database only**, so a table qualified by another database is never coloured, and unknown columns are warnings on qualified references to a resolved table only — never on bare columns (subqueries, CTEs, expression aliases). Everything else: the `sql-editor` skill.

### Translations

`locales/en.ts` is the reference locale (it defines `locales/type.ts`): add keys there first, then mirror them in `fr.ts`.

## Key libraries

| Library                    | Purpose                                                      |
| -------------------------- | ------------------------------------------------------------ |
| Electron 44                | Desktop shell                                                |
| React 19 + React Router 6  | UI framework and routing (stays on v6)                       |
| Ant Design 6               | UI component library (except the data grid)                  |
| TanStack Table 9 + Virtual | Data grid (`TableGrid`): headless table + row virtualization |
| Monaco Editor              | SQL editor (VS Code's editor)                                |
| mysql2/promise             | MySQL/MariaDB driver (main process)                          |
| pg                         | PostgreSQL driver (main process)                             |
| zod                        | Parsing what a server answers (main process)                 |
| styled-components 6        | CSS-in-JS                                                    |
| i18next + react-i18next    | EN/FR internationalization (ICU messages)                    |
| Vite 8 + electron-forge    | Build tooling                                                |
| Vitest 4                   | Testing (node env; happy-dom opt-in per file)                |
| Storybook 8                | Component development                                        |
| TypeScript 6               | Type checking                                                |

## Gotchas

- **Tests default to the node environment.** A test file that needs the DOM starts with `/** @vitest-environment happy-dom */`.
- **A date is the server's text from the driver to the renderer**, as a `DECIMAL` is: a typed value kept as text so that nothing is lost, its `FieldKind` telling how to read it, and what the server reads back. It becomes Temporal only where it is computed on (`utils/dateFormatter.ts`); a Temporal object crosses neither IPC (not clonable) nor the context bridge (it arrives as `{}`).
- **The drivers are main-process only.** `mysql2` and `pg` are CommonJS and fail in the renderer, which reaches SQL through `src/sql/dialect/` alone; the MySQL dialect escapes literals with `mysql` (v2), the one driver package the renderer can load. A column's type reaches the renderer as a `FieldKind`, never as a wire-protocol number.

## Where knowledge lives

| Place                           | Loaded                                               | Holds                                                                                                         |
| ------------------------------- | ---------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| this file                       | every session                                        | how to work, architecture, invariants, cross-cutting rules                                                    |
| `DESIGN.md`                     | when working on layout                               | the design rules                                                                                              |
| `.claude/rules/ui.md`           | reading `src/renderer/`, `src/contexts/`, `locales/` | styling, antd, state, navigation, translations                                                                |
| `.claude/rules/table-grid.md`   | reading the grid, cells, cell editor                 | TanStack v9, per-cell performance, copy formats                                                               |
| `.claude/rules/routing.md`      | reading routes, `app.tsx`                            | loaders, derived state, React Router v6                                                                       |
| `.claude/rules/sql.md`          | reading `src/sql/`                                   | binding, escaping, enums, casts, parsing answers                                                              |
| `.claude/rules/main-process.md` | reading main, preload, configuration                 | IPC, encryption, dev tooling                                                                                  |
| `.claude/rules/tests.md`        | reading tests and stories                            | what a test must prove                                                                                        |
| `.claude/rules/build.md`        | reading `package.json`, patches, build config        | dependencies, knip, the RPM patches                                                                           |
| `.claude/skills/*`              | on demand                                            | `sql-engines`, `sql-editor`, `base16-themes`, `verify-live`, `antd`, `github-pr-review`, `interactive-review` |
