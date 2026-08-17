# Lessons

Rules learned from past mistakes and audits. Review this file at the start of each session. Add a new entry after any correction from the user.

## Documentation

- **Don't trust CLAUDE.md version claims — verify `package.json` first.** An audit (2026-08-17) found CLAUDE.md claiming React 18 and Ant Design 5 while the project was on React 19 and antd 6. Check actual dependency versions before writing version-specific code.

## Testing

- **Vitest runs in the node environment by default in this repo** (`vitest.config.ts` sets no `environment`). Any test touching the DOM must declare `/** @vitest-environment happy-dom */` at the top of the file, or it will fail with `document is not defined`.

## Renderer / dependencies

- **Never import from `mysql2` in renderer code.** `mysql2` is CommonJS and breaks in the renderer bundle. Import type-only symbols from `mysql2/promise` with `import type`, and runtime values like `Types` from the legacy `mysql` package (see `src/renderer/component/Cell.tsx`).

## Routing

- **Do not upgrade to React Router 7.** The migration was attempted in PR #132 and partially reverted in PR #142 (redirect issues on connect). The project intentionally stays on React Router v6 with its file-name-convention routes in `src/renderer/routes/`. `react-router.config.ts.bak` is a leftover from that aborted migration.

## IPC

- **Channel enums must stay in dedicated `src/preload/*Channel.ts` files.** They are imported by both preload and main; importing any other preload file into the main process breaks the build.
