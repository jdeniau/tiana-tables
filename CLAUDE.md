# Project Guidelines

## Language rules

- **ALWAYS answer in the same language as the user.** If the user speaks French, answer in French. This also applies to plans and explanations.
- **Code and all comments in code MUST always be in English.**

## Workflow Orchestration

### 1. Plan first

- For ANY non-trivial task (3+ steps, architectural decisions, or touching multiple packages), start by writing a clear plan before editing code.
- Write detailed specs upfront to reduce ambiguity — list the files you'll touch, the contracts you'll change, and the tests you'll add.
- If something goes sideways mid-task, **STOP and re-plan immediately** — don't keep pushing through a broken approach.
- Plans aren't just for building: use them for verification and refactoring steps too.

### 2. Keep context focused

- One task = one focused thread. Don't mix unrelated changes.
- For complex problems, decompose into smaller independent steps and tackle them sequentially.
- Offload exploration and research (reading unfamiliar packages, scanning the codebase) into dedicated steps before jumping to implementation.

### 3. Self-Improvement Loop

- After ANY correction from the user: update `.ai/lessons.md` with the pattern.
- Write rules for yourself that prevent the same mistake from happening again.
- Ruthlessly iterate on these lessons until the mistake rate drops.
- At the start of a session, review `.ai/lessons.md` for relevant project context.

### 4. Verification before "done"

- **Never mark a task complete without proving it works.**
- When changing existing behavior, diff the before/after explicitly and explain what changed.
- Ask yourself: _"Would a staff engineer approve this PR?"_ If not, iterate.

## Commands

```sh
yarn install          # Install dependencies (requires Node.js + corepack enable)
yarn start            # Run the Electron app in development mode
yarn test             # Run Vitest test suite
yarn test <file>      # Run a single test file
yarn lint             # Type-check + ESLint
yarn lint:types       # TypeScript type check only
yarn lint:eslint      # ESLint only
yarn storybook        # Start Storybook dev server on port 6006
yarn make             # Build distributable packages
```

## Architecture

Tiana Tables is an **Electron desktop app** for browsing and querying MySQL/MariaDB databases. It follows the standard Electron three-process model:

- **Main process** (`src/main.ts`) — app lifecycle, window management, config, IPC handlers. Imports from `src/configuration/`, `src/sql/`, and `src/main-process/`.
- **Preload script** (`src/preload.ts`, `src/preload/`) — the secure bridge between renderer and main. Exposes typed APIs to the renderer via `contextBridge`.
- **Renderer process** (`src/renderer/`) — React 19 + React Router 6 SPA rendered in Chromium.

### IPC Channel Pattern

Communication between the renderer and main process goes through typed IPC channels:

1. `src/preload/*Channel.ts` — defines a `XXXX_CHANNEL` enum (e.g., `SQL_CHANNEL`, `CONFIGURATION_CHANNEL`). These files **must stay separate** — they are imported by both preload and main, and you cannot import preload files into the main process.
2. `src/preload/xxx.ts` — exposes channel methods to the renderer (e.g., `window.sql.executeQuery()`) via `bindChannel.ts`.
3. Each domain module exposes a `bindIpcMain`-style function that registers the handlers; they are all called from `src/main.ts`: `bindIpcMainConfiguration` (`src/configuration/index.ts`), `bindIpcMainSqlFileStorage` (`src/main-process/sqlFileStorage.ts`) and `connectionStackInstance.bindIpcMain` (`src/sql/index.ts`).

### Renderer

`src/renderer/routes/` uses React Router v6 file-based routing with dynamic segments: `$connectionSlug`, `$databaseName`, `$tableName` (e.g., `connections.$connectionSlug.$databaseName.$tableName.tsx`).

State is managed via React Context (no Redux/Zustand). Contexts live in `src/contexts/`: `ConnectionContext`, `DatabaseContext`, `DatabaseListContext`, `TableListContext`, `AllColumnsContext`, `ForeignKeysContext`, `ThemeContext`, `ConfigurationContext`.

`src/renderer/component/` contains all UI components. Storybook stories are colocated as `Component.stories.tsx`. Shared hooks live in `src/renderer/hooks/`, theming in `src/renderer/theme/`.

### Configuration & Encryption

Connection credentials are encrypted with Electron's `safeStorage` API and stored in the user's home directory. Config loading/saving lives in `src/configuration/index.ts`.

### Translations

Translation files are in `locales/` (`en.ts`, `fr.ts`). English (`en.ts`) is the reference locale — its structure defines the `Translation` type in `locales/type.ts`. Add new keys to `en.ts` first, then mirror them in `fr.ts`.

## Key Libraries

