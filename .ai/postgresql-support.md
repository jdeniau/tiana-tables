# PostgreSQL support

Working plan for the `postgresql-support` branch. Tick a line when its commit
lands; the table is the only place that says where we are.

## Why

The app only speaks MySQL/MariaDB, through `mysql2` in the main process. The
README has long promised PostgreSQL "one day", on the assumption that "every
query the app sends is standard SQL". The code says otherwise: `SHOW DATABASES`,
`SHOW TABLE STATUS`, `SHOW KEYS`, `USE`, the backquotes of `escapeIdentifier`,
the `<=>` operator, `LIMIT 1` on an `UPDATE`, `CAST(… AS JSON)` — and above all
the MySQL wire-protocol type numbers (`Types` from `mysql` v2) that decide how
every cell is rendered, right inside the renderer.

Three MySQL bugs sit on the way and get fixed in passing: a `TIME`, `YEAR`,
`BIT` or `GEOMETRY` column blanks the grid (`Cell.tsx` throws in its `default`),
so does a real `BLOB` (React refuses to render a `Buffer`), and
`ForeignKeyLink` builds `col="value"` without escaping the value.

## Decisions

1. **The UI's "database" level is the PostgreSQL schema.** A PG connection
   carries a database (a new form field, default `postgres`); the database list
   lists its schemas. `db.table` becomes `schema.table`, which stays legal, and
   `information_schema` keyed on `TABLE_SCHEMA` too. No routing, context or
   `configByDatabase` change.
2. **Two stages.** Stage 1 is a neutral abstraction: MySQL stays the only
   engine, tests green, nothing visible changes beyond the three named `fix:`
   commits. Stage 2 plugs the PG driver into seams already proven.
3. **Full PG scope**: browsing, grid, filters, foreign keys, structure, SQL
   editor with completion, charts, and cell editing with conflict detection.
4. **An engine is a driver and a dialect, not a product.** MariaDB is `MySQL`:
   same wire protocol, same driver, same quoting. What does set them apart the
   server declares itself — it is never asked of the user.
5. **The configuration file is not validated and stays that way.** It is parsed
   with a cast, as before. A missing `engine` is decided in `loadConfiguration`;
   no migration, `version` is not bumped. Test fixtures describe real files —
   none names an engine — so they carry `@ts-expect-error`, not a type of their
   own.

## Target architecture

The structuring split:

- **`src/sql/dialect/`** — SQL text and escaping, **no driver import**, so the
  renderer can load it (it builds `SELECT * FROM db.table`, the `WHERE` filter
  prefix, and the `USE`).
- **`src/sql/driver/`** — connecting, executing, translating field types. Main
  process only, the sole place `mysql2` and `pg` are imported.

```
src/sql/
  engine.ts            DatabaseEngine
  resultField.ts       FieldKind, ResultField
  types.ts             ConnectionObject, QueryReturnType, WriteResult, ResultRow
  dialect/
    index.ts  types.ts  primaryKeyClause.ts
    mysql/     index.ts escapeIdentifier.ts metadata.ts guardedUpdate.ts
               dataType.ts columnSemantics.ts
    postgres/  (stage 2, same files)
  driver/
    index.ts             interfaces + loadDriver() (lazy import())
    mysql/     index.ts fieldKind.ts errors.ts
    postgres/  (stage 2) + namedPlaceholders.ts catalogCache.ts
  parser/      index.ts mysql.ts postgres.ts   (replaces mysqlParser.ts)
```

### What the renderer stops knowing

The IPC contract goes from `[rows, FieldPacket[]]` to `[rows, ResultField[]]`:

```ts
export enum FieldKind {
  Number,
  Date,
  DateTime,
  Time,
  Boolean,
  String, // base0B, today's colour for VARCHAR/CHAR
  Text, // base05, today's colour for TEXT/BLOB/ENUM/SET
  Json,
  Binary,
  Array,
  Unknown,
}
export interface ResultField {
  name: string;
  table: string | null;
  kind: FieldKind;
}
```

`String` and `Text` are two members because the current rendering colours them
differently; merging them would be a visible change. `Enum` is not a member: the
MySQL protocol announces an `ENUM` column as a string, and `resolveEditorKind`
already decides from the schema.

