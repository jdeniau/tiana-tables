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
- **A hook that reads a context is checked in every story, not only in the tests**: nothing fails in CI when a story breaks. Load every story headless (the ids from `index.json`, `iframe.html?id=…`, look for `body.sb-show-errordisplay`) and count failures before and after.
- **`MemoryRouter` navigates synchronously**: a routing regression test uses `createMemoryRouter` with a real `loader` on the target route.
- Keep analysis modules free of **runtime** `monaco-editor` imports (`import type` only), or the node test dies on `window`.
