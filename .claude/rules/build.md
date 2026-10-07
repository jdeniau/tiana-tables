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

## Yarn

- **Yarn's secure defaults stay unset in `.yarnrc.yml`: install scripts off, versions younger than a day refused, no git repository approved.** They hold because `yarn.lock` is v10: Yarn writes `enableScripts: true` and `npmMinimalAgeGate: 0` back only when it migrates an older lockfile. An urgent fix younger than a day goes through `npmPreapprovedPackages`, removed afterwards.
- **A dependency whose install script matters gets `built: true` in `dependenciesMeta`**: only `electron-winstaller`, whose script copies the `vendor/7z.exe` the Squirrel maker needs. `esbuild` and `unrs-resolver` work without theirs (measured): the warning they raise at each install is expected.
- **`approvedGitRepositories` does not cover a GitHub-hosted dependency**: Yarn downloads its archive over HTTPS and packs it from source.

## React Compiler

- **`@babel/core` stays on 7 while `babel-plugin-react-compiler` is 1.x**: on Babel 8 the compiler silently skips every component that destructures a prop with a default value (`ButtonLink`, `TabStrip`, `ChartPanel`…). Before a bump, count the skips with the plugin's `logger` option (`CompileError` events) on both versions.

## knip

- **A deliberately exhaustive export is kept with a `@public` JSDoc tag**, not a `knip.json` ignore (on an enum it covers all members). An unexported unused type is an eslint error, so a type kept for later is re-exported and tagged.
- The `.mdx` configuration hint comes from the Storybook plugin, not from `.mdx` files: `mdx` is in the `project` glob on purpose.

## Patching a build tool

- **A dependency is patched with `yarn patch`** (`yarn patch <pkg>`, edit, `yarn patch-commit -s <dir>`), never with a wrapper class: it patches at the source, and a version bump makes `yarn install` fail loudly instead of a wrapper silently matching nothing.
- **Search the upstream trackers first, and cite the issue URL and the date it was last checked** next to the patch.
- **An upstream PR is a hypothesis until it is run**, and a packaging claim is built, not argued.

## The RPM build

One local `yarn patch`, on `electron-installer-redhat` 4.0.0, applied through `resolutions`:

- Two lines of `resources/spec.ejs`: `%global _build_id_links none`, without which our `/usr/lib/.build-id/` symlinks collide with every other Electron app's and dnf refuses to install ([forge#3594](https://github.com/electron/forge/issues/3594)); and `cp -r %{_topdir}/BUILD/usr/*`, without which the build fails on rpm ≥ 4.20 ([installer-redhat#343](https://github.com/electron-userland/electron-installer-redhat/issues/343)). Not `%{_builddir}`: since rpm 4.20 it is the per-package subdirectory the installer never writes into, which is why upstream PRs #344 and #347 fail. Measured on rpm 4.18.2, 4.20.1 and 6.0.2.
- **The `resolutions` key is the range `@electron-forge/maker-rpm` declares** (`npm view @electron-forge/maker-rpm@<v> optionalDependencies`): when forge moves it, the old key matches nothing and the patch stops applying without an error. After a forge bump, `grep build_id_links node_modules/electron-installer-redhat/resources/spec.ejs`.
- **A new `electron-installer-redhat` release is never picked up**: the resolution pins the patched 4.0.0. Check the two issues above before a release replaces the patch.
- **Verify by building the real thing**, never on the Fedora host (rpm ≥ 4.20 breaks the installer for an unrelated reason): `node node_modules/.bin/electron-forge make --targets @electron-forge/maker-rpm` in a `node:26-bookworm` image with `rpm` installed (the CI runner's rpm 4.18), then `rpm -qlp out/make/rpm/x64/*.rpm | grep build-id`.
