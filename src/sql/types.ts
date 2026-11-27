import { ConnectionColor } from '../configuration/connectionColor';
import type { SshTunnel } from '../ssh/types';
import type { FileEngine, ServerEngine } from './engine';
import { ResultField } from './resultField';
import { SslMode } from './sslMode';

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

export type QueryReturnType = Array<ResultRow> | WriteResult;

/** Whether a statement changed rows rather than returned them. */
export function isWriteResult(result: QueryReturnType): result is WriteResult {
  return !Array.isArray(result);
}

export type QueryResult<T extends QueryReturnType = QueryReturnType> = Promise<
  [T, Array<ResultField>]
>;

/** What every saved connection holds, whatever its engine. */
interface ConnectionIdentity {
  name: string;
  slug: string;
  color?: ConnectionColor;
  /** absent: the connection is listed before every group */
  group?: string;
}

/** A server the configuration file holds the address and credentials of. */
export interface ServerConnection extends ConnectionIdentity {
  engine: ServerEngine;
  host: string;
  port: number;
  user: string;
  password: string;
  /** the database a PostgreSQL connection opens, whose schemas the app browses */
  database?: string;
  /** absent on a connection saved before the field existed, which stays in the clear */
  ssl?: SslMode;
  /** the bastion `host` and `port` are reached from, absent for a server reached directly */
  ssh?: SshTunnel;
}

/** A database file the app opens in place. */
export interface FileConnection extends ConnectionIdentity {
  engine: FileEngine;
  file: string;
}

/** A connection as the configuration file stores it, and as it is opened. */
export type ConnectionObject = ServerConnection | FileConnection;

/** A connection as the form submits it: its slug is derived from its name. */
export type ConnectionObjectWithoutSlug =
  Omit<ServerConnection, 'slug'> | Omit<FileConnection, 'slug'>;

/**
 * A value bound to a placeholder of an UPDATE. Values travel over IPC, so they
 * are limited to what structured clone carries: a date goes back as the text
 * the server answered, and every edited value is sent as a string (see the
 * dialect's `guardedUpdate`).
 */
export type SqlBoundValue = string | number | null;

/**
 * The parameters of a query, by name.
 *
 * Every query built in the main process names its placeholders (`:tableName`)
 * instead of counting `?`, so a value is bound by what it is rather than by
 * where it sits in a list.
 */
export type SqlBoundValues = Record<string, SqlBoundValue>;
