#!/usr/bin/env bash
# Rebuilds the "Le Fil" dataset and the verification schema in the PostgreSQL development database.
# Their own objects are dropped and recreated; anything else in the database is left alone.
set -euo pipefail

container=${TIANA_DEV_CONTAINER:-tiana-dev-postgres}
database=${TIANA_DEV_DATABASE:-tiana_dev}
user=${TIANA_DEV_USER:-postgres}
here=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)

{ cat "$here/schema.sql"; node "$here/../generate.mjs" postgres; cat "$here/verification.sql"; } |
  docker exec -i -e PGOPTIONS="-c client_min_messages=warning" "$container" psql -q -v ON_ERROR_STOP=1 -U "$user" -d "$database" >/dev/null
echo "✓ $database rebuilt"
