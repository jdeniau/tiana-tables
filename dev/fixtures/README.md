# Development fixtures

Sample data for the databases Tiana Tables is pointed at while developing. It is not used by the tests, and nothing in `src/` reads it.

```sh
docker compose up -d --wait
```

starts both servers from `compose.yaml` at the root, each filled the first time its volume is created. Both hold the same dataset, "Le Fil", row for row; the PostgreSQL one also holds a verification schema. An SQLite file holds it too, built on the host with no container:

```sh
node dev/fixtures/sqlite/load.mjs
```

writes `dev/tiana_dev.sqlite` (ignored by git), with verification tables of its own; open it as a connection `Le Fil (dev)` of the SQLite engine.

| Server        | Container            | Address           | User / password            | Database    |
| ------------- | -------------------- | ----------------- | -------------------------- | ----------- |
| MariaDB 11    | `tiana-dev-mysql`    | `127.0.0.1:13306` | `root` / `devpassword`     | `tiana_dev` |
| PostgreSQL 18 | `tiana-dev-postgres` | `127.0.0.1:15432` | `postgres` / `devpassword` | `tiana_dev` |

Name the connections in the app with a `(dev)` marker. The data lives in the named volumes `tiana-dev-mysql` and `tiana-dev-postgres`: `docker compose down` keeps it, and a later `up` finds it as you left it; `docker compose down -v` deletes it, and the next `up` loads the datasets again.

## "Le Fil" — a news site with subscriptions

What a small news site would store: articles and their authors, readers, subscriptions and payments, comments and audience. 25 tables, 2 views, around 14 000 rows, 7 MB.

| Area       | Tables                                                                                                                                               |
| ---------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| Editorial  | `auteur`, `categorie` (a tree), `dossier`, `article` (420 rows), `tag`, `article_tag`, `media`, `article_media`, `article_revision`                  |
| Audience   | `utilisateur` (600), `formule_abonnement`, `code_promo`, `abonnement`, `moyen_paiement`, `paiement` (~4 600), `remboursement`                        |
| Engagement | `commentaire` (self-referencing), `signalement_commentaire`, `favori`, `lecture` (3 200), `newsletter`, `inscription_newsletter`, `envoi_newsletter` |
| Views      | `vue_article_publie`, `vue_audience_mensuelle`                                                                                                       |

Table and column names are French, like the rows: it is the newsroom's own vocabulary, and a schema in a language other than the interface's is worth having under the eyes while working on the grid.

What it exercises: composite primary keys (`article_tag`, `favori`, `inscription_newsletter`), self-referencing foreign keys (`categorie.parent_id`, `commentaire.parent_id`), a composite foreign key (`envoi_newsletter (article_une_id, media_une_id)` → `article_media`) whose first column has a foreign key of its own, a stored generated column (`auteur.initiale`), `JSON`, `ENUM`, `DECIMAL`, `TIME`, `BOOLEAN`, `TIMESTAMP … ON UPDATE`, column comments, unique indexes, nullable columns everywhere, long `TEXT`, emoji, and views next to base tables in the table list.

The rows hold together in time: a comment or a read never precedes its article's publication, a payment falls inside its subscription's period and carries the promo code's discount, a refund only exists on a refunded payment, the picture of a newsletter send is one of its cover article's, the paywall is only recorded on a subscriber-only article read by someone who is not a subscriber, and the only rows dated in the future are the scheduled articles.

### One dataset, three dialects

`generate.mjs` builds the rows once, from a seed, and writes them as the INSERTs of each dialect (`node dev/fixtures/generate.mjs mysql|postgres|sqlite`): only the quoting of a value and PostgreSQL's identity restarts differ, and SQLite's INSERTs are PostgreSQL's. The tables are written by hand for each engine, `mysql/schema.sql`, `postgres/schema.sql` and `sqlite/schema.sql`, each in its own types:

| MariaDB                                   | PostgreSQL                                    | SQLite                                                            |
| ----------------------------------------- | --------------------------------------------- | ----------------------------------------------------------------- |
| `ENUM(…)`                                 | an enum type per column (`article_statut`, …) | `TEXT` with a `CHECK (… IN (…))`                                  |
| `BOOLEAN`, other `TINYINT`                | `boolean`, `smallint`                         | `BOOLEAN` (stored as `0` / `1`), `SMALLINT`                       |
| `… UNSIGNED`                              | the next size up, without a `CHECK`           | PostgreSQL's names, all of them 64-bit integers                   |
| `AUTO_INCREMENT`                          | `GENERATED BY DEFAULT AS IDENTITY`            | `INTEGER PRIMARY KEY`, the rowid                                  |
| `DATETIME`, `TIMESTAMP`                   | `timestamp`, `timestamptz`                    | `DATETIME`, `TIMESTAMP`, as text                                  |
| `TIMESTAMP … ON UPDATE CURRENT_TIMESTAMP` | a `BEFORE UPDATE` trigger                     | an `AFTER UPDATE` trigger                                         |
| `JSON`                                    | `jsonb`                                       | `JSON` with a `CHECK (json_valid(…))`                             |
| `DECIMAL`                                 | `numeric`                                     | `DECIMAL`, stored as a number: `19.90` reads `19.9`, `99.00` `99` |
| `COMMENT '…'` on a column                 | `COMMENT ON COLUMN`                           | a `--` comment, kept in the text of the `CREATE TABLE` only       |
| `DATE_FORMAT` in a view                   | `to_char`                                     | `strftime`                                                        |

## PostgreSQL — a verification schema

`postgres/verification.sql`, loaded after "Le Fil", serves another purpose: each object is there for a case the PostgreSQL dialect has to get right, rather than to look like real data. Several schemas (`app`, `public`, `Zeta`, and `a.b"c`, an identifier holding a `.` and a `"`) whose names sort differently by collation and by code unit, a composite foreign key, a foreign key to another schema, an enum type, `json` and `jsonb`, a stored generated column, an identity column, `text[]`, `bytea`, a view, a materialised view, a partitioned table, and a table never `ANALYZE`d.

## SQLite — verification tables

`sqlite/verification.sql`, loaded after "Le Fil" into the same file, holds the cases of the SQLite dialect: a key declared without its columns, single and composite (`REFERENCES users`), a `WITHOUT ROWID` table, a `STRICT` one, `AUTOINCREMENT` and the `sqlite_sequence` it keeps, an FTS5 virtual table with its shadow tables and hidden columns, virtual and stored generated columns, a column declared with no type and one whose type name gives it another affinity (`STRING` is numeric), a text in a `DECIMAL` column, an integer past 2^53, bytes, a table with no primary key, a `TEXT` primary key holding NULL, and an identifier holding a `.` and a `"`.

## Rebuilding in place

Without touching the volumes, each server can be reloaded while it runs (`node` on the host is all it takes):

```sh
dev/fixtures/mysql/load.sh
dev/fixtures/postgres/load.sh
```

Each drops and recreates its own objects and leaves anything else in the database alone. The SQLite script writes a new file instead, built aside and renamed over the previous one: a connection the app holds keeps reading the previous file, and refuses to write to it (`attempt to write a readonly database`), until it is reopened. `TIANA_DEV_FILE` names another file. `TIANA_DEV_CONTAINER`, `TIANA_DEV_DATABASE` and `TIANA_DEV_USER` (plus `TIANA_DEV_PASSWORD` for MariaDB) override the defaults above; the MySQL script also loads a MySQL server, `TIANA_DEV_CONTAINER=<a mysql:8.4 container> dev/fixtures/mysql/load.sh`.

On a first `up`, the rows come from a one-shot `fixtures` service (`node:26-alpine`): neither database image has node to run the generator, so the service writes each server's SQL into a volume that server reads at initialisation.