**A cell renders in three tiers, in this order**: the shape of the value first
(`null`, `Buffer`/`Uint8Array`, non-`Date` object), then the `FieldKind`, then a
`String(value)` fallback. `TEXT` and `BLOB` share one MySQL protocol type, so no
`FieldKind` can separate them — and this is what closes the two grid crashes.

Also leaving the renderer: the 8 `import { Types } from 'mysql'`, the four
copies of the numeric-type `Set`, `escape` from `mysql`, `src/sql/dataType.ts`
and the `enum('a','b')` parser.

### Metadata shapes

They become resolved facts rather than server vocabulary, because the labels of
a PG enum type live nowhere in `information_schema` (they are in `pg_enum`), so
the renderer cannot derive them.

```ts
listDatabases(): Promise<string[]>              // the schemas, on PG
listTables(db): Promise<TableSummary[]>         // { name }
getAllColumns(db): Promise<ColumnDetail[]>
getTableStructure(db, t): QueryResult<TableStructureRow[]>  // display, unchanged
getPrimaryKeyColumns(db, t): Promise<string[]>
getForeignKeys(db, t?): Promise<ForeignKey[]>

interface ColumnDetail {
  table: string; name: string;
  declaredType: string;   // shown, never parsed: `varchar(255)`, `jsonb`
  kind: FieldKind;
  nullable: boolean; generated: boolean; binary: boolean; json: boolean;
  allowedValues: string[];  // empty when the column is not a closed set
  multiValued: boolean;     // a MySQL `SET`
}
```

`SHOW TABLE STATUS` also returned `Rows`, `Data_length` and `Comment`: **no
consumer** (checked — fixtures only). They are not carried over, which spares us
emulating `reltuples`/`pg_table_size` on PG.

### The guarded write

`<=>` does not exist on PG, nor does `LIMIT 1` on an `UPDATE`, and `json` there
has **no equality operator** — hence a `CAST(… AS jsonb)` on **both sides** of
the guard, which also gives the semantics we want (key order stops mattering).
`CAST(x AS jsonb)` and not `::jsonb`: the named-parameter rewriter would read
`:jsonb` as a parameter.

`RETURNING` changes the conversation: on PG a write that matches returns the
row, so `guardMatches` — which only exists to lift the ambiguity of MySQL's
`affectedRows` — becomes useless, and editing a cell costs one query instead of
two.

So the dialect owns the **interpretation** as well as the text, and `updateCell`
keeps no engine branch:

```ts
interface GuardedUpdate {
  write: BuiltQuery;
  readBack: BuiltQuery;
  outcomeOfWrite(written): UpdateCellOutcome | undefined; // MySQL always returns undefined
  outcomeOfReadBack(written, rows): UpdateCellOutcome;
}
```

### Errors

`isSqlError` tests `'code' in e && 'errno' in e`: a `pg` error has a SQLSTATE
`code` but **no `errno`**, so it would be rejected and would reach the route's
ErrorBoundary instead of the result tab. The sniffing is removed rather than
widened: the driver classifies at the source and the error carries a
`kind: 'sql'` tag, exactly as `asConnectionError` already does. Same for the
"connection is in closed state" retry, a mysql2 message, which becomes
`driver.isConnectionLost(error)`.

`type-guard.ts` sniffs `ResultSetHeader` keys (`fieldCount`, `serverStatus`…):
an `INSERT` on PG would display nothing in the raw SQL page. It is replaced by a
`WriteResult` with an explicit discriminant.

## Stage 1 — neutral abstraction, MySQL only

Every commit leaves `yarn lint && yarn test` green. The `refactor:` ones change
nothing visible; the three `fix:` ones are isolated and each carries its test.

