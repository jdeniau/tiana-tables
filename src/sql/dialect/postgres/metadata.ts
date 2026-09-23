import { z } from 'zod';
import type { DialectMetadata } from '../metadata';
import { readQuery } from '../readQuery';

/**
 * The relations the app browses: tables, views, materialised views,
 * partitioned and foreign tables. Indexes, sequences and TOAST tables are not.
 */
const BROWSED_RELATIONS = `c.relkind IN ('r', 'v', 'm', 'p', 'f')`;

/**
 * The rows each statement selects, in the catalog's own names.
 * An alias is written in lower case where two columns share a name:
 * PostgreSQL folds an unquoted one.
 */
const namespaceRow = z.object({ nspname: z.string() });
const relationRow = z.object({ relname: z.string() });
const attributeRow = z.object({ attname: z.string() });

const foreignKeyRow = z.object({
  table_name: z.string(),
  column_name: z.string(),
  referenced_table: z.string(),
  referenced_column: z.string(),
});

const columnRow = z.object({
  relname: z.string(),
  attname: z.string(),
  attnotnull: z.boolean(),
  /** `s` for a stored generated column, `v` for a virtual one, empty otherwise */
  attgenerated: z.string(),
  /** `a` for `GENERATED ALWAYS AS IDENTITY`, `d` for `BY DEFAULT`, empty otherwise */
  attidentity: z.string(),
  typname: z.string(),
  /** in their declared order, `null` when the type is no enum */
  enum_labels: z.array(z.string()).nullable(),
});

const describedColumnRow = z.object({
  attname: z.string(),
  column_type: z.string(),
  is_nullable: z.string(),
  column_key: z.string(),
  column_default: z.string().nullable(),
  extra: z.string().nullable(),
  collname: z.string().nullable(),
  column_comment: z.string(),
});

/** Types holding bytes, which a text editor would corrupt. */
const BINARY_TYPES: ReadonlySet<string> = new Set(['bytea']);

/** `json` has no equality operator, `jsonb` does: both are JSON to the editor. */
const JSON_TYPES: ReadonlySet<string> = new Set(['json', 'jsonb']);

/**
 * `pg_catalog` rather than `information_schema`,
 * which publishes neither enum labels nor the pairing of a composite key.
 * The UI's database is a schema of the connection's database.
 */
