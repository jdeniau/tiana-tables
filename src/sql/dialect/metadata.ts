import type { ResultRow } from '../types';
import type { ReadQuery } from './readQuery';

/** One column that references another, both named as the app knows them. */
export interface ForeignKey {
  table: string;
  column: string;
  referencedTable: string;
  referencedColumn: string;
}

/**
 * What the app knows of a column, resolved by the dialect:
 * its renderer could not find a PostgreSQL enum's labels.
 */
export interface ColumnDetail {
  table: string;
  name: string;
  nullable: boolean;
  /** computed by the server, which refuses to be told what it holds */
  generated: boolean;
  /** bytes rather than text, which a text editor would corrupt */
  binary: boolean;
  json: boolean;
  /** what a closed set accepts, empty where the column is not one */
  allowedValues: string[];
  /** several of `allowedValues` at once: a MySQL `SET` */
  multiValued: boolean;
}

/** One column as the structure page prints it: the keys are its column heads. */
export interface DescribedColumn {
  Column: string;
  /** the whole declaration, e.g. `varchar(255)` or `enum('a','b')` */
  Type: string;
  /** `YES` or `NO`, spelled the way INFORMATION_SCHEMA does */
  Null: string;
  /** `PRI`, `UNI`, `MUL` or empty */
  Key: string;
  Default: string | null;
  /** `auto_increment`, `VIRTUAL GENERATED`, `on update …` */
  Extra: string | null;
  Collation: string | null;
  Comment: string;
}

/** One row of the structure page: a described column, and what it references. */
export interface TableStructureRow extends DescribedColumn, ResultRow {
  /** `table.column` of every foreign key on this column, `null` when there is none */
  References: string | null;
}

/** What the app asks a server about itself. */
export interface DialectMetadata {
  /** The databases, which are the schemas on PostgreSQL, in no particular order. */
  listDatabases(): ReadQuery<string[]>;

  /** Tables and views alike, in no particular order: the app browses both. */
  listTables(databaseName: string): ReadQuery<string[]>;

  /** Only the columns that reference another, the rest being of no use here. */
  listForeignKeys(databaseName: string): ReadQuery<ForeignKey[]>;

  /** In the order the key declares them, which a row key has to agree with. */
  listPrimaryKeyColumns(
    databaseName: string,
    tableName: string
  ): ReadQuery<string[]>;

  listColumns(databaseName: string): ReadQuery<ColumnDetail[]>;

  /** Every column of one table, in the order the table declares them. */
  describeTable(
    databaseName: string,
    tableName: string
  ): ReadQuery<DescribedColumn[]>;
}