| Library                    | Purpose                                                      |
| -------------------------- | ------------------------------------------------------------ |
| Electron 41                | Desktop shell                                                |
| React 19 + React Router 6  | UI framework and routing                                     |
| Ant Design 6               | UI component library (except the data grid)                  |
| TanStack Table 9 + Virtual | Data grid (`TableGrid`): headless table + row virtualization |
| Monaco Editor              | SQL editor (VS Code's editor)                                |
| mysql2/promise             | MySQL/MariaDB driver (main process)                          |
| styled-components 6        | CSS-in-JS                                                    |
| i18next + react-i18next    | EN/FR internationalization                                   |
| Vite 8 + electron-forge    | Build tooling                                                |
| Vitest 4                   | Testing (node env; happy-dom opt-in per file)                |
| Storybook 8                | Component development                                        |
| TypeScript 6               | Type checking                                                |

### SQL statements

**A query sent to the server MUST always be a single statement.** `multipleStatements`
stays off in the mysql2 connection, and the editor is expected to send one
statement at a time.

When the editor holds several statements, they are to be split and handled
independently, and the one **under the caret** is the one that gets sent —
and the one that completion, highlighting and validation work on.

`dt-sql-parser` exposes `splitSQLByStatement`, but beware: it returns `null` as
soon as the input has any syntax error (`SELECT FROM t1 a` included), so it
cannot be used as a "is the tail unfinished?" check. Splitting on the `;` tokens
of `getAllTokens` is error-tolerant, since lexing never fails.

### SQL editor

The editor is Monaco, with two SQL packages plugged into it:
`monaco-sql-languages` for the `mysql` language and its Monarch tokenizer
(lexical), and `dt-sql-parser` for the real grammar (ANTLR). The completion and
diagnostics of `monaco-sql-languages` are **disabled** — they run in a worker
built on Monaco's pre-0.45 API and never answer — and rebuilt on
`dt-sql-parser` in `useCompletion.tsx`.

- `src/sql/mysqlParser.ts` — the single `MySQL` parser instance, plus
  `collectEntities`, which tolerates the unfinished tail of a query being typed.
- `MonacoEditor/queryAnalysis.ts` — one read of a query against the schema,
  producing what to color (table names, aliases) and what to warn about
  (unknown columns). No runtime monaco import, so it stays testable in node.
- `MonacoEditor/useQuerySchema.ts` — the schema, indexed once from the contexts.
- `MonacoEditor/useSemanticTokens.ts` — colors `table.sql` and `alias.sql`.
- `MonacoEditor/useCompletion.tsx` — completion and model markers.

**The schema we hold is the current database only**: `getAllColumns` and the
table list are both filtered on `TABLE_SCHEMA = <current database>`. Two
decisions follow, and both are deliberate:

- a table qualified by **another** database is never colored — `other_db.users`
  cannot be told apart from a typo, and guessing would color mistakes as valid;
- unknown columns are reported as **warnings**, only on qualified references
  (`alias.column`) whose table we resolved. Bare columns are never checked: they
  may come from a subquery, a CTE or an expression alias, and a wrong warning on
  valid SQL is worse than no warning.

Deep details — token names, semantic token wiring, position conventions, parser
quirks — live in the `sql-editor` skill.

### Gotchas

- **Tests default to the node environment.** Add `/** @vitest-environment happy-dom */` at the top of a test file that needs the DOM (see `src/renderer/routes/connections.$connectionSlug.$databaseName.test.tsx`).
- **In the renderer, import `Types` from `mysql` (v2), not `mysql2`** — `mysql2` is a CommonJS package and fails when imported in the renderer (see `src/renderer/component/Cell.tsx`).
- **React Router stays on v6.** A migration to React Router 7 (PR #132) was partially reverted (PR #142); `react-router.config.ts.bak` at the root is a leftover of that attempt.
- **`TableGrid` uses TanStack Table v9 — its API differs from v8 tutorials.** Features are imported explicitly and passed to `useTable({ features, ... })`, headers render via `<table.FlexRender />`. Work from the official `examples/react/` in the TanStack repo, not from blog posts. The scroll element is stored in a state (not a ref) because the virtualizer reads it in a layout effect that runs before the parent ref attaches.
- **In the virtualized body of `TableGrid`, React components per cell are fine — per-cell antd components are not, and per-cell styled-components must stay scarce.** Scrolling mounts hundreds of cells per tick. An A/B ladder benchmark (2026-08-18, 1 000×40 story, dev mode, long tasks per 1 600-cell page jump) measured: plain DOM ≈ a React component (~0 %) < + one styled-components span per cell (~+15 %) < + antd `Flex` (~+120 %, long tasks on every scroll tick). The grid renders `GridCell` → `Cell.tsx` (the per-type renderer, kept because cell types will multiply) → one typed styled span, ~1.5× plain and no long task per tick. `Cell.tsx` has no layout wrapper on purpose: the `<td>` (`.tg-cell`) provides the flex context — don't reintroduce a wrapper. The inline cell editor can safely be a rich component on the single edited cell. Benchmark hygiene rules live in `.ai/lessons.md`.
