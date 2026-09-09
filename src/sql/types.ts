import {
  FieldPacket,
  ProcedureCallPacket,
  ResultSetHeader,
  RowDataPacket,
} from 'mysql2/promise';

export type QueryReturnType =
  | ResultSetHeader
  | ResultSetHeader[]
  | RowDataPacket[]
  | RowDataPacket[][]
  | ProcedureCallPacket;

export type QueryResult<T extends QueryReturnType = QueryReturnType> = Promise<
  [T, FieldPacket[]]
>;

/**
 * Represet a connection object that is stored in the configuration file.
 * It is also used to connect to the database.
 */
export type ConnectionObject = {
  name: string;
  slug: string;
  host: string;
  port: number;
  user: string;
  password: string;
};

export type ConnectionObjectWithoutSlug = Omit<ConnectionObject, 'slug'>;

/**
 * Represent the return type of "SHOW DATABASES;" query.
 */
interface ShowDatabaseRow extends RowDataPacket {
  Database: string;
}
export type ShowDatabasesResult = ShowDatabaseRow[];

export interface ShowTableStatus extends RowDataPacket {
  Name: string;
  Rows: number;
  Data_length: number;
  Comment: string;
  // And more, but not useful for now
}

export type ShowTableStatusResult = ShowTableStatus[];

export interface KeyColumnUsageRow extends RowDataPacket {
  TABLE_NAME: string;
  COLUMN_NAME: string;
  CONSTRAINT_NAME: string;
  REFERENCED_TABLE_NAME: string | null;
  REFERENCED_COLUMN_NAME: string | null;
}

export interface ColumnDetail extends RowDataPacket {
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
interface TableStructureRow extends RowDataPacket {
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

export interface ShowKeyRow extends RowDataPacket {
  Column_name: string;
}