| #   | Status   | Commit                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| --- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | **done** | `DatabaseEngine`, `ConnectionObject.engine`, default decided in `loadConfiguration`                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| 2   | **done** | `src/sql/dialect/`: `Dialect`, `getDialect()`, MySQL dialect. `escapeIdentifier.ts` moves in, `qualify()` and `useDatabase()` join it. The 7 callers switch: `#dialect()` in the main process, a `useDialect()` hook in the renderer, `loadDialect()` for the SQL page action, which is not a component. `buildUpdateCellQuery` and `filterClause` keep importing `escapeIdentifier` straight until commits 10 and 3 move them in. _(Merged with what was commit 3: a dialect module no caller imports is a knip finding.)_           |
| 3   | **done** | `dialect.escapeLiteral` and `booleanLiteral`. `cellValueToSqlLiteral` and `CellContextMenu` stop importing `mysql`, and `buildFilterClause` takes the dialect. `escapeLiteral` is typed on a string: `escape` takes `any`, and its object branch calls `Buffer.isBuffer` — undefined in the renderer — while its `Date` branch shifts the value into a time zone it never had                                                                                                                                                         |
| 4   | **done** | **`fix`** `ForeignKeyLink` builds its filter through `buildFilterClause`/`cellValueToSqlLiteral`; the dialect reaches it as a prop from `TableGrid.columnsMeta`, since a hook there would cost two `useContext` per cell. Visible: `?where=col="42"` becomes `` `col` = 42 ``, and a key holding NULL no longer offers a link to a row it never pointed at                                                                                                                                                                            |
| 5   | **done** | `src/sql/driver/`: MySQL driver extracted from `#connect`/`#executeQuery`, `loadDriver()` carries the lazy import and memoises it, the `end`/`error` listeners go behind `onClosed`, and the retry goes through `isConnectionLost` — on the _connection_ rather than the driver, since only a query sent down an open socket can lose it. The driver is handed named parameters instead of a spread of the stored connection, so no field of ours reaches it by accident. Decryption stays in the stack, where CLAUDE.md documents it |
| 6   | **done** | `WriteResult`, `ResultRow`, `type-guard.ts` deleted. A result is rows or a write summary, and `Array.isArray` separates them — no key of a driver's own is read. `RowDataPacket` leaves the renderer with it. **IPC contract changed — restart the app**                                                                                                                                                                                                                                                                              |
| 7   | todo     | `FieldKind` and `ResultField`, mapping in `driver/mysql/fieldKind.ts` written **from `Types`**, never from bare numbers, with an exhaustiveness test. `QueryResult<T> = [T, ResultField[]]`. The big one (~22 files) but indivisible. **Restart the app**                                                                                                                                                                                                                                                                             |
| 8   | todo     | **`fix`** `Cell.tsx`: the three rendering tiers, `Unknown` → `String(value)`. Visible: a `TIME`/`YEAR`/`BIT`/`GEOMETRY`/`BLOB` column shows its value instead of blanking the grid                                                                                                                                                                                                                                                                                                                                                    |
| 8b  | todo     | **`fix`** _(optional, low priority — stored procedures are not a goal today)_ `toQueryReturn` tells a stored procedure's answer from rows. Measured on `tiana-dev-mysql`: `CALL p()` answers `[RowDataPacket[], ResultSetHeader]` where `SELECT` answers `RowDataPacket[]`, and mysql2 declares both — today the `CALL` reaches the grid as two nonsense rows, as it already did through `isRowDataPacketArray`. The discriminant stays key-free: the first element is an array while the last is not. A `CALL` is one statement, so the SQL editor sends it. Visible: `CALL p()` shows its first result set. It belongs in `driver/mysql/`, not in the dialect — it is about what the socket answered, not about SQL text, and PostgreSQL has no equivalent shape |
| 9   | todo     | The 6 metadata queries move into `dialect/mysql/metadata.ts`, normalised shapes, no interpolated identifier left (everything bound by name). `dataType.ts` and the column semantics move into the dialect. **Restart the app**                                                                                                                                                                                                                                                                                                        |
| 10  | todo     | `GuardedUpdate`: `buildUpdateCellQuery.ts` → `dialect/mysql/guardedUpdate.ts`, `updateCell` without an engine branch                                                                                                                                                                                                                                                                                                                                                                                                                  |
| 11  | todo     | `SqlErrorData` normalised, `driver.asSqlError`, `isSqlError` by tag. `SqlErrorComponent` only prints `errno` when it is there                                                                                                                                                                                                                                                                                                                                                                                                         |
| 12  | todo     | `src/sql/parser/`: `getParser(engine)`, `splitStatements`/`hasLimitClause`/`extractTableAliases`/`analyzeQuery` take the engine. `MonacoEditor/language.ts`. `MARKER_OWNER` → `'sql-syntax'`                                                                                                                                                                                                                                                                                                                                          |
| 13  | todo     | `dialect/dialect.contract.test.ts` (one dialect for now)                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| 14  | todo     | **`fix`** _(optional)_ `ConnectionForm.handleSubmit` turns `port` into a number — the `<Input>` is text, so the submitted value is a string while the type says `number`                                                                                                                                                                                                                                                                                                                                                              |

