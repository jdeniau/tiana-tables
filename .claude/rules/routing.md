---
paths:
  - 'src/renderer/routes/**'
  - 'src/renderer/app.tsx'
---

# Routes and loaders

- **React Router stays on v6.** A migration to v7 (PR #132) was partially reverted (PR #142, redirect issues on connect); `react-router.config.ts.bak` is its leftover.
- **A state derived from the route is usually a state that should not exist.** A data router's navigation spans several renders (`createHashRouter` keeps the old location until the target's loader resolves), so a state written on route change drifts from it. Write the render that reads the route first, see what is genuinely missing, and pay for that only — e.g. an effect keyed on the route param alone, with the lint suppression explained.
- **`useNavigate` swallows the promise `router.navigate` returns**: a navigation cannot be awaited from a component.
- **`MemoryRouter` navigates synchronously and reproduces none of this**: a regression test uses `createMemoryRouter` with a real (even trivial) `loader` on the target route, or it passes against the bug.
- **The route loaders own `window.sql.connectionNameChanged`.** Each loader that queries announces `params.databaseName` (`undefined` above a database): the lazy modules load in any order, so every announcement of one navigation must be the same. Announce from a component only where no loader runs — landing on `/connect` after closing the last connection announces `undefined`, or `Cmd+T` reopens the closed one.
- **A loader never reads what a sibling loader of the same navigation writes**: they run in parallel. A layout loader loads what its own params name; a choice made for a URL that does not say where to go belongs in an index route, which runs on that URL only (`connections.$connectionSlug._index`, `$databaseName._index`).
- **Entering another connection remounts the page**: the tabs and the connection page link to `/connections/<slug>`, whose index route redirects to its last database or table, so `SqlPage` and its editor are created anew. Code for "the engine changes under a mounted editor" is code for a case that cannot happen.
