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

## Renderer / dependencies

- **Never import from `mysql2` in renderer code.** `mysql2` is CommonJS and breaks in the renderer bundle. Import type-only symbols from `mysql2/promise` with `import type`, and runtime values like `Types` from the legacy `mysql` package (see `src/renderer/component/Cell.tsx`).

## Routing

- **Do not upgrade to React Router 7.** The migration was attempted in PR #132 and partially reverted in PR #142 (redirect issues on connect). The project intentionally stays on React Router v6 with its file-name-convention routes in `src/renderer/routes/`. `react-router.config.ts.bak` is a leftover from that aborted migration.

## IPC

- **Channel enums must stay in dedicated `src/preload/*Channel.ts` files.** They are imported by both preload and main; importing any other preload file into the main process breaks the build.
