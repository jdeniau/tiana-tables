---
name: sql-engines
description: >
  Use when adding a database engine to Tiana Tables (SQLite, SQL Server, CockroachDB…), or changing what differs between MySQL/MariaDB and PostgreSQL: a dialect (quoting, literals, metadata queries, the guarded cell write), a driver (connecting, field kinds, write results, error codes), or the editor grammar of an engine. Triggers on src/sql/dialect/, src/sql/driver/, DatabaseEngine, FieldKind, GuardedUpdate, ReadQuery, or "support for <db>".

paths:
  - 'src/sql/dialect/**'
  - 'src/sql/driver/**'
  - 'src/sql/engine.ts'
---

# SQL engines

A connection has an **engine** (`DatabaseEngine`, `src/sql/engine.ts`): a driver and a dialect, not a product — MariaDB is `MySQL`, same protocol, same driver, same quoting. What differs between engines lives in three places, each keyed by engine, and nowhere else: **no `if (engine === …)` in between**.

| Place                                                  | Holds                                                                                                      | May import                                    |
| ------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------- | --------------------------------------------- |
| `src/sql/dialect/<engine>/`                            | SQL **text**: quoting, literals, the six metadata questions, the guarded cell write and its interpretation | no driver — the renderer loads it             |
| `src/sql/driver/<engine>/`                             | connecting, sending, reading the answer into the app's shapes, tagging errors                              | the driver package; main process only, lazily |
| `src/sql/parser/index.ts` + `MonacoEditor/language.ts` | the dt-sql-parser grammar and the Monaco language (see the `sql-editor` skill)                             | —                                             |

## Adding an engine, in order

Adding a member to `DatabaseEngine` stops the build until every `Record<DatabaseEngine, …>` has an entry, so write the dialect and the driver **standalone** first (their own tests import them directly), then land one commit that adds the member and registers it everywhere:

1. `dialect/<engine>/`: `index.ts` (the `Dialect` object), `escape.ts`, `metadata.ts`, `guardedUpdate.ts`, each with its test file.
2. `driver/<engine>/`: `index.ts` (the `Driver`), `fieldKind.ts`, with tests.
3. The registration commit — `grep -rn "Record<DatabaseEngine" src` lists them: `DIALECTS` (`dialect/index.ts`), `IMPORTS` (`driver/index.ts`, a lazy `import()`), `PARSERS` (`parser/index.ts`), `LANGUAGES` (`MonacoEditor/language.ts`), `DEFAULTS` (port and user, `Connection/ConnectionForm.tsx`), `ICON_BY_ENGINE` (`Connection/EngineIcon.tsx`, from `simple-icons`). Plus the ICU `select` `connection.engine.name` in `locales/en.ts` then `fr.ts`, and connection errors in `src/sql/connectionError.ts`.
4. The docs: README ("Database support"), the "SQL engines" section of `CLAUDE.md`, this skill, the `sql-editor` skill.

`dialect.contract.test.ts` iterates `Object.values(DatabaseEngine)`, so the new dialect is held to the common rules as soon as it is registered.

**Decide first what the UI's "database" is.** The UI browses a list of databases, then tables. On PostgreSQL that list is the **schemas** of the one database a connection opens (`ConnectionObject.database`, a form field shown for that engine only), so routing, contexts and `configByDatabase` stay the same for every engine. An engine with a single namespace (SQLite) answers one entry.

## The dialect contract (`dialect/types.ts`, `dialect/metadata.ts`)

- `escapeIdentifier` refuses the empty string, doubles its own quote character and keeps a dotted name whole; `qualify` quotes each part on its own.
- `useDatabase` is one statement making unqualified names resolve in that database **alone** — on PostgreSQL `SET search_path TO "s"`, without `public`, so a name found nowhere else does not resolve behind the user's back.
- `escapeLiteral` takes a string only. `booleanLiteral`, `bytesLiteral` spell the server's own forms.
- **Each metadata question is a `readQuery`**: the SQL, the values it binds, a zod schema of a row and a `read` of the rows, side by side. The dialect runs nothing (`ConnectionStack.#answer` does), so its tests are synchronous. Rules:
  - the reading is code, never the `AS` of a `SELECT` (PostgreSQL folds unquoted aliases to lower case);
  - names come back in any order — `ConnectionStack` sorts them by code unit, since collations disagree;
  - `listForeignKeys` keeps the pairs of a composite key (on PostgreSQL through `pg_constraint.conkey`/`confkey` `unnest … WITH ORDINALITY`; `information_schema.constraint_column_usage` has no ordinal and yields a cross product), and leaves out a key to another schema — a missing link beats a wrong one;
  - `ColumnDetail` is facts (`nullable`, `generated`, `binary`, `json`, `allowedValues`, `multiValued`), resolved by the dialect: a PostgreSQL enum's labels are only in `pg_enum`, so the renderer could not derive them;
  - `DescribedColumn` keeps MySQL's vocabulary (the structure page's heads: `Key` = `PRI`/`UNI`/`MUL`, `Extra`); another engine synthesises it and names the gap (PostgreSQL marks every column of a composite index `MUL`). `References` is computed in neutral code from `listForeignKeys`.
- **The guarded write** (`GuardedUpdate`): `write` changes the cell only if it still holds what the grid showed; `outcomeOfWrite` settles it from the write alone or answers `undefined`; then `readBack` (a `readQuery`) and `outcomeOfReadBack` tell a conflict from a deleted row. `updateCell` has no engine branch. Each dialect's decision table is tested on hand-written answers.

## The driver contract (`driver/index.ts`)

