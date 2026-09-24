import log from 'electron-log';
import type {
  FieldPacket,
  QueryResult as MySqlResult,
  SslOptions,
} from 'mysql2/promise';
import type { Driver } from '..';
import type { ResultField } from '../../resultField';
import { asSqlError } from '../../sqlError';
import { SslMode } from '../../sslMode';
import type { QueryReturnType, ResultRow } from '../../types';
import { toFieldKind } from './fieldKind';

/** What mysql2 answered, in the shape the app reads. */
function toQueryReturn(result: MySqlResult): QueryReturnType {
  if (Array.isArray(result)) {
    // TODO a `CALL` answers `[RowDataPacket[], ResultSetHeader]` (measured),
    // which lands here as nonsense rows
    return result as ResultRow[];
  }

  return {
    affectedRows: result.affectedRows,
    // MySQL answers 0 where the statement generated no key, which is not an id
    insertId: result.insertId || null,
  };
}

/** The four things read of a mysql2 column, of the twenty it ships. */
type MySqlField = Pick<
  FieldPacket,
  'name' | 'orgTable' | 'type' | 'characterSet'
>;

/** The columns of a result, as the renderer reads them. */
function toResultFields(fields: MySqlField[] | undefined): ResultField[] {
  // mysql2 types this as an array, and answers `undefined` for a statement that
  // returned no rows at all
  return (fields ?? []).map((field) => ({
    name: field.name,
    // `orgTable` and not `table`, which holds the alias where the query gave
    // one: every reader of this looks a real table up by name. An expression
    // belongs to none, and mysql2 spells that as an empty string
    table: field.orgTable || null,
    kind: toFieldKind(field.type, field.characterSet),
  }));
}

/**
 * Tag what mysql2 answered with a `code` and an `errno` as a statement the
 * server refused, so the result tab shows it; anything else goes on untouched.
 */
function asServerError(error: unknown): unknown {
  if (!(error instanceof Error) || !('code' in error) || !('errno' in error)) {
    return error;
  }

  const { code, errno, sqlState } = error as {
    code: unknown;
    errno: unknown;
    sqlState?: unknown;
  };

  return asSqlError(error, {
    code: String(code),
    errno: typeof errno === 'number' ? errno : undefined,
    sqlState: typeof sqlState === 'string' ? sqlState : undefined,
  });
}

/**
 * The TLS options of each mode. mysql2 checks the chain alone unless told to
 * check the host too, which `verify-full` means.
 */
const SSL_OPTIONS: Readonly<Record<SslMode, SslOptions | undefined>> = {
  [SslMode.Disable]: undefined,
  [SslMode.Require]: { rejectUnauthorized: false },
  [SslMode.VerifyFull]: { rejectUnauthorized: true, verifyIdentity: true },
};

export const mysqlDriver: Driver = {
  async connect(params, options) {
    // loaded only when a connection is actually opened, to keep app startup light
    const { createConnection } = await import('mysql2/promise');

    // `createConnection` already resolves on the `connect` event and rejects on
    // `error`, so there is nothing left to await afterwards.
    // TODO use a connection pool instead ? https://github.com/mysqljs/mysql?tab=readme-ov-file#establishing-connections
    const connection = await createConnection({
      host: params.host,
      port: params.port,
      user: params.user,
      password: params.password,
      ssl: SSL_OPTIONS[params.ssl],
      connectTimeout: options.connectTimeoutMs,
    });

    connection.on('end', options.onClosed);

    connection.on('error', (error) => {
      log.error(error);

      // end it here: the `end` event that follows is what makes the stack open
      // a fresh connection on the next query
      connection.end();
    });

    return {
      query: async (statement) => {
        try {
          const [result, fields] = await connection.query({
            sql: statement.sql,
            rowsAsArray: statement.rowsAsArray,
            values: statement.values,
            // Asked for per query, and never for the raw SQL of the editor: the
            // rewriter does not know backticks, so a `:` inside a quoted
            // identifier would be read as a parameter and corrupt the statement.
            namedPlaceholders: statement.values !== undefined,
          });

          return [toQueryReturn(result), toResultFields(fields)];
        } catch (error) {
          throw asServerError(error);
        }
      },

      end: () => connection.end(),

      // mysql2 says it in a message and nowhere else — no code, no class
      isConnectionLost: (error) =>
        error instanceof Error &&
        error.message.includes('connection is in closed state'),
    };
  },
};

export const testables = {
  SSL_OPTIONS,
  asServerError,
  toResultFields,
};