export const postgresMetadata: DialectMetadata = {
  // the schemas the user may look into, TOAST and temporary ones aside
  listDatabases: () =>
    readQuery('listDatabases', {
      sql: `
        SELECT nspname
        FROM pg_catalog.pg_namespace
        WHERE nspname NOT LIKE 'pg\\_toast%'
          AND nspname NOT LIKE 'pg\\_temp\\_%'
          AND has_schema_privilege(oid, 'USAGE')
      `,
      values: {},
      row: namespaceRow,
      read: (rows) => rows.map((row) => row.nspname),
    }),

  listTables: (databaseName) =>
    readQuery('listTables', {
      sql: `
        SELECT c.relname
        FROM pg_catalog.pg_class c
        JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
        WHERE n.nspname = :databaseName
          AND ${BROWSED_RELATIONS}
      `,
      values: { databaseName },
      row: relationRow,
      read: (rows) => rows.map((row) => row.relname),
    }),

  // `conkey` and `confkey` are parallel: unnested together, they pair each column with its target.
  // Left out: a key to another schema, since a link names a table of the current one,
  // and the copy a partition inherits (`conparentid`), which would double its parent's
  listForeignKeys: (databaseName) =>
    readQuery('listForeignKeys', {
      sql: `
        SELECT
          source.relname AS table_name,
          source_column.attname AS column_name,
          target.relname AS referenced_table,
          target_column.attname AS referenced_column
        FROM pg_catalog.pg_constraint con
        JOIN pg_catalog.pg_class source ON source.oid = con.conrelid
        JOIN pg_catalog.pg_namespace n ON n.oid = source.relnamespace
        JOIN pg_catalog.pg_class target ON target.oid = con.confrelid
        CROSS JOIN LATERAL unnest(con.conkey, con.confkey)
          WITH ORDINALITY AS pair(source_attnum, target_attnum, position)
        JOIN pg_catalog.pg_attribute source_column
          ON source_column.attrelid = con.conrelid
          AND source_column.attnum = pair.source_attnum
        JOIN pg_catalog.pg_attribute target_column
          ON target_column.attrelid = con.confrelid
          AND target_column.attnum = pair.target_attnum
        WHERE con.contype = 'f'
          AND con.conparentid = 0
          AND n.nspname = :databaseName
          AND target.relnamespace = source.relnamespace
        ORDER BY source.relname, con.conname, pair.position
      `,
      values: { databaseName },
      row: foreignKeyRow,
      read: (rows) =>
        rows.map((row) => ({
          table: row.table_name,
          column: row.column_name,
          referencedTable: row.referenced_table,
          referencedColumn: row.referenced_column,
        })),
    }),

  // `conkey` holds the key in its declared order, which a row key must follow
  listPrimaryKeyColumns: (databaseName, tableName) =>
    readQuery('listPrimaryKeyColumns', {
      sql: `
        SELECT a.attname
        FROM pg_catalog.pg_constraint con
        JOIN pg_catalog.pg_class c ON c.oid = con.conrelid
        JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
        CROSS JOIN LATERAL unnest(con.conkey)
          WITH ORDINALITY AS k(attnum, position)
        JOIN pg_catalog.pg_attribute a
          ON a.attrelid = c.oid AND a.attnum = k.attnum
        WHERE con.contype = 'p'
          AND n.nspname = :databaseName
          AND c.relname = :tableName
        ORDER BY k.position
      `,
      values: { databaseName, tableName },
      row: attributeRow,
      read: (rows) => rows.map((row) => row.attname),
    }),

  // an enum's labels live in `pg_enum` and nowhere else, so they come with it;
  // as `text`, since `pg` leaves an array of `name` undecoded (measured)
  listColumns: (databaseName) =>
    readQuery('listColumns', {
      sql: `
        SELECT
          c.relname,
          a.attname,
          a.attnotnull,
          a.attgenerated,
          a.attidentity,
          t.typname,
          (
            SELECT array_agg(CAST(e.enumlabel AS text) ORDER BY e.enumsortorder)
            FROM pg_catalog.pg_enum e
            WHERE e.enumtypid = t.oid
          ) AS enum_labels
        FROM pg_catalog.pg_attribute a
        JOIN pg_catalog.pg_class c ON c.oid = a.attrelid
        JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
        JOIN pg_catalog.pg_type t ON t.oid = a.atttypid
        WHERE n.nspname = :databaseName
          AND ${BROWSED_RELATIONS}
          AND a.attnum > 0
          AND NOT a.attisdropped
        ORDER BY c.relname, a.attnum
      `,
      values: { databaseName },
      row: columnRow,
      read: (rows) =>
        rows.map((row) => ({
          table: row.relname,
          name: row.attname,
          nullable: !row.attnotnull,
          // an `ALWAYS` identity refuses any value but `DEFAULT`, as a generated column does
          generated: row.attgenerated !== '' || row.attidentity === 'a',
          binary: BINARY_TYPES.has(row.typname),
          json: JSON_TYPES.has(row.typname),
          allowedValues: row.enum_labels ?? [],
          multiValued: false,
        })),
    }),

  // `Key` is built from `pg_index`, as PostgreSQL publishes no COLUMN_KEY — read the way MySQL does:
  // `PRI` on each column of the primary key, `UNI` alone in a unique index, `MUL` first in another
  describeTable: (databaseName, tableName) =>
    readQuery('describeTable', {
      sql: `
        SELECT
          a.attname,
          format_type(a.atttypid, a.atttypmod) AS column_type,
          CASE WHEN a.attnotnull THEN 'NO' ELSE 'YES' END AS is_nullable,
          CASE
            WHEN EXISTS (
              SELECT FROM pg_catalog.pg_index i
              WHERE i.indrelid = c.oid AND i.indisprimary
                AND a.attnum = ANY (i.indkey)
            ) THEN 'PRI'
            WHEN EXISTS (
              SELECT FROM pg_catalog.pg_index i
              WHERE i.indrelid = c.oid AND i.indisunique AND i.indnatts = 1
                AND i.indkey[0] = a.attnum
            ) THEN 'UNI'
            WHEN EXISTS (
              SELECT FROM pg_catalog.pg_index i
              WHERE i.indrelid = c.oid AND i.indkey[0] = a.attnum
            ) THEN 'MUL'
            ELSE ''
          END AS column_key,
          CASE WHEN a.attgenerated = ''
            THEN pg_get_expr(d.adbin, d.adrelid)
          END AS column_default,
          CASE
            WHEN a.attidentity = 'a' THEN 'GENERATED ALWAYS AS IDENTITY'
            WHEN a.attidentity = 'd' THEN 'GENERATED BY DEFAULT AS IDENTITY'
            WHEN a.attgenerated = 's'
              THEN 'GENERATED ALWAYS AS (' || pg_get_expr(d.adbin, d.adrelid) || ') STORED'
            WHEN a.attgenerated = 'v'
              THEN 'GENERATED ALWAYS AS (' || pg_get_expr(d.adbin, d.adrelid) || ') VIRTUAL'
          END AS extra,
          co.collname,
          COALESCE(col_description(c.oid, a.attnum), '') AS column_comment
        FROM pg_catalog.pg_attribute a
        JOIN pg_catalog.pg_class c ON c.oid = a.attrelid
        JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
        LEFT JOIN pg_catalog.pg_attrdef d
          ON d.adrelid = a.attrelid AND d.adnum = a.attnum
        LEFT JOIN pg_catalog.pg_collation co ON co.oid = a.attcollation
        WHERE n.nspname = :databaseName
          AND c.relname = :tableName
          AND a.attnum > 0
          AND NOT a.attisdropped
        ORDER BY a.attnum
      `,
      values: { databaseName, tableName },
      row: describedColumnRow,
      read: (rows) =>
        rows.map((row) => ({
          Column: row.attname,
          Type: row.column_type,
          Null: row.is_nullable,
          Key: row.column_key,
          Default: row.column_default,
          Extra: row.extra,
          Collation: row.collname,
          Comment: row.column_comment,
        })),
    }),
};
