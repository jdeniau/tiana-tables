-- Verification schema of the PostgreSQL development database (`tiana-dev-postgres`, database `tiana_dev`).
-- Each object is here for a case the PostgreSQL dialect must get right. Rebuild it with dev/fixtures/postgres/load.sh.

DROP SCHEMA IF EXISTS app, "Zeta", "a.b""c" CASCADE;
DROP TABLE IF EXISTS public.users, public.never_analyzed CASCADE;
DROP TYPE IF EXISTS public.mood CASCADE;

-- sorts first by code unit, after `app` by collation
CREATE SCHEMA "Zeta";
CREATE SCHEMA app;
-- an identifier holding a `.` and a `"`
CREATE SCHEMA "a.b""c";

CREATE TYPE public.mood AS ENUM ('sad', 'ok', 'happy');

CREATE TABLE public.users (
  id integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  email text NOT NULL UNIQUE,
  first_name varchar(80),
  last_name varchar(80),
  full_name text GENERATED ALWAYS AS (first_name || ' ' || last_name) STORED,
  mood public.mood DEFAULT 'ok',
  tags text[],
  avatar bytea,
  settings json,
  preferences jsonb,
  born_on date,
  wakes_at time,
  created_at timestamptz NOT NULL DEFAULT now(),
  balance numeric(10, 2),
  active boolean NOT NULL DEFAULT true
);
COMMENT ON COLUMN public.users.email IS 'Login, unique';

CREATE TABLE app.orders (
  id bigserial PRIMARY KEY,
  user_id integer NOT NULL REFERENCES public.users (id),
  placed_at timestamp NOT NULL DEFAULT now(),
  note text
);

CREATE TABLE app.order_lines (
  order_id bigint NOT NULL REFERENCES app.orders (id),
  line_no integer NOT NULL,
  label text NOT NULL,
  PRIMARY KEY (order_id, line_no)
);

-- a composite foreign key: (order_id, line_no) -> order_lines (order_id, line_no)
CREATE TABLE app.shipments (
  id serial PRIMARY KEY,
  line_no integer NOT NULL,
  order_id bigint NOT NULL,
  carrier text,
  FOREIGN KEY (order_id, line_no) REFERENCES app.order_lines (order_id, line_no)
);

CREATE VIEW app.order_totals AS
  SELECT o.id, count(l.*) AS line_count FROM app.orders o
  LEFT JOIN app.order_lines l ON l.order_id = o.id GROUP BY o.id;

CREATE MATERIALIZED VIEW app.user_order_counts AS
  SELECT user_id, count(*) AS orders FROM app.orders GROUP BY user_id;

CREATE TABLE app.events (
  id bigint NOT NULL,
  happened_at date NOT NULL,
  kind text,
  PRIMARY KEY (id, happened_at)
) PARTITION BY RANGE (happened_at);
CREATE TABLE app.events_2026 PARTITION OF app.events
  FOR VALUES FROM ('2026-01-01') TO ('2027-01-01');

CREATE TABLE "a.b""c"."we""ird.table" ("odd""col" text, "normal" integer);

CREATE TABLE "Zeta".notes (id serial PRIMARY KEY, body text);

-- a table never ANALYZEd: reltuples stays -1
CREATE TABLE public.never_analyzed (id integer);

INSERT INTO public.users (email, first_name, last_name, mood, tags, avatar, settings, preferences, born_on, wakes_at, balance)
VALUES
  ('ada@example.com', 'Ada', 'Lovelace', 'happy', '{math,poetry}', '\x89504e47', '{"b": 1, "a": 2}', '{"theme": "dark"}', '1815-12-10', '07:30', 12.5),
  ('alan@example.com', 'Alan', 'Turing', 'ok', NULL, NULL, NULL, NULL, '1912-06-23', NULL, NULL),
  ('o''brien@example.com', 'Flann', 'O''Brien', 'sad', '{}', NULL, '[]', '[1, 2]', NULL, NULL, 0);

INSERT INTO app.orders (user_id, note) VALUES (1, 'first'), (1, 'second'), (2, NULL);
INSERT INTO app.order_lines VALUES (1, 1, 'book'), (1, 2, 'pen'), (2, 1, 'ink');
INSERT INTO app.shipments (order_id, line_no, carrier) VALUES (1, 2, 'post'), (2, 1, 'courier');
INSERT INTO app.events VALUES (1, '2026-03-01', 'signup');
INSERT INTO "a.b""c"."we""ird.table" VALUES ('x', 1);
INSERT INTO "Zeta".notes (body) VALUES ('hello');
REFRESH MATERIALIZED VIEW app.user_order_counts;
ANALYZE public.users;
