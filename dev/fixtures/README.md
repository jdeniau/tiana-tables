# Development fixtures

Sample data for the database Tiana Tables is pointed at while developing. It is
not used by the tests, and nothing in `src/` reads it.

## "Le Fil" — a news site with subscriptions

One dataset, `mysql/`, holding what a small news site would store: articles and
their authors, readers, subscriptions and payments, comments and audience. 25
tables, 2 views, around 14 000 rows, 7 MB.

| Area | Tables |
| --- | --- |
| Editorial | `auteur`, `categorie` (a tree), `dossier`, `article` (420 rows), `tag`, `article_tag`, `media`, `article_media`, `article_revision` |
| Audience | `utilisateur` (600), `formule_abonnement`, `code_promo`, `abonnement`, `moyen_paiement`, `paiement` (~4 500), `remboursement` |
| Engagement | `commentaire` (self-referencing), `signalement_commentaire`, `favori`, `lecture` (3 200), `newsletter`, `inscription_newsletter`, `envoi_newsletter` |
| Views | `vue_article_publie`, `vue_audience_mensuelle` |

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

## Rebuilding it

```sh
dev/fixtures/mysql/load.sh
```

It needs `python3` and a running container (`TIANA_DEV_CONTAINER`,
`TIANA_DEV_DATABASE`, `TIANA_DEV_USER` and `TIANA_DEV_PASSWORD` override the
defaults below). The generator is seeded, so the same command always produces
the same rows.

Starting from nothing:

```sh
docker run -d --name tiana-dev-mysql --restart unless-stopped \
  -p 13306:3306 -v tiana-dev-mysql:/var/lib/mysql \
  -e MARIADB_ROOT_PASSWORD=devpassword -e MARIADB_DATABASE=tiana_dev \
  mariadb:11
dev/fixtures/mysql/load.sh
```

Then connect the app to `127.0.0.1:13306`, user `root`, password `devpassword` —
naming the connection with a `(dev)` marker.
