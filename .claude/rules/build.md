---
paths:
  - 'package.json'
  - '.yarn/patches/**'
  - '.yarnrc.yml'
  - 'forge.config.ts'
  - 'knip.json'
  - 'vite.*.config.ts'
  - '.github/workflows/**'
---

# Dependencies, build and packaging

## Choosing a dependency

- **Size is not a criterion** — this is an Electron app shipping its own runtime — and neither is the dev server's pre-bundle weight. Never copy a library's data into the code to save either; copy only what cannot be imported at all (`pg`'s escaping, which reads `Buffer` in the renderer).
- **A dependency is judged on whether it is the right tool, whether it is declared, and whether the need is real.** A package resolving only because antd depends on it (`dayjs`) is undeclared.
- **Check the published package, not GitHub issues**: `npm view <pkg> peerDependencies` on `latest` and on the pre-release `dist-tags`. A merged PR may be unreleased; a stale open issue may be fixed.
- **Before dismissing an "unused dependency" as a knip mistake, read the dependents' `package.json`** (`npm view <pkg>@<v> peerDependencies dependencies.<candidate>`): `@nivo/bar` lists `@nivo/core` in its own `dependencies`, so declaring it is redundant.
- **Before bumping a transitive dependency across a major, check how its consumer loads it**: an ESM-only package `require()`d from CJS hands back the module namespace.

## knip

- **A deliberately exhaustive export is kept with a `@public` JSDoc tag**, not a `knip.json` ignore (on an enum it covers all members). An unexported unused type is an eslint error, so a type kept for later is re-exported and tagged.
- The `.mdx` configuration hint comes from the Storybook plugin, not from `.mdx` files: `mdx` is in the `project` glob on purpose.

## Patching a build tool

- **A dependency is patched with `yarn patch`** (`yarn patch <pkg>`, edit, `yarn patch-commit -s <dir>`), never with a wrapper class: it patches at the source, and a version bump makes `yarn install` fail loudly instead of a wrapper silently matching nothing.
- **Search the upstream trackers first, and cite the issue URL and the date it was last checked** next to the patch.
- **An upstream PR is a hypothesis until it is run**, and a packaging claim is built, not argued.

## Packaging runs on Node 24

- **`package`, `make` and `publish` run on Node 24, the tests on Node 26**: on Node ≥ 26.1, forge 7's `extract-zip` 2.0.1 stalls while extracting Electron, Node exits 0, and forge stops after "Packaging app for platform" with no `out/` — the release job goes green with no assets ([extract-zip#154](https://github.com/max-mapper/extract-zip/issues/154), [nodejs/node#63487](https://github.com/nodejs/node/issues/63487), checked 2026-09-29).
- Forcing `@electron/packager` 20 under forge 7 fails with `done is not a function` (promise-based hooks). Move `publish.yml` to Node 26 with forge 8 stable, which depends on packager ≥ 20.0.1 (`@electron-internal/extract-zip`), and restore its `npm install -g corepack` step, with the Windows `npm uninstall -g yarn` before it (#244).

## The RPM build

Two local `yarn patch`es in `.yarn/patches/`, and `electron-installer-redhat` forced to 4.0.0 through `resolutions` (forge still asks for `^3.2.0`):

- `electron-installer-redhat`, two lines of `resources/spec.ejs`: `%global _build_id_links none`, without which our `/usr/lib/.build-id/` symlinks collide with every other Electron app's and dnf refuses to install ([forge#3594](https://github.com/electron/forge/issues/3594)); and `cp -r %{_topdir}/BUILD/usr/*`, without which the build fails on rpm ≥ 4.20 ([installer-redhat#343](https://github.com/electron-userland/electron-installer-redhat/issues/343)). Not `%{_builddir}`: since rpm 4.20 it is the per-package subdirectory the installer never writes into, which is why upstream PRs #344 and #347 fail. Measured on rpm 4.18.2, 4.20.1 and 6.0.2.
- `@electron-forge/maker-rpm`, one line of `dist/MakerRpm.js`: `electron-installer-redhat` is ESM since 4.0.0, so forge's CJS `require()` returns `{ default, Installer }`; the patch reads `.default` when present. Forge only drops the `require()` in its ESM rewrite (8.x).
- A version bump of either package makes `yarn install` fail to apply its patch: the signal to check whether upstream landed the fixes.
- **Verify by building the real thing**, never on the Fedora host (rpm ≥ 4.20 breaks the installer for an unrelated reason): `node node_modules/.bin/electron-forge make --targets @electron-forge/maker-rpm` in a `node:24-bookworm` image with `rpm` installed (the CI runner's rpm 4.18), then `rpm -qlp out/make/rpm/x64/*.rpm | grep build-id`.
