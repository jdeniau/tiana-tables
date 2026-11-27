-- Verification tables of the SQLite development file, loaded after "Le Fil" (schema.sql).
-- Each object is here for a case the SQLite dialect must get right, rather than to look like real data.

-- sorts first by code unit, last without regard to case
CREATE TABLE "Zeta" (id INTEGER PRIMARY KEY, body TEXT);

-- an identifier holding a `.` and a `"`, in a table with no primary key
CREATE TABLE "we""ird.table" ("odd""col" TEXT, "normal" INTEGER);

-- AUTOINCREMENT keeps its counter in `sqlite_sequence`, a table of SQLite's own
CREATE TABLE users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT NOT NULL UNIQUE COLLATE NOCASE,
  first_name VARCHAR(80),
  last_name VARCHAR(80),
  full_name TEXT GENERATED ALWAYS AS (first_name || ' ' || last_name) VIRTUAL,
  initials TEXT GENERATED ALWAYS AS (substr(first_name, 1, 1) || substr(last_name, 1, 1)) STORED,
  avatar BLOB,
  settings JSON,
  born_on DATE,
  wakes_at TIME,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  balance DECIMAL(10, 2), -- holds a text it could not convert
  ratio REAL,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  big INTEGER, -- past 2^53
  untyped, -- declared with no type: integer, text and bytes, each kept as given
  code STRING -- numeric affinity despite its name: '0123' is stored as 123
);

CREATE TABLE orders (
  id INTEGER PRIMARY KEY,
  -- a key declared without its column, which is the parent's primary key
  user_id INTEGER NOT NULL REFERENCES users,
  placed_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  note TEXT
);

CREATE TABLE order_lines (
  order_id INTEGER NOT NULL REFERENCES orders (id),
  line_no INTEGER NOT NULL,
  label TEXT NOT NULL,
  PRIMARY KEY (order_id, line_no)
) WITHOUT ROWID;

-- a composite key declared without its columns, in another order than the table's: (order_id, line_no) -> order_lines
CREATE TABLE shipments (
  id INTEGER PRIMARY KEY,
  line_no INTEGER NOT NULL,
  order_id INTEGER NOT NULL,
  carrier TEXT,
  FOREIGN KEY (order_id, line_no) REFERENCES order_lines
);

CREATE VIEW order_totals AS
  SELECT o.id, count(l.line_no) AS line_count FROM orders o
  LEFT JOIN order_lines l ON l.order_id = o.id GROUP BY o.id;

-- types enforced, and `ANY` keeps every value as given
CREATE TABLE strict_typed (id INTEGER PRIMARY KEY, label TEXT NOT NULL, amount REAL, payload ANY) STRICT;

-- a primary key other than INTEGER, on a rowid table, accepts NULL
CREATE TABLE settings (key TEXT PRIMARY KEY, value TEXT);

-- a virtual table, whose data lives in shadow tables (`notes_search_data`, …) and which has hidden columns
CREATE VIRTUAL TABLE notes_search USING fts5(title, body);

INSERT INTO users (email, first_name, last_name, avatar, settings, born_on, wakes_at, balance, ratio, big, untyped, code)
VALUES
  ('ada@example.com', 'Ada', 'Lovelace', X'89504E47', '{"b": 1, "a": 2}', '1815-12-10', '07:30', 12.5, 0.25, 9007199254740993, 42, '0123'),
  ('alan@example.com', 'Alan', 'Turing', NULL, NULL, '1912-06-23', NULL, NULL, NULL, NULL, 'forty-two', NULL),
  ('o''brien@example.com', 'Flann', 'O''Brien', X'', '[]', NULL, NULL, 'n/a', NULL, -9007199254740993, X'00FF', 'abc');

INSERT INTO orders (user_id, note) VALUES (1, 'first'), (1, 'second'), (2, NULL);
INSERT INTO order_lines VALUES (1, 1, 'book'), (1, 2, 'pen'), (2, 1, 'ink');
INSERT INTO shipments (order_id, line_no, carrier) VALUES (1, 2, 'post'), (2, 1, 'courier');
INSERT INTO strict_typed (label, amount, payload) VALUES ('one', 1.5, 1), ('two', NULL, 'text'), ('three', 3, X'01');
INSERT INTO settings VALUES ('theme', 'dark'), (NULL, 'under a NULL key');
INSERT INTO "we""ird.table" VALUES ('x', 1);
INSERT INTO "Zeta" (body) VALUES ('hello');
INSERT INTO notes_search (title, body) VALUES
  ('Shadow tables', 'A full-text index keeps its rows in tables of its own'),
  ('Hidden columns', 'SELECT * leaves out the column named after the table, and rank');
