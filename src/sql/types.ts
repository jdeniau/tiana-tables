import { FieldPacket } from 'mysql2/promise';
import { ConnectionColor } from '../configuration/connectionColor';
import { DatabaseEngine } from './engine';

/**
 * One row of a result, by column name.
 *
 * `rowsAsArray` answers arrays instead, carried under this same type. The raw
 * SQL page asks for it because a name does not identify a column there:
 * `SELECT a.id, b.id` has two, and an object would keep one.
 */
export type ResultRow = Record<string, unknown>;

/** What a statement that changed rows answered, whichever engine ran it. */
export interface WriteResult {
  affectedRows: number;
  /** `null` where no key was generated: PostgreSQL only answers one on `RETURNING` */
  insertId: number | string | null;
}

export type QueryReturnType = ResultRow[] | WriteResult;

/** Whether a statement changed rows rather than returned them. */
export function isWriteResult(result: QueryReturnType): result is WriteResult {
  return !Array.isArray(result);
}

export type QueryResult<T extends QueryReturnType = QueryReturnType> = Promise<
  [T, FieldPacket[]]
>;

/**
 * Represent a connection object that is stored in the configuration file.
 * It is also used to connect to the database.
 */
export type ConnectionObject = {
  name: string;
  slug: string;
  engine: DatabaseEngine;
  host: string;
  port: number;
  user: string;
  password: string;
  color?: ConnectionColor;
};

export type ConnectionObjectWithoutSlug = Omit<ConnectionObject, 'slug'>;

/**
 * Represent the return type of "SHOW DATABASES;" query.
 */
interface ShowDatabaseRow extends ResultRow {
  Database: string;
}
export type ShowDatabasesResult = ShowDatabaseRow[];

export interface ShowTableStatus extends ResultRow {
  Name: string;
  Rows: number;
  Data_length: number;
  Comment: string;
  // And more, but not useful for now
}

export type ShowTableStatusResult = ShowTableStatus[];

export interface KeyColumnUsageRow extends ResultRow {
  TABLE_NAME: string;
  COLUMN_NAME: string;
  CONSTRAINT_NAME: string;
  REFERENCED_TABLE_NAME: string | null;
  REFERENCED_COLUMN_NAME: string | null;
}

export interface ColumnDetail extends ResultRow {
  Table: string;
  Column: string;
  /** the bare type, e.g. `varchar`, `enum`, `text` */
  DataType: string;
  /** `YES` or `NO`, spelled the way INFORMATION_SCHEMA does */
  IsNullable: string;
  /** the whole declaration, e.g. `varchar(255)` or `enum('a','b')` */
  ColumnType: string;
  ColumnDefault: string | null;
  /** holds `VIRTUAL GENERATED` / `STORED GENERATED`, `auto_increment`, … */
  Extra: string;
}

export type ColumnDetailResult = ColumnDetail[];

/**
 * One row of the structure page: a column of a table as INFORMATION_SCHEMA
 * describes it, plus what it references.
 *
 * The keys are the aliases of the query in `getTableStructure`, and they are
 * what the grid prints as column heads — so they read as a structure sheet
 * (`Type`, `Null`, `Default`) rather than as INFORMATION_SCHEMA's own
 * `SCREAMING_SNAKE_CASE`.
 */
interface TableStructureRow extends ResultRow {
  Column: string;
  /** the whole declaration, e.g. `varchar(255)` or `enum('a','b')` */
  Type: string;
  /** `YES` or `NO`, spelled the way INFORMATION_SCHEMA does */
  Null: string;
  /** `PRI`, `UNI`, `MUL` or empty */
  Key: string;
  Default: string | null;
  /** holds `auto_increment`, `VIRTUAL GENERATED`, `on update …`, … */
  Extra: string;
  /** `table.column` of every foreign key on this column, `null` when there is none */
  References: string | null;
  Collation: string | null;
  Comment: string;
}

export type TableStructureResult = TableStructureRow[];

/**
 * A value bound to a placeholder of an UPDATE. Values travel over IPC, so they
 * are limited to what structured clone carries: `Date` survives, and every
 * edited value is sent as a string (see `buildUpdateCellQuery`).
 */
export type SqlBoundValue = string | number | Date | null;

/**
 * The parameters of a query, by name.
 *
 * Every query built in the main process names its placeholders (`:tableName`)
 * instead of counting `?`, so a value is bound by what it is rather than by
 * where it sits in a list.
 */
export type SqlBoundValues = Record<string, SqlBoundValue>;

/**
 * A `KEY_COLUMN_USAGE` row narrowed to the foreign keys: the two `REFERENCED_`
 * columns are `NULL` for every other kind of key.
 *
 * @public
 */
export interface ForeignKeyRow extends KeyColumnUsageRow {
  REFERENCED_TABLE_NAME: string;
  REFERENCED_COLUMN_NAME: string;
}

export interface ShowKeyRow extends ResultRow {
  Column_name: string;
}
