---
paths:
  - '**/*.test.ts'
  - '**/*.test.tsx'
  - '**/*.stories.tsx'
  - 'vitest.config.mts'
  - '.storybook/**'
---

# Tests and stories

- **Every new test is checked by breaking what it covers**: a mutation of the code must fail it, or it tests nothing.
- **An expected value is a hand-written literal**, never rebuilt by the code under test (`expect(sql).toBe(dialect.listTables('x').sql)` asserts nothing). For a long statement, assert markers that each name a known bug (`src.ord = tgt.ord`) rather than the whole text. Invariants shared by several implementations are tested once, with a `describe.each` over them (`dialect.contract.test.ts`).
- **Test only what is ours.** When a library replaces hand-written code, the old code's tests go with it: re-asserting a dependency's behaviour pins us to it. Keep a test for a guard or a mapping we decide.
- **An export that exists only for a test goes behind `export const testables = { … }`** (see `configuration/encryption.ts`). A type cannot go there, so do not export one for a test: let the test declare the literal shape it passes.
- **Every story is a test**: the `storybook` project of `vitest.config.mts` renders each one in Playwright's headless Chromium and runs its `play`, so a story that throws fails `yarn test`. Run it alone with `yarn vitest run --project storybook`; it needs `yarn playwright install --only-shell chromium` once.
- **A story types into Monaco through its commands**: `editor.trigger('keyboard', 'type', { text })` on the editor of `monaco.editor.getEditors()`. Monaco reads keys through Chromium's `EditContext`, which `userEvent` never reaches: the value stays as it was, and nothing fails until an assertion.
- **`-u` goes after the file filters**: it takes an optional value (`--update [type]`), so `vitest run -u a.test.ts` reads the path as the update mode, runs the whole suite and updates every snapshot file.
- **The module cache (`fsModuleCache`) is keyed on `yarn.lock`**: a source, config or lockfile change starts it afresh, a package edited by hand in `node_modules` does not — run `yarn vitest --clearCache` after such an edit.
- **The first `yarn test` after a lockfile change can fail story files that never ran**: Vite re-optimizes its dependencies mid-run ("Re-optimizing dependencies because lockfile has changed"), and the files loaded meanwhile fail with "Failed to fetch dynamically imported module". Run it again before reading any failure.
- **Chromatic extracts the stories in a Chrome without `Temporal`, whatever its infrastructure version**: its user agent says `Chrome/106 (Chromatic extract)`, its features say 129–143. `temporal-polyfill/global` stays the first import of `.storybook/preview.tsx`; it keeps a native `Temporal`, so the captures (Chrome 149) and a local Storybook run the real one. Reproduce with `--js-flags=--no-harmony-temporal` and `__STORYBOOK_PREVIEW__.extract()`.
- **`MemoryRouter` navigates synchronously**: a routing regression test uses `createMemoryRouter` with a real `loader` on the target route.
- Keep analysis modules free of **runtime** `monaco-editor` imports (`import type` only), or the node test dies on `window`.
