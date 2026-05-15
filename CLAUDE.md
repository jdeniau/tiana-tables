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
yarn knip             # Run knip to find unused dependencies, exports and files
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
- **Renderer process** (`src/renderer/`) — React 18 + React Router 6 SPA rendered in Chromium.

### IPC Channel Pattern

Communication between the renderer and main process goes through typed IPC channels:

1. `src/preload/*Channel.ts` — defines a `XXXX_CHANNEL` enum (e.g., `SQL_CHANNEL`, `CONFIGURATION_CHANNEL`). These files **must stay separate** — they are imported by both preload and main, and you cannot import preload files into the main process.
2. `src/preload/xxx.ts` — exposes channel methods to the renderer (e.g., `window.sql.executeQuery()`).
3. `src/main-process/xxx.ts` — binds IPC handlers for those channels.

### Renderer

`src/renderer/routes/` uses React Router v6 file-based routing with dynamic segments: `$connectionSlug`, `$databaseName`, `$tableName` (e.g., `connections.$connectionSlug.$databaseName.$tableName.tsx`).

State is managed via React Context (no Redux/Zustand). Contexts live in `src/contexts/` and cover: connection, database, table list, column metadata, foreign keys, theme, and configuration.

`src/renderer/component/` contains all UI components. Storybook stories are colocated as `Component.stories.tsx`.

### Configuration & Encryption

Connection credentials are encrypted with Electron's `safeStorage` API and stored in the user's home directory. Config loading/saving lives in `src/configuration/index.ts`.

### Translations

Translation files are in `locales/` (`en.ts`, `fr.ts`). English (`en.ts`) is the reference locale — its structure defines the `Translation` type in `locales/type.ts`. Add new keys to `en.ts` first, then mirror them in `fr.ts`.

## Key Libraries

| Library                   | Purpose                         |
| ------------------------- | ------------------------------- |
| Electron 41               | Desktop shell                   |
| React 18 + React Router 6 | UI framework and routing        |
| Ant Design 5              | UI component library            |
| Monaco Editor             | SQL editor (VS Code's editor)   |
| mysql2/promise            | MySQL/MariaDB driver            |
| styled-components 6       | CSS-in-JS                       |
| i18next + react-i18next   | EN/FR internationalization      |
| Vite 8 + electron-forge   | Build tooling                   |
| Vitest 4                  | Testing (happy-dom environment) |
| Storybook 8               | Component development           |
