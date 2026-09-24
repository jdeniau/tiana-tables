# Development fixtures

Sample data for the databases Tiana Tables is pointed at while developing. It is
not used by the tests, and nothing in `src/` reads it.

```sh
docker compose up -d --wait
```

starts both servers from `compose.yaml` at the root, each filled with its
dataset the first time its volume is created:

| Server        | Container            | Address           | User / password            | Database    |
| ------------- | -------------------- | ----------------- | -------------------------- | ----------- |
| MariaDB 11    | `tiana-dev-mysql`    | `127.0.0.1:13306` | `root` / `devpassword`     | `tiana_dev` |
| PostgreSQL 18 | `tiana-dev-postgres` | `127.0.0.1:15432` | `postgres` / `devpassword` | `tiana_dev` |

Name the connections in the app with a `(dev)` marker. The data lives in the
named volumes `tiana-dev-mysql` and `tiana-dev-postgres`: `docker compose down`
keeps it, and a later `up` finds it as you left it; `docker compose down -v`
deletes it, and the next `up` loads the datasets again.

## "Le Fil" — a news site with subscriptions

One dataset, `mysql/`, holding what a small news site would store: articles and
their authors, readers, subscriptions and payments, comments and audience. 25
tables, 2 views, around 14 000 rows, 7 MB.

| Area       | Tables                                                                                                                                               |
| ---------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| Editorial  | `auteur`, `categorie` (a tree), `dossier`, `article` (420 rows), `tag`, `article_tag`, `media`, `article_media`, `article_revision`                  |
| Audience   | `utilisateur` (600), `formule_abonnement`, `code_promo`, `abonnement`, `moyen_paiement`, `paiement` (~4 500), `remboursement`                        |
| Engagement | `commentaire` (self-referencing), `signalement_commentaire`, `favori`, `lecture` (3 200), `newsletter`, `inscription_newsletter`, `envoi_newsletter` |
| Views      | `vue_article_publie`, `vue_audience_mensuelle`                                                                                                       |

Table and column names are French, like the rows: it is the newsroom's own
vocabulary, and a schema in a language other than the interface's is worth
having under the eyes while working on the grid.

What it exercises: composite primary keys (`article_tag`, `favori`,
`inscription_newsletter`), self-referencing foreign keys (`categorie.parent_id`,
`commentaire.parent_id`), a stored generated column (`auteur.initiale`), `JSON`,
`ENUM`, `DECIMAL`, `TIME`, `BOOLEAN`, `TIMESTAMP … ON UPDATE`, column comments,
unique indexes, nullable columns everywhere, long `TEXT`, emoji, and views next
to base tables in the table list.

The rows hold together in time: a comment or a read never precedes its
article's publication, a payment falls inside its subscription's period and
carries the promo code's discount, a refund only exists on a refunded payment,
the paywall is only recorded on a subscriber-only article read by someone who
is not a subscriber, and the only rows dated in the future are the 20 scheduled
articles.

## PostgreSQL — a verification schema

`postgres/schema.sql` is smaller and serves another purpose: each object is
there for a case the PostgreSQL dialect has to get right, rather than to look
like real data. Several schemas (`app`, `public`, `Zeta`, and `a.b"c`, an
identifier holding a `.` and a `"`) whose names sort differently by collation
and by code unit, a composite foreign key, a foreign key to another schema, an
enum type, `json` and `jsonb`, a stored generated column, an identity column,
`text[]`, `bytea`, a view, a materialised view, a partitioned table, and a table
never `ANALYZE`d.

## Rebuilding a dataset

Without touching the volumes, each dataset can be reloaded into its running
container:

```sh
dev/fixtures/mysql/load.sh     # needs python3 on the host
dev/fixtures/postgres/load.sh
```

Each drops and recreates its own objects and leaves anything else in the
database alone. `TIANA_DEV_CONTAINER`, `TIANA_DEV_DATABASE` and
`TIANA_DEV_USER` (plus `TIANA_DEV_PASSWORD` for MariaDB) override the defaults
above. The generator is seeded, so the same command always produces the same
rows.

On a first `up`, MariaDB's rows come from a one-shot `mysql-fixtures` service
(`python:3-alpine`): the MariaDB image has no python to run the generator, so
the service writes the SQL into a volume the server reads at initialisation.