- `connect(params, options)` takes named `ConnectionParams`, never a spread of the stored connection. Decryption is not the driver's job (`#connect` in `src/sql/index.ts`).
- **One statement per query, enforced by the driver**: `multipleStatements` off on mysql2, `queryMode: 'extended'` always on `pg` (it refuses a second statement with `42601`, while a `CREATE FUNCTION … $$ …; $$` still passes).
- Named placeholders are rewritten **only for statements with `values`**; the editor's SQL travels as written.
- `query()` answers rows, or a `WriteResult` `{ affectedRows, insertId }` (`insertId: null` where the engine has none) — `Array.isArray` tells them apart, no driver key is read.
- Each column gets a `ResultField` whose `FieldKind` is mapped from the driver's **named** constants (`Types`, `pg.types.builtins`), with a test holding the map exhaustive. `table` is the real table, not the alias (mysql2's `orgTable`; `pg` gives an OID, resolved by `relationNames.ts`).
- **Decode only what the app reads as something other than text** — booleans, numbers, JSON objects, bytes — and leave the rest as the server spells it (`{a,b}`, `1 day 02:00:00`): an object would render as JSON and be written back as a malformed literal.
- **A date stays the server's text** (mysql2 `dateStrings`, no `pg` parser for `DATE` / `TIMESTAMP` / `TIMESTAMPTZ`), parsed as Temporal only where the renderer computes on it: a `Date` drops microseconds and shifts a wall clock the machine's zone skips, and no connection time zone is forced.
- A refused statement is tagged **at the source** with `asSqlError(error, { code, errno? })` (`sqlError.ts`); `SqlErrorComponent` prints the code alone when there is no number. Connection failures are classified in `connectionError.ts` from the engine's own codes (PostgreSQL's SQLSTATE: `28P01`, `3D000`, `53300`…).
- `isConnectionLost(error)` is on the connection, and matched on what the driver really says — measured, never guessed.
- TLS follows `SslMode` (libpq's vocabulary); check what each mode does through the real driver.
- A real `yarn package` proves the bundle: the driver lands in a lazy chunk, and optional native modules must stub out.

## MySQL and PostgreSQL side by side

| Concern            | MySQL / MariaDB                                                                        | PostgreSQL                                                          |
| ------------------ | -------------------------------------------------------------------------------------- | ------------------------------------------------------------------- |
| Identifier         | `` `name` ``                                                                           | `"name"`                                                            |
| Boolean literal    | `1` / `0`                                                                              | `TRUE` / `FALSE`                                                    |
| Bytes literal      | `X'…'` (valid when empty, unlike `0x…`)                                                | `decode('…', 'hex')` (independent of `standard_conforming_strings`) |
| Switch database    | `USE db`                                                                               | `SET search_path TO "schema"`                                       |
| Null-safe equality | `<=>`                                                                                  | `IS NOT DISTINCT FROM`                                              |
| Guarded write      | `affectedRows` is ambiguous (same value rewritten), so a read-back with `guardMatches` | `RETURNING` settles the common case in one query                    |
| JSON in the guard  | —                                                                                      | `json` has no `=`: `CAST(… AS jsonb)` on both sides                 |
| Placeholders       | `named-placeholders` (mysql2 option, per query)                                        | our `:name` → `$n` rewriter                                         |
| SQL error          | `code` + `errno`                                                                       | SQLSTATE in `code`, no `errno`                                      |
| Enum labels        | parsed from `COLUMN_TYPE`                                                              | `pg_enum`                                                           |
| JSON column        | MariaDB: `LONGTEXT` + `CHECK`, reads `json: false`                                     | `json` / `jsonb`                                                    |
| Editor language    | `mysql`                                                                                | `pgsql` (colours `"quoted"` identifiers as strings)                 |

## Verifying an engine

- **A dev container per engine in `compose.yaml`**, persistent (named volume), connections named with `(dev)`. Every claim about what the server or driver accepts is measured there, through the real driver, **on every schema** of the server, system schemas included.
- **A verification schema** (see `dev/fixtures/postgres/verification.sql`) holding what a fixture forgets: a composite foreign key, one to another schema, an enum, `json` and `jsonb`, generated and identity columns, a comment and none, arrays, bytes, a view, a materialised view, a partitioned table, an identifier holding a quote and a dot, two schemas that sort differently by collation and by code unit.
- Tests: the dialect's text as hand-written literals in its own test files; the guarded write's decision table per dialect; `src/sql/index.test.ts` routes a connection of the engine and checks each statement holds a marker of its dialect (`pg_catalog.*`).
- **In the app** (the `verify-live` skill), against the new engine then the others for non-regression: open the connection, move between databases, scroll a wide table, filter with `WHERE` and from a cell's context menu (a value holding an apostrophe), follow a foreign key, open the structure page, edit a cell of each type, force a conflict by changing the row elsewhere, run several statements including a function body holding `;`, check completion and error underlining, draw a chart, and switch engines without restarting.

## Known gaps

Each is its own `fix`, none measured yet:

- MySQL 8 `DEFAULT_GENERATED`: a `DEFAULT CURRENT_TIMESTAMP` column has `EXTRA = 'DEFAULT_GENERATED'`, and `isGenerated` (`/GENERATED/i`, `dialect/mysql/columnSemantics.ts`) makes it read-only. Fix: `/(VIRTUAL|STORED) GENERATED/i`. No MySQL 8 container yet.
- Spatial subtypes (`point`, `polygon`, `multi*`…) are missing from `BINARY_DATA_TYPES`.
- `lower_case_table_names=2` (macOS MySQL): the structure page's `References` compares names with `===`.
- A MySQL `CALL` answers `[RowDataPacket[], ResultSetHeader]` and reaches the grid as nonsense rows (`toQueryReturn`, `driver/mysql/index.ts`).
