---
paths:
  - 'src/sql/**'
---

# SQL: building statements, binding values, reading answers

Adding or changing an engine: load the `sql-engines` skill.

## Binding and escaping

- **Values are bound by name (`:databaseName`), never by position.** A conditional clause becomes a conditional _key_, not a conditional position.
  - MySQL: `namedPlaceholders` is set **per query** (`statement.values !== undefined`), never on the connection — the `named-placeholders` rewriter does not know backticks (`` `we:ird` `` is read as a parameter). It does skip string literals and comments. PostgreSQL: `driver/postgres/namedPlaceholders.ts` rewrites only the dialect's own statements to `$n`.
  - **A name that does not match is silent**: a missing parameter binds `null`, an extra key is dropped. Builders are tested on the exact `sql` / `values` pair, and `dialect.contract.test.ts` asserts the `:names` and the keys are the same set.
  - Write `CAST(x AS jsonb)`, never `x::jsonb`: the rewriter would read `:jsonb` as a parameter.
- **Every interpolated identifier goes through the dialect** (`escapeIdentifier`, `qualify`), in both processes. Values are bound, identifiers are quoted; only SQL the user typed (the `where` filter, the editor) travels as written.
- **A `.` and a quote character are legal inside a quoted identifier** (checked on MySQL 8.4 and MariaDB 11.4: `` `my.db`.`a.b` ``). That is why `escapeIdentifier` stays hand-written on MySQL: `mysql.escapeId` splits on dots and answers two bare backticks for `''`. Delegate to the driver what is driver policy that can drift (the string escape table); keep what one character of the grammar fixes.
- **`mysql.escape` is only ever called on a string**: a `Date` comes out shifted into a time zone, an object as a `SET` clause, and its `Buffer.isBuffer` throws in the renderer. `cellValueToSqlLiteral` decides every other form itself.
- **A primary key column is never NULL** (MySQL forces `NOT NULL`, `getPrimaryKeys` reads `PRIMARY` only): the row's `WHERE` uses `=`, the null-safe comparison is for the guarded column only. `PrimaryKeyValue = Exclude<SqlBoundValue, null>`.

## Types and vocabularies

- **A closed set gets a real enum**, whether it comes from outside (INFORMATION*SCHEMA's `DATA_TYPE` → `dialect/mysql/dataType.ts`, `NotEditableReason`) or is an internal discriminant (`EditorKind`). Values read from a server stay `string` and are \_compared* against members: a server can answer something absent (MariaDB's `inet6`, `uuid`). A library's string union is one too: compare against an enum holding its values, so a rename stops compiling.
- **Driver constants are read by name, never as numbers**: `driver/mysql/fieldKind.ts` maps from `Types`, held to mysql2's list by exhaustiveness tests. The wire type (`Types`) is not `DATA_TYPE`: the protocol collapses `TEXT`/`BLOB` and announces an `ENUM` as a string.
- **A cast is a claim; make it once, where it can be justified.** `DriverConnection.query()` is not generic — a driver never knows what was asked — and the one `rows as T` sits in `executeQueryAndRetry`. Destructure before asserting, so the cast lands on the value in doubt. A comment that justifies a cast is backed by a probe or a test (the "nothing sends a `CALL`" comment was false: the editor does).
- **Reduce a driver's shapes at the boundary** (`toQueryReturn`, in `driver/`), rather than exporting a guard every consumer must call.
- **The shapes of an action live next to the code that serves it** (`updateCell.ts`), not in `types.ts`, which holds what servers answer.
- `typeof x === 'undefined'` is written `x === undefined`.

## Answers of a server

- **What a server answers is parsed with zod, not cast** (`readQuery`), and read in code, never through the `AS` alias of a `SELECT` (PostgreSQL folds an unquoted alias to lower case).
- **An equivalence between two statements is checked on every schema of the server** (`SHOW DATABASES`, system schemas included), not on the fixture: collations order `columns_priv` / `column_stats` differently from bytes. An order the app relies on is decided in neutral code (`ConnectionStack` sorts names by code unit).
- **What `pg` decodes is measured**: an `array_agg` of `name` comes back as the text `{a,b}`; a dropped connection says `… is not queryable`; the connection timeout has no `code`.
- **MySQL's `SYSTEM` zone is known by an abbreviation** (`@@system_time_zone`: `EDT` on MariaDB 11 with `TZ=America/New_York`), which gives no summer time rules, and `EST` resolves in Temporal as a fixed −05:00 zone: an abbreviation resolves only when it is UTC (`resolveServerZone`). A zone name needs the time zone tables (loaded in the MariaDB image).
- **MariaDB's `JSON` is `LONGTEXT` + a `CHECK`**: announced as a blob, and `CAST(x AS JSON)` is ERROR 1064 there. Check which server a repro query needs before suggesting it.
- **Before calling something a security hole, ask what an attacker would need outside my test setup** (a `localhost` certificate signed by my own CA is not something a public CA issues). Never patch a widely used library for an edge case: document the limit.
