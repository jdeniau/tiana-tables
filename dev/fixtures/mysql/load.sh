#!/usr/bin/env bash
# Rebuilds the "Le Fil" dataset in the MySQL/MariaDB development database.
# Its own tables are dropped and recreated; anything else in the database is left alone.
set -euo pipefail

container=${TIANA_DEV_CONTAINER:-tiana-dev-mysql}
database=${TIANA_DEV_DATABASE:-tiana_dev}
user=${TIANA_DEV_USER:-root}
password=${TIANA_DEV_PASSWORD:-devpassword}
here=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)

{ cat "$here/schema.sql"; node "$here/../generate.mjs" mysql; } |
  docker exec -i "$container" mariadb -u"$user" -p"$password" "$database"
echo "✓ $database rebuilt"
