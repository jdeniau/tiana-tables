import { ConnectionColor } from '../configuration/connectionColor';
import { DatabaseEngine } from './engine';
import { ResultField } from './resultField';

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
  [T, ResultField[]]
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
 * A value bound to a placeholder of an UPDATE. Values travel over IPC, so they
 * are limited to what structured clone carries: `Date` survives, and every
 * edited value is sent as a string (see the dialect's `guardedUpdate`).
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
