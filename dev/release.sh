#!/usr/bin/env bash
# Usage: yarn release <major|minor|patch|x.y.z>
set -euo pipefail

if [ $# -ne 1 ]; then
  echo "Usage: yarn release <major|minor|patch|x.y.z>" >&2
  exit 1
fi

if [ "$(git branch --show-current)" != "main" ]; then
  echo "A release is cut from main." >&2
  exit 1
fi

if [ -n "$(git status --porcelain)" ]; then
  echo "The working tree must be clean." >&2
  exit 1
fi

yarn version "$1"
VERSION="v$(node -p "require('./package.json').version")"

git add package.json
git commit -m "Release version $VERSION"
git tag "$VERSION"
git push origin main
git push origin "$VERSION"
gh release create "$VERSION" --generate-notes
