import invariant from 'tiny-invariant';
import { z } from 'zod';
import type { DialectMetadata } from '../metadata';
import { readQuery } from '../readQuery';

/**
 * The relations the app browses: tables, views and virtual tables.
 * Left out: the shadow tables a virtual one keeps its data in, and SQLite's own (`sqlite_schema`, `sqlite_sequence`…).
 */
const BROWSED_RELATIONS = `t.type IN ('table', 'view', 'virtual') AND t.name NOT LIKE 'sqlite\\_%' ESCAPE '\\'`;

/** What `pragma_table_xinfo` says of a column in its `hidden` column. */
enum HiddenColumn {
  /** a hidden column of a virtual table, which `SELECT *` leaves out */
  Hidden = 1,
  VirtualGenerated = 2,
  StoredGenerated = 3,
}

/**
 * Whether a column is the rowid under its own name, which refuses NULL though its `notnull` says otherwise:
 * a primary key with no index of its own (`INTEGER PRIMARY KEY`, but not `INTEGER PRIMARY KEY DESC`).
 */
const isRowid = (table: string, schema: string): string => `
  c.pk > 0 AND NOT EXISTS (
    SELECT 1 FROM pragma_index_list(${table}, ${schema}) AS i WHERE i.origin = 'pk'
  )`;

/** A truth as SQLite answers one: `0` or `1`. */
const truth = z.union([z.literal(0), z.literal(1)]).transform((t) => t === 1);

const databaseRow = z.object({ name: z.string() });
const tableRow = z.object({ name: z.string() });
const columnNameRow = z.object({ name: z.string() });

const foreignKeyRow = z.object({
  /** the number of the key within its table: SQLite publishes no constraint name */
  id: z.number(),
  table_name: z.string(),
  column_name: z.string(),
  referenced_table: z.string(),
  referenced_column: z.string(),
});

const columnRow = z.object({
  table_name: z.string(),
  name: z.string(),
  /** the type as declared, `''` when there is none */
  type: z.string(),
  notnull: truth,
  hidden: z.number(),
  is_rowid: truth,
});

const describedColumnRow = z.object({
  name: z.string(),
  type: z.string(),
  notnull: truth,
  /** the default as an expression: a text keeps its quotes */
  dflt_value: z.string().nullable(),
  /** its position in the primary key, `0` outside it */
  pk: z.number(),
  hidden: z.number(),
  is_rowid: truth,
  unique_alone: truth,
  first_of_index: truth,
});

type DescribedColumnRow = z.infer<typeof describedColumnRow>;

const timeZoneRow = z.object({ zone: z.string() });

function isGenerated(hidden: number): boolean {
  return (
    hidden === HiddenColumn.VirtualGenerated ||
    hidden === HiddenColumn.StoredGenerated
  );
}

/** `Key` in MySQL's reading: `PRI` on each column of the primary key, `UNI` alone in a unique index, `MUL` first in another. */
function columnKey(row: DescribedColumnRow): string {
  if (row.pk > 0) {
    return 'PRI';
  }

  if (row.unique_alone) {
    return 'UNI';
  }

  return row.first_of_index ? 'MUL' : '';
}

/** `Extra` in MySQL's words; the expression of a generated column is only in the `CREATE TABLE`. */
function columnExtra(row: DescribedColumnRow): string | null {
  switch (row.hidden) {
    case HiddenColumn.VirtualGenerated:
      return 'VIRTUAL GENERATED';
    case HiddenColumn.StoredGenerated:
      return 'STORED GENERATED';
    default:
      return null;
  }
}

/**
 * A declared type holding `BLOB` stores what it is given as bytes;
 * a column declared with no type takes text as text, so it stays editable.
 */
function isBinaryType(declaredType: string): boolean {
  return declaredType.toUpperCase().includes('BLOB');
}

/**
 * The `pragma_*` table-valued functions, which take the schema as their last argument.
 * The UI's database is `main`, the file the connection opens.
 */
