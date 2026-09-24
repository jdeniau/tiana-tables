#!/usr/bin/env bash
# Rebuilds the verification schema in the PostgreSQL development database.
# Its own schemas and tables are dropped and recreated; anything else in the database is left alone.
set -euo pipefail

container=${TIANA_DEV_CONTAINER:-tiana-dev-postgres}
database=${TIANA_DEV_DATABASE:-tiana_dev}
user=${TIANA_DEV_USER:-postgres}
here=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)

echo "→ schema and rows"
docker exec -i "$container" psql -q -v ON_ERROR_STOP=1 -U "$user" -d "$database" < "$here/schema.sql"
echo "✓ $database rebuilt"
