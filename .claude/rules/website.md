---
paths:
  - 'website/**'
  - '.github/workflows/website.yml'
  - 'README.md'
  - 'DESIGN.md'
  - 'src/renderer/component/Style/**'
  - 'src/renderer/component/TableGrid.tsx'
  - 'src/renderer/component/TableList.tsx'
  - 'src/renderer/component/Cell.tsx'
  - 'src/renderer/component/CellContextMenu/**'
  - 'src/renderer/component/CellWrite/**'
  - 'src/renderer/component/Chart/**'
  - 'src/renderer/component/Connection/**'
  - 'src/renderer/component/MonacoEditor/**'
---

# The website

The site, tiana-tables.deniau.me, is a plain Vite multi-page build in `website/`, rendered in the browser: `index.html` and `fr/index.html`, each with its language and its head written by hand.

- **The site stays a default Vite build**: no plugin, no server rendering. What the build must know goes through `define` (`__RELEASE__`); a new locale is an HTML page, a `SiteLocale` value and its `locales/*.ts`.
- **What Node loads with `website/vite.config.ts` (`latestRelease.ts`, `release.ts`) imports with the `.ts` extension and holds no enum**: `website/package.json` makes it ESM, and Node only strips types, so `PackageKind` is a typed `as const` object. Check with `yarn vite build website --configLoader native`.
- **The site draws the app by hand: a change to how a drawn screen looks updates its window in `website/src/`.** The palettes (`THEME_LIST`), the app's labels (`app()` of `text.tsx` reads `locales/*.ts`) and the release files follow by themselves; the layout, the sample data and the SQL colouring do not. The windows: `AppWindow` (table page), `EditorSection` (query, completion), `BrowseSection` (context menu, write conflict), `ChartsSection` (result chart), `SshSection` (connection form, host key question).
- **A drawn menu copies the app's items in its order, dividers and danger colour (base08) included**: the context menu follows `buildMenuItems` of `CellContextMenu.tsx`, and a drawn label is measured in French, the longest locale.
- **A feature the README announces gets its line on the site too**: `website/locales/en.ts` first, then `fr.ts`.
- **The download links are the files of GitHub's latest release, read at build** (`latestRelease.ts` through `define`, `GITHUB_TOKEN` when set): a package without its file fails the build rather than deploy a dead link. A new installer gets its pattern in `FILE_PATTERNS`.
- **The deploy waits for the release's files**: `website.yml` runs after "Publish release" succeeds. Deployed on `release: published`, the build would find the files not uploaded yet.
- Check: `yarn website` (dev server), `yarn website:build` then `yarn vite preview website`.