export const sqliteMetadata: DialectMetadata = {
  // the databases attached with `ATTACH` and `temp` are left out: a statement names them itself
  listDatabases: () =>
    readQuery('listDatabases', {
      sql: "SELECT name FROM pragma_database_list WHERE name = 'main'",
      values: {},
      row: databaseRow,
      read: (rows) => rows.map((row) => row.name),
    }),

  listTables: (databaseName) =>
    readQuery('listTables', {
      sql: `
        SELECT t.name
        FROM pragma_table_list AS t
        WHERE t.schema = :databaseName
          AND ${BROWSED_RELATIONS}
      `,
      values: { databaseName },
      row: tableRow,
      read: (rows) => rows.map((row) => row.name),
    }),

  // a key declared without its columns (`REFERENCES parent`) points at the parent's primary key:
  // its `to` is NULL, and the primary key column at the same position answers it
  listForeignKeys: (databaseName) =>
    readQuery('listForeignKeys', {
      sql: `
        SELECT
          fk.id,
          t.name AS table_name,
          fk."from" AS column_name,
          fk."table" AS referenced_table,
          COALESCE(
            fk."to",
            (
              SELECT p.name
              FROM pragma_table_info(fk."table", t.schema) AS p
              WHERE p.pk = fk.seq + 1
            )
          ) AS referenced_column
        FROM pragma_table_list AS t
        JOIN pragma_foreign_key_list(t.name, t.schema) AS fk
        WHERE t.schema = :databaseName
          AND t.type = 'table'
        ORDER BY t.name, fk.id, fk.seq
      `,
      values: { databaseName },
      row: foreignKeyRow,
      read: (rows) =>
        rows.map((row) => ({
          constraintName: String(row.id),
          table: row.table_name,
          column: row.column_name,
          // a key names a table of its own database only
          referencedDatabase: databaseName,
          referencedTable: row.referenced_table,
          referencedColumn: row.referenced_column,
        })),
    }),

  listPrimaryKeyColumns: (databaseName, tableName) =>
    readQuery('listPrimaryKeyColumns', {
      sql: `
        SELECT c.name
        FROM pragma_table_info(:tableName, :databaseName) AS c
        WHERE c.pk > 0
        ORDER BY c.pk
      `,
      values: { databaseName, tableName },
      row: columnNameRow,
      read: (rows) => rows.map((row) => row.name),
    }),

  // `xinfo` rather than `info`, which leaves the generated columns out
  listColumns: (databaseName) =>
    readQuery('listColumns', {
      sql: `
        SELECT
          t.name AS table_name,
          c.name,
          c.type,
          c."notnull",
          c.hidden,
          ${isRowid('t.name', 't.schema')} AS is_rowid
        FROM pragma_table_list AS t
        JOIN pragma_table_xinfo(t.name, t.schema) AS c
        WHERE t.schema = :databaseName
          AND ${BROWSED_RELATIONS}
          AND c.hidden <> ${HiddenColumn.Hidden}
        ORDER BY t.name, c.cid
      `,
      values: { databaseName },
      row: columnRow,
      read: (rows) =>
        rows.map((row) => ({
          table: row.table_name,
          name: row.name,
          nullable: !row.notnull && !row.is_rowid,
          generated: isGenerated(row.hidden),
          binary: isBinaryType(row.type),
          // JSON is text here, with no type of its own to cast to
          hasJsonType: false,
          allowedValues: [],
          multiValued: false,
        })),
    }),

  // an index names its columns by position: `seqno = 0` is its first
  describeTable: (databaseName, tableName) =>
    readQuery('describeTable', {
      sql: `
        SELECT
          c.name,
          c.type,
          c."notnull",
          c.dflt_value,
          c.pk,
          c.hidden,
          ${isRowid(':tableName', ':databaseName')} AS is_rowid,
          EXISTS (
            SELECT 1
            FROM pragma_index_list(:tableName, :databaseName) AS i
            JOIN pragma_index_info(i.name, :databaseName) AS ic
            WHERE i."unique"
              AND ic.name = c.name
              AND (SELECT count(*) FROM pragma_index_info(i.name, :databaseName)) = 1
          ) AS unique_alone,
          EXISTS (
            SELECT 1
            FROM pragma_index_list(:tableName, :databaseName) AS i
            JOIN pragma_index_info(i.name, :databaseName) AS ic
            WHERE ic.seqno = 0 AND ic.name = c.name
          ) AS first_of_index
        FROM pragma_table_xinfo(:tableName, :databaseName) AS c
        WHERE c.hidden <> ${HiddenColumn.Hidden}
        ORDER BY c.cid
      `,
      values: { databaseName, tableName },
      row: describedColumnRow,
      read: (rows) =>
        rows.map((row) => ({
          Column: row.name,
          Type: row.type,
          Null: row.notnull || row.is_rowid ? 'NO' : 'YES',
          Key: columnKey(row),
          Default: row.dflt_value,
          Extra: columnExtra(row),
          // a column's collation and comment are only in the text of its `CREATE TABLE`
          Collation: null,
          Comment: '',
        })),
    }),

  // SQLite keeps no zone: `CURRENT_TIMESTAMP` and `datetime('now')` write UTC
  serverTimeZone: () =>
    readQuery('serverTimeZone', {
      sql: "SELECT 'UTC' AS zone",
      values: {},
      row: timeZoneRow,
      read: ([row]) => {
        invariant(row, 'A SELECT of a constant answers one row');

        return { name: row.zone, isAbbreviation: false };
      },
    }),
};