## Stage 2 — PostgreSQL

| #   | Status | Commit                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| --- | ------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 15  | todo   | _(no code)_ A persistent `tiana-dev-postgres` container (named volume, no `--rm`, `--restart unless-stopped`, port 15432), the connection named with the `(dev)` marker. Verification schema: a **composite** foreign key, an enum type, a `json` **and** a `jsonb` column, a `STORED GENERATED` column, an `identity` column, a never-`ANALYZE`d table, `text[]`, `bytea`, a view, a materialised view, a partitioned table, an identifier holding a `"` and a `.`          |
| 16  | todo   | `pg` and `@types/pg`. **Handle the build risk first**: `vite.main.config.ts` has no `rollupOptions.external`, so `pg` gets bundled — and `pg-cloudflare` does `import('cloudflare:sockets')` while `pg` does an optional `require('pg-native')`, neither of which rollup can resolve. Mitigation: `external: ['cloudflare:sockets', 'pg-native']`. This commit proves one thing: the bundle builds and the app starts                                                        |
| 17  | todo   | `DatabaseEngine.PostgreSQL`, `ConnectionObject.database`. Form: a `block` `Segmented` **with no label** (rule "a label is not a control" — the words are inside it), as the **leading group** since it reconfigures what follows; a `database` field **under** the host/port row with `preserve={false}`; engine-dependent port/user defaults, rewritten only while they still hold the other engine's default. Locales EN then FR, one ICU `select` key for the engine name |
| 18  | todo   | `dialect/postgres/`: `"…"` identifiers, `'…'` literals (hand-written — `pg` is CommonJS so out of the renderer's reach, and the literal is built synchronously inside a menu label), `TRUE`/`FALSE`, `SET search_path TO "s"`, the 6 metadata queries. `dialect.contract.test.ts` becomes a `describe.each`                                                                                                                                                                  |
| 19  | todo   | `driver/postgres/namedPlaceholders.ts`: `:name` → `$n`, a repeated name reusing the same `$n`. Must leave alone a `:` in a literal, a `::cast`, a `--`/`/* */` comment, a `"quoted:identifier"` and a `$$ dollar:quoted $$`. Pure, testable on its own                                                                                                                                                                                                                       |
| 20  | todo   | `driver/postgres/`: connect (with an `invariant` on `database`), query, `rowMode: 'array'`, OID → `FieldKind` from `pg.types.builtins`, `isConnectionLost`, `asSqlError`, tagging the timeout (`connectionTimeoutMillis` throws without a `code`). **First working PG connection**                                                                                                                                                                                           |
| 21  | todo   | `catalogCache.ts`: OID → relation name, which the foreign-key links depend on (`pg` gives `tableID`, not a name, and `TableGrid` reads `field.table`); and OID → `FieldKind` for user types, whose OID is not known at build time                                                                                                                                                                                                                                            |
| 22  | todo   | `connectionError.ts`: SQLSTATE `28P01`, `28000`, `3D000`, `53300`, `08001`, `08004`; two new reasons, `unknownDatabase` and `tooManyConnections`, which serve MySQL too. Locales                                                                                                                                                                                                                                                                                             |
| 23  | todo   | `dialect/postgres/guardedUpdate.ts`: `IS NOT DISTINCT FROM`, `CAST(… AS jsonb)` on both sides, `RETURNING`, no bound                                                                                                                                                                                                                                                                                                                                                         |
| 24  | todo   | `dialect/postgres/columnSemantics.ts`: `bytea` is binary, `json`/`jsonb`, `identity`/`generated`, enum labels carried by the query                                                                                                                                                                                                                                                                                                                                           |
| 25  | todo   | PG parser (`dt-sql-parser` exports `PostgreSQL`, same API), Monaco `pgsql` (`LanguageIdEnum.PG`), PG reserved words added to the union. Both language contributions are imported statically (Monaco loads the tokenizer lazily). **`SqlPage` does not unmount when the connection changes** — same route object — so `setModelLanguage` imperatively plus a marker flush, never a `key={engine}`, which would lose the content and the undo history                          |
| 26  | todo   | The engine in the connection list meta and in the title bar's `title`. **Not** in the title bar text: colour there is already taken by the prod/dev marker, and doubling every tab's text breaks the 44px floor                                                                                                                                                                                                                                                              |
| 27  | todo   | Docs: README ("Database support"), CLAUDE.md (library table, SQL editor section, the now-void "import `Types` from `mysql`" gotcha), the `sql-editor` skill, `.ai/lessons.md`                                                                                                                                                                                                                                                                                                |

## To check rather than assume

The project rule is that a claim about what a server accepts costs a container.
**No PG query in this plan has been run.** The six metadata queries go through
the verification schema of commit 15, output pasted into the PR. The three most
likely to be wrong:

- `a.attnum = ANY (i.indkey::smallint[])` — `indkey` is an `int2vector`;
  fallback `array_position(i.indkey::smallint[], a.attnum) IS NOT NULL`.
- the interop shape of `pg` under Vite/Vitest (`{ default: {Client}, Client }`
  or `default` only) — a throwaway test before writing the driver.
- PG foreign keys: **do not go through `information_schema`**.
  `constraint_column_usage` carries no ordinal position, so a composite key
  `(a,b) → (x,y)` comes out as a 4-row cross product with no way to pair them
  back — the link would point at the wrong column, silently.
  `pg_constraint.conkey`/`confkey` are two parallel arrays that
  `unnest … WITH ORDINALITY` pairs exactly.

Two behaviour gaps to own and name in the PR: the structure page's `Key` column
is **synthesised** from `pg_index` (PG publishes no `COLUMN_KEY`) and will mark
every column of a composite index where MySQL marks only the first; and the
`pgsql` Monarch tokenizer colours a quoted identifier as a literal — not fixable
through the theme, since it is the same token name as a real string.

## Verification

At every commit: `yarn lint && yarn test`. After any commit touching an IPC
contract (6, 7, 9), **restart the app fully** — the main process is not
hot-reloaded.

Tests, the trap to avoid: `expect(sql).toBe(dialect.listTables('x').sql)` tests
nothing, and neither does a helper that rebuilds the expected text. So:

- **text** is asserted as a hand-written literal, in a file of its own per
  dialect. For the PG catalog queries, which run 30 lines, the whole query is
  not asserted — only markers that each **name a known bug**
  (`src.ord = tgt.ord` for pairing composite foreign keys).
- **invariants** are tested once, `describe.each` over the dialects, in
  `dialect.contract.test.ts`: every query binds exactly the parameters it names
  (the generalisation of the test the `named-placeholders` lesson paid for), no
  inner `;`, `escapeIdentifier` throws on the empty string and doubles its own
  quote character, a dotted name stays **one** identifier.
- the guarded write's **decision table** is tested per dialect, on hand-built
  fixtures: the two tables differ on purpose (PG decides on `RETURNING`, MySQL
  on `affectedRows` + `guardMatches`), and that gap is exactly what a reviewer
  should see.
- `src/sql/index.test.ts` now tests **routing**: an `engine: 'mysql'` config
  produces a query holding `INFORMATION_SCHEMA`, an `engine: 'postgresql'` one a
  query holding `pg_catalog.pg_namespace` — markers impossible in the other
  dialect.

In the app, against `tiana-dev-postgres` then `tiana-dev-mysql` for
non-regression: open the connection, move between schemas, open a wide table and
scroll, filter with `WHERE`, filter from a cell's context menu (including on a
value holding an apostrophe), follow a foreign-key link, open the structure
page, edit a cell of each type (text, number, date, `jsonb`, enum), force a
conflict by changing the row elsewhere before saving, run several statements in
the editor including a `CREATE FUNCTION … $$ … ; … $$` (which must stay **one**
statement), check completion and error underlining, draw a chart, and move from
a MySQL connection to a PG one **without restarting** to see the editor change
grammar.
