import { z } from 'zod';
import type { DialectMetadata } from '../metadata';
import { metadataQuery } from '../metadata';
import {
  isBinary,
  isGenerated,
  isJson,
  isMultiValued,
  isNullable,
  parseEnumValues,
} from './columnSemantics';

/** The rows each statement selects, in INFORMATION_SCHEMA's own names. */
const schemaNameRow = z.object({ SCHEMA_NAME: z.string() });
const tableNameRow = z.object({ TABLE_NAME: z.string() });
const columnNameRow = z.object({ COLUMN_NAME: z.string() });

const foreignKeyRow = z.object({
  TABLE_NAME: z.string(),
  COLUMN_NAME: z.string(),
  REFERENCED_TABLE_NAME: z.string(),
  REFERENCED_COLUMN_NAME: z.string(),
});

const columnRow = z.object({
  TABLE_NAME: z.string(),
  COLUMN_NAME: z.string(),
  DATA_TYPE: z.string(),
  COLUMN_TYPE: z.string(),
  IS_NULLABLE: z.string(),
  // usually the empty string, but the standard allows a NULL
  EXTRA: z.string().nullable(),
});

const describedColumnRow = z.object({
  COLUMN_NAME: z.string(),
  COLUMN_TYPE: z.string(),
  IS_NULLABLE: z.string(),
  COLUMN_KEY: z.string(),
  COLUMN_DEFAULT: z.string().nullable(),
  EXTRA: z.string().nullable(),
  COLLATION_NAME: z.string().nullable(),
  COLUMN_COMMENT: z.string(),
});

/**
 * INFORMATION_SCHEMA rather than `SHOW`,
 * which would need the database or table interpolated into the text.
 */
export const mysqlMetadata: DialectMetadata = {
  listDatabases: () =>
    metadataQuery('listDatabases', {
      sql: `
        SELECT SCHEMA_NAME
        FROM INFORMATION_SCHEMA.SCHEMATA
      `,
      values: {},
      row: schemaNameRow,
      read: (rows) => rows.map((row) => row.SCHEMA_NAME),
    }),

  listTables: (databaseName) =>
    metadataQuery('listTables', {
      sql: `
        SELECT TABLE_NAME
        FROM INFORMATION_SCHEMA.TABLES
        WHERE TABLE_SCHEMA = :databaseName
      `,
      values: { databaseName },
      row: tableNameRow,
      read: (rows) => rows.map((row) => row.TABLE_NAME),
    }),

  listForeignKeys: (databaseName) =>
    metadataQuery('listForeignKeys', {
      sql: `
        SELECT
          TABLE_NAME,
          COLUMN_NAME,
          REFERENCED_TABLE_NAME,
          REFERENCED_COLUMN_NAME
        FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
        WHERE TABLE_SCHEMA = :databaseName
          AND REFERENCED_TABLE_NAME IS NOT NULL
        ORDER BY TABLE_NAME, CONSTRAINT_NAME, ORDINAL_POSITION
      `,
      values: { databaseName },
      row: foreignKeyRow,
      read: (rows) =>
        rows.map((row) => ({
          table: row.TABLE_NAME,
          column: row.COLUMN_NAME,
          referencedTable: row.REFERENCED_TABLE_NAME,
          referencedColumn: row.REFERENCED_COLUMN_NAME,
        })),
    }),

  // `SEQ_IN_INDEX`: a key declared `(y, x)` identifies a row as `(y, x)`,
  // whatever the table order
  listPrimaryKeyColumns: (databaseName, tableName) =>
    metadataQuery('listPrimaryKeyColumns', {
      sql: `
        SELECT COLUMN_NAME
        FROM INFORMATION_SCHEMA.STATISTICS
        WHERE TABLE_SCHEMA = :databaseName
          AND TABLE_NAME = :tableName
          AND INDEX_NAME = 'PRIMARY'
        ORDER BY SEQ_IN_INDEX
      `,
      values: { databaseName, tableName },
      row: columnNameRow,
      read: (rows) => rows.map((row) => row.COLUMN_NAME),
    }),

  listColumns: (databaseName) =>
    metadataQuery('listColumns', {
      sql: `
        SELECT
          TABLE_NAME,
          COLUMN_NAME,
          DATA_TYPE,
          COLUMN_TYPE,
          IS_NULLABLE,
          EXTRA
        FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_SCHEMA = :databaseName
      `,
      values: { databaseName },
      row: columnRow,
      read: (rows) =>
        rows.map((row) => ({
          table: row.TABLE_NAME,
          name: row.COLUMN_NAME,
          nullable: isNullable(row.IS_NULLABLE),
          generated: isGenerated(row.EXTRA),
          binary: isBinary(row.DATA_TYPE),
          json: isJson(row.DATA_TYPE),
          // the values of an `ENUM` are published nowhere but in its declaration
          allowedValues: parseEnumValues(row.COLUMN_TYPE),
          multiValued: isMultiValued(row.DATA_TYPE),
        })),
    }),

  describeTable: (databaseName, tableName) =>
    metadataQuery('describeTable', {
      sql: `
        SELECT
          COLUMN_NAME,
          COLUMN_TYPE,
          IS_NULLABLE,
          COLUMN_KEY,
          COLUMN_DEFAULT,
          EXTRA,
          COLLATION_NAME,
          COLUMN_COMMENT
        FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_SCHEMA = :databaseName
          AND TABLE_NAME = :tableName
        ORDER BY ORDINAL_POSITION
      `,
      values: { databaseName, tableName },
      row: describedColumnRow,
      read: (rows) =>
        rows.map((row) => ({
          Column: row.COLUMN_NAME,
          Type: row.COLUMN_TYPE,
          Null: row.IS_NULLABLE,
          Key: row.COLUMN_KEY,
          Default: row.COLUMN_DEFAULT,
          Extra: row.EXTRA,
          Collation: row.COLLATION_NAME,
          Comment: row.COLUMN_COMMENT,
        })),
    }),
};
