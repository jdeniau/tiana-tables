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

The site, tiana-tables.deniau.me, is a Vite build in `website/`, prerendered at build and hydrated in the browser: `index.html` is the one template, and `prerender()` of `main.tsx` renders each locale's page, its language and its head.

- **The site stays a Vite build with one plugin, `vite-prerender-plugin`**: no server, no second build. What the build must know goes through `define` (`__RELEASE__`); a new locale is a `SiteLocale` value and its `locales/*.ts`, the plugin reaching its page through the links `prerender()` returns.
- **A new locale's hero title gets its measured threshold**: the `@container hero-title` rules of `style.css` switch to the short title below the width of the long one's widest word, in em of the title, the last word measured with the pip, which wraps alone (a `width: min-content` probe in `vite preview`). A CJK language also breaks its title at spaces only (`keep-all`) and names its system fonts in `--mono`.
- **What renders at build renders the same at hydration**: a state read from the browser (the picked theme, the visitor's platform) starts from its server value, the third argument of `useSyncExternalStore`. Check the console of `vite preview`: a mismatch is logged there only.
- **`prerender()` imports `react-dom/server.edge`**: the browser build of `react-dom/server` opens a `MessageChannel` that keeps Node, hence the build, running forever.
- **What Node loads with `website/vite.config.ts` (`latestRelease.ts`, `release.ts`) imports with the `.ts` extension and holds no enum**: `website/package.json` makes it ESM, and Node only strips types, so `PackageKind` is a typed `as const` object. Check with `yarn vite build website --configLoader native`, after deleting `website/node_modules`: the plugin leaves its temporary files in `website/node_modules/vite-prerender-plugin/`, which hides the package from Node's resolution.
- **The site draws the app by hand: a change to how a drawn screen looks updates its window in `website/src/`.** The palettes (`THEME_LIST`), the app's labels (`app()` of `text.tsx` reads `locales/*.ts`, in English on a page whose language the app lacks: `APP_LOCALE`) and the release files follow by themselves; the layout, the sample data and the SQL colouring do not. The windows: `AppWindow` (table page), `EditorSection` (query, completion), `BrowseSection` (context menu, write conflict), `ChartsSection` (result chart), `SshSection` (connection form, host key question).
- **A drawn menu copies the app's items in its order, dividers and danger colour (base08) included**: the context menu follows `buildMenuItems` of `CellContextMenu.tsx`, and a drawn label is measured in French, the longest locale.
- **A feature the README announces gets its line on the site too**: `website/locales/en.ts` first, then every other locale beside it.
- **The download links are the files of GitHub's latest release, read at build** (`latestRelease.ts` through `define`, `GITHUB_TOKEN` when set): a package without its file fails the build rather than deploy a dead link. A new installer gets its pattern in `FILE_PATTERNS`.
- **The deploy waits for the release's files**: `website.yml` runs after "Publish release" succeeds. Deployed on `release: published`, the build would find the files not uploaded yet.
- Check: `yarn website` (dev server), `yarn website:build` then `yarn vite preview website`.
