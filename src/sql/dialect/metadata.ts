import { z } from 'zod';
import type { ResultRow, SqlBoundValues } from '../types';

/**
 * A statement with the values its placeholders name:
 * identifiers are bound, never interpolated.
 */
export interface BuiltQuery {
  sql: string;
  values: SqlBoundValues;
}

/**
 * Parses a server's rows against the shape its statement selects,
 * naming the question, row and column that do not fit.
 */
function rowsOf<T>(
  question: string,
  row: z.ZodType<T>,
  rows: ResultRow[]
): T[] {
  const parsed = z.array(row).safeParse(rows);

  if (parsed.success) {
    return parsed.data;
  }

  const [issue] = parsed.error.issues;
  // the path of an array of objects reads `[index, …keys]`
  const [index, ...keys] = issue.path.map(String);
  const where =
    keys.length > 0 ? `row ${index}, ${keys.join('.')}` : `row ${index}`;

  throw new Error(
    `${question} answered a row this dialect cannot read — ${where}: ${issue.message}`
  );
}

/** A metadata statement, and how to read what the server answers to it. */
export interface MetadataQuery<Answer> extends BuiltQuery {
  answer(rows: ResultRow[]): Answer;
}

/**
 * The one way a dialect writes a metadata question:
 * the rows are parsed against `row` before `read` sees them.
 */
export function metadataQuery<Row, Answer>(
  question: string,
  query: BuiltQuery & {
    row: z.ZodType<Row>;
    read(rows: Row[]): Answer;
  }
): MetadataQuery<Answer> {
  return {
    sql: query.sql,
    values: query.values,
    answer: (rows) => query.read(rowsOf(question, query.row, rows)),
  };
}

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
  listDatabases(): MetadataQuery<string[]>;

  /** Tables and views alike, in no particular order: the app browses both. */
  listTables(databaseName: string): MetadataQuery<string[]>;

  /** Only the columns that reference another, the rest being of no use here. */
  listForeignKeys(databaseName: string): MetadataQuery<ForeignKey[]>;

  /** In the order the key declares them, which a row key has to agree with. */
  listPrimaryKeyColumns(
    databaseName: string,
    tableName: string
  ): MetadataQuery<string[]>;

  listColumns(databaseName: string): MetadataQuery<ColumnDetail[]>;

  /** Every column of one table, in the order the table declares them. */
  describeTable(
    databaseName: string,
    tableName: string
  ): MetadataQuery<DescribedColumn[]>;
}
