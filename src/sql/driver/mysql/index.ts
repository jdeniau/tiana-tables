import log from 'electron-log';
import type { QueryResult as MySqlResult } from 'mysql2/promise';
import type { Driver } from '..';
import type { QueryReturnType, ResultRow } from '../../types';

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
        const [result, fields] = await connection.query({
          sql: statement.sql,
          rowsAsArray: statement.rowsAsArray,
          values: statement.values,
          // Asked for per query, and never for the raw SQL of the editor: the
          // rewriter does not know backticks, so a `:` inside a quoted
          // identifier would be read as a parameter and corrupt the statement.
          namedPlaceholders: statement.values !== undefined,
        });

        return [toQueryReturn(result), fields];
      },

      end: () => connection.end(),

      // mysql2 says it in a message and nowhere else — no code, no class
      isConnectionLost: (error) =>
        error instanceof Error &&
        error.message.includes('connection is in closed state'),
    };
  },
};
