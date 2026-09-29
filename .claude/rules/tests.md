---
paths:
  - '**/*.test.ts'
  - '**/*.test.tsx'
  - '**/*.stories.tsx'
  - 'vitest.config.ts'
  - '.storybook/**'
---

# Tests and stories

- **Every new test is checked by breaking what it covers**: a mutation of the code must fail it, or it tests nothing.
- **An expected value is a hand-written literal**, never rebuilt by the code under test (`expect(sql).toBe(dialect.listTables('x').sql)` asserts nothing). For a long statement, assert markers that each name a known bug (`src.ord = tgt.ord`) rather than the whole text. Invariants shared by several implementations are tested once, with a `describe.each` over them (`dialect.contract.test.ts`).
- **Test only what is ours.** When a library replaces hand-written code, the old code's tests go with it: re-asserting a dependency's behaviour pins us to it. Keep a test for a guard or a mapping we decide.
- **An export that exists only for a test goes behind `export const testables = { … }`** (see `configuration/encryption.ts`). A type cannot go there, so do not export one for a test: let the test declare the literal shape it passes.
- **Every story is a test**: the `storybook` project of `vitest.config.ts` renders each one in Playwright's headless Chromium and runs its `play`, so a story that throws fails `yarn test`. Run it alone with `yarn vitest run --project storybook`; it needs `yarn playwright install --only-shell chromium` once.
- **Chromatic extracts the stories in a Chrome without `Temporal`, whatever its infrastructure version**: its user agent says `Chrome/106 (Chromatic extract)`, its features say 129–143. `temporal-polyfill/global` stays the first import of `.storybook/preview.tsx`; it keeps a native `Temporal`, so the captures (Chrome 149) and a local Storybook run the real one. Reproduce with `--js-flags=--no-harmony-temporal` and `__STORYBOOK_PREVIEW__.extract()`.
- **`MemoryRouter` navigates synchronously**: a routing regression test uses `createMemoryRouter` with a real `loader` on the target route.
- Keep analysis modules free of **runtime** `monaco-editor` imports (`import type` only), or the node test dies on `window`.
