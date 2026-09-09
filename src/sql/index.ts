import log from 'electron-log';
import type { Connection, ResultSetHeader } from 'mysql2/promise';
import invariant from 'tiny-invariant';
import { getConfiguration } from '../configuration';
import { SQL_CHANNEL } from '../preload/sqlChannel';
import {
  buildReadCellQuery,
  buildUpdateCellQuery,
} from './buildUpdateCellQuery';
import { asConnectionError } from './connectionError';
import {
  QueryResultOrError,
  ResultOrError,
  encodeError,
} from './errorSerializer';
import { escapeIdentifier } from './escapeIdentifier';
import {
  ColumnDetail,
  ColumnDetailResult,
  ConnectionObject,
  KeyColumnUsageRow,
  QueryReturnType,
  ShowDatabasesResult,
  ShowKeyRow,
  ShowTableStatusResult,
  SqlBoundValues,
  TableStructureResult,
} from './types';
import {
  CellReadRow,
  UpdateCellOutcome,
  UpdateCellRequest,
} from './updateCell';

/**
 * How long a handshake is given before we call it off.
 *
 * mysql2 applies the same 10 s of its own when nothing is passed, but an
 * implicit deadline is one we cannot name in an error message nor change.
 */
const CONNECT_TIMEOUT_MS = 10_000;

class ConnectionStack {
  /**
   * The open connections, and the ones still being opened: the promise is
   * stored *before* the handshake, so the loaders React Router runs in
   * parallel share one attempt — and one failure — instead of each opening
   * their own socket. A rejected attempt is removed right away, so a failure
   * is never cached and never retried on its own.
   */
  #connections: Map<string, Promise<Connection>> = new Map();

  #currentConnectionSlug: string | undefined;

  /**
   * The database the renderer last announced, kept for the menu state only.
   *
   * It must never be used to build a query: the loaders that announce it and
   * the loaders that query run in parallel, so a query built on it would race
   * the announcement. Every database-scoped handler below takes the database
   * name as a parameter instead.
   */
  #databaseName: string | undefined;

  // List of IPC events and their handlers
  #ipcMainHandler = {
    [SQL_CHANNEL.EXECUTE_QUERY]: this.executeQueryAndRetry,
    [SQL_CHANNEL.GET_KEY_COLUMN_USAGE]: this.getKeyColumnUsage,
    [SQL_CHANNEL.GET_PRIMARY_KEYS]: this.getPrimaryKeys,
    [SQL_CHANNEL.GET_ALL_COLUMNS]: this.getAllColumns,
    [SQL_CHANNEL.GET_TABLE_STRUCTURE]: this.getTableStructure,
    [SQL_CHANNEL.UPDATE_CELL]: this.updateCell,
    [SQL_CHANNEL.SHOW_DATABASES]: this.showDatabases,
    [SQL_CHANNEL.SHOW_TABLE_STATUS]: this.showTableStatus,
    [SQL_CHANNEL.CLOSE_ALL]: this.closeAllConnections,
  };

  #ipcMainOn = {
    [SQL_CHANNEL.ON_CONNECTION_CHANGED]: this.onConnectionSlugChanged,
  };

  get currentConnectionSlug(): string | undefined {
    return this.#currentConnectionSlug;
  }

  get databaseName(): string | undefined {
    return this.#databaseName;
  }

  bindIpcMain(ipcMain: Electron.IpcMain): void {
    for (const [channel, handler] of Object.entries(this.#ipcMainHandler)) {
      ipcMain.handle(channel, (event, ...args: unknown[]) =>
        // convert the first argument to senderId and bind the rest
        // @ts-expect-error issue with strict type in tsconfig, but seems to work at runtime
        handler.bind(this)(...args)
      );
    }

    for (const [channel, handler] of Object.entries(this.#ipcMainOn)) {
      ipcMain.on(channel, (event, ...args: unknown[]) =>
        // convert the first argument to senderId and bind the rest
        // @ts-expect-error issue with strict type in tsconfig, but seems to work at runtime
        handler.bind(this)(...args)
      );
    }
  }

  async getKeyColumnUsage(
    databaseName: string,
    tableName?: string
  ): QueryResultOrError<KeyColumnUsageRow[]> {
    invariant(databaseName, 'Database name is required');

    const query = `
      SELECT
        TABLE_NAME,
        COLUMN_NAME,
        CONSTRAINT_NAME,
        REFERENCED_TABLE_NAME,
        REFERENCED_COLUMN_NAME
      FROM
        INFORMATION_SCHEMA.KEY_COLUMN_USAGE
      WHERE
        TABLE_SCHEMA = :databaseName
        ${tableName ? 'AND TABLE_NAME = :tableName' : ''}
    `;

    return this.executeQueryAndRetry<KeyColumnUsageRow[]>(query, false, {
      databaseName,
      ...(tableName ? { tableName } : {}),
    });
  }

  async getAllColumns(
    databaseName: string
  ): QueryResultOrError<Array<ColumnDetail>> {
    invariant(databaseName, 'Database name is required');

    const query = `
      SELECT
        TABLE_NAME AS \`Table\`,
        COLUMN_NAME AS \`Column\`,
        DATA_TYPE AS \`DataType\`,
        IS_NULLABLE AS \`IsNullable\`,
        COLUMN_TYPE AS \`ColumnType\`,
        COLUMN_DEFAULT AS \`ColumnDefault\`,
        EXTRA AS \`Extra\`
      FROM
        INFORMATION_SCHEMA.COLUMNS
      WHERE
        TABLE_SCHEMA = :databaseName
    `;

    return this.executeQueryAndRetry<ColumnDetailResult>(query, false, {
      databaseName,
    });
  }

  /**
   * Every column of one table, as the structure page shows them.
   *
   * The foreign keys are read as a correlated subquery rather than a join: a
   * column can sit in two constraints, and a join would then answer the same
   * column twice — one row per column is what the page is about.
   */
  async getTableStructure(
    databaseName: string,
    tableName: string
  ): QueryResultOrError<TableStructureResult> {
    invariant(databaseName, 'Database name is required');
    invariant(tableName, 'Table name is required');

    const query = `
      SELECT
        c.COLUMN_NAME AS \`Column\`,
        c.COLUMN_TYPE AS \`Type\`,
        c.IS_NULLABLE AS \`Null\`,
        c.COLUMN_KEY AS \`Key\`,
        c.COLUMN_DEFAULT AS \`Default\`,
        c.EXTRA AS \`Extra\`,
        (
          SELECT
            GROUP_CONCAT(
              DISTINCT CONCAT(k.REFERENCED_TABLE_NAME, '.', k.REFERENCED_COLUMN_NAME)
              SEPARATOR ', '
            )
          FROM
            INFORMATION_SCHEMA.KEY_COLUMN_USAGE k
          WHERE
            k.TABLE_SCHEMA = c.TABLE_SCHEMA
            AND k.TABLE_NAME = c.TABLE_NAME
            AND k.COLUMN_NAME = c.COLUMN_NAME
            AND k.REFERENCED_TABLE_NAME IS NOT NULL
        ) AS \`References\`,
        c.COLLATION_NAME AS \`Collation\`,
        c.COLUMN_COMMENT AS \`Comment\`
      FROM
        INFORMATION_SCHEMA.COLUMNS c
      WHERE
        c.TABLE_SCHEMA = :databaseName
        AND c.TABLE_NAME = :tableName
      ORDER BY
        c.ORDINAL_POSITION
    `;

    return this.executeQueryAndRetry<TableStructureResult>(query, false, {
      databaseName,
      tableName,
    });
  }

  async getPrimaryKeys(
    databaseName: string,
    tableName: string
  ): QueryResultOrError<ShowKeyRow[]> {
    invariant(databaseName, 'Database name is required');

    const query = `
      SHOW KEYS FROM ${escapeIdentifier(databaseName)}.${escapeIdentifier(
        tableName
      )} WHERE Key_name = 'PRIMARY';
    `;

    return this.executeQueryAndRetry<ShowKeyRow[]>(query);
  }

  /**
   * Write one cell, and report whether the row still held what the grid showed.
   *
   * The write is guarded on the value the row was loaded with, so a cell
   * changed by someone else in the meantime is not silently overwritten. What
   * happened is then read back from the server: the value to display, and —
   * when the write matched nothing — the reason why.
   *
   * The read is not in a transaction with the write on purpose: it only feeds
   * the message shown to the user, and a value that is one write stale there
   * costs nothing, whereas holding a transaction open on the shared connection
   * would.
   */
  async updateCell(
    request: UpdateCellRequest
  ): ResultOrError<UpdateCellOutcome> {
    const update = buildUpdateCellQuery(request);

    const updateResult = await this.executeQueryAndRetry<ResultSetHeader>(
      update.sql,
      false,
      update.values
    );

    if (updateResult.error) {
      return { result: undefined, error: updateResult.error };
    }

    const read = buildReadCellQuery(request);

    const readResult = await this.executeQueryAndRetry<CellReadRow[]>(
      read.sql,
      false,
      read.values
    );

    if (readResult.error) {
      return { result: undefined, error: readResult.error };
    }

    const [[row]] = readResult.result;

    if (!row) {
      return {
        result: { status: 'conflict', reason: 'deleted' },
        error: undefined,
      };
    }

    const [header] = updateResult.result;

    // MySQL counts *changed* rows in `affectedRows`, so writing the value a
    // cell already held reports 0 — indistinguishable, on its own, from a
    // guard that did not match. `guardMatches` tells the two apart: the server
    // computed it with the very same `<=>` comparison as the guard, which a
    // comparison redone in JavaScript could not promise. A forced write has no
    // guard to speak of, so the row being there is all there is to check.
    if (request.force || header.affectedRows > 0 || row.guardMatches === 1) {
      return {
        result: { status: 'updated', value: row.value },
        error: undefined,
      };
    }

    return {
      result: {
        status: 'conflict',
        reason: 'changed',
        currentValue: row.value,
      },
      error: undefined,
    };
  }

  async showDatabases(): QueryResultOrError<ShowDatabasesResult> {
    return this.executeQueryAndRetry<ShowDatabasesResult>('SHOW DATABASES');
  }

  async showTableStatus(
    databaseName: string
  ): QueryResultOrError<ShowTableStatusResult> {
    invariant(databaseName, 'Database name is required');

    return this.executeQueryAndRetry<ShowTableStatusResult>(
      `SHOW TABLE STATUS FROM ${escapeIdentifier(databaseName)}`
    );
  }

  /**
   * `values` fills the named placeholders of the query. Only queries built here
   * use them — the editor sends plain SQL — and they are what keeps a value
   * typed by the user out of the SQL text itself.
   */
  async executeQueryAndRetry<T extends QueryReturnType = QueryReturnType>(
    query: string,
    rowsAsArray = false,
    values?: SqlBoundValues
  ): QueryResultOrError<T> {
    invariant(this.#currentConnectionSlug, 'Connection slug is required');

    const queryResult = await this.#executeQuery<T>(
      this.#currentConnectionSlug,
      query,
      rowsAsArray,
      values
    );

    if (queryResult.error) {
      const message = queryResult.error.message;

      if (
        typeof message === 'string' &&
        message.includes('connection is in closed state')
      ) {
        // retry once
        this.#connections.delete(this.#currentConnectionSlug);

        return this.#executeQuery<T>(
          this.#currentConnectionSlug,
          query,
          rowsAsArray,
          values
        );
      }
    }

    return queryResult;
  }

  async #executeQuery<T extends QueryReturnType = QueryReturnType>(
    connectionSlug: string,
    query: string,
    rowsAsArray: boolean,
    values?: SqlBoundValues
  ): QueryResultOrError<T> {
    // Opening the connection is inside the try: a handshake that fails is an
    // answer like any other, and must travel encoded next to the result. Left
    // outside, it escaped the `{ result, error }` envelope and reached the
    // renderer as Electron's own "Error invoking remote method …".
    try {
      const connection = await this.#getConnection(connectionSlug);

      log.debug(`Execute query on "${connectionSlug}": "${query}"`);

      return {
        result: await connection.query({
          sql: query,
          rowsAsArray,
          values,
          // Asked for per query, and never for the raw SQL of the editor: the
          // rewriter does not know backticks, so a `:` inside a quoted
          // identifier would be read as a parameter and corrupt the statement.
          namedPlaceholders: values !== undefined,
        }),
        error: undefined,
      };
    } catch (error) {
      return { result: undefined, error: encodeError(error) };
    }
  }

  async onConnectionSlugChanged(
    connectionSlug: string | undefined,
    databaseName: string | undefined
  ): Promise<void> {
    log.debug(`Connection changed to "${connectionSlug}:${databaseName}"`);

    this.#currentConnectionSlug = connectionSlug;
    this.#databaseName = databaseName;
  }

  async closeAllConnections(): Promise<void> {
    // `allSettled`, because a pending or already failed attempt sits in the
    // same map and must not keep the others from being closed.
    await Promise.allSettled(
      Array.from(this.#connections.values()).map((connection) =>
        connection.then((c) => c.end())
      )
    );

    this.#connections.clear();
  }

  async #getConnection(connectionSlug: string): Promise<Connection> {
    const pending = this.#connections.get(connectionSlug);

    if (pending) {
      return await pending;
    }

    const { connections } = getConfiguration();

    if (!(connectionSlug in connections)) {
      throw new Error(`Connection "${connectionSlug}" not found`);
    }

    const { appState: _, ...connectionConfig } = connections[connectionSlug];

    const connection = this.#connect(connectionConfig);

    this.#connections.set(connectionSlug, connection);

    // A failed attempt is forgotten, so the next query starts a fresh one
    // instead of awaiting a promise that will never resolve. The `catch`
    // handles this branch of the promise; the caller below handles the other.
    connection.catch(() => {
      this.#connections.delete(connectionSlug);
    });

    return await connection;
  }

  async #connect(params: ConnectionObject): Promise<Connection> {
    const { slug, name: _name, color: _color, host, port, ...rest } = params;

    log.debug(`Open connection to "${slug}"`);

    // Lazy-load mysql2 only when the user actually opens a connection,
    // to keep app startup light.
    const { createConnection } = await import('mysql2/promise');

    try {
      // `createConnection` already resolves on the `connect` event and rejects
      // on `error`, so there is nothing left to await afterwards.
      // TODO use a connection pool instead ? https://github.com/mysqljs/mysql?tab=readme-ov-file#establishing-connections
      const connection = await createConnection({
        ...rest,
        host,
        port,
        connectTimeout: CONNECT_TIMEOUT_MS,
      });

      connection.on('end', () => {
        log.debug(`Connection to "${slug}" ended`);
        this.#connections.delete(slug);
      });

      connection.on('error', (err) => {
        log.debug(`Received error from "${slug}" connection`);
        log.error(err);

        // end the connection from the stack. It will be regerenated on the next query
        connection.end();
      });

      return connection;
    } catch (error) {
      log.error(`Could not connect to "${slug}"`, error);

      throw asConnectionError(error, {
        host,
        port,
        timeoutMs: CONNECT_TIMEOUT_MS,
      });
    }
  }
}

const connectionStackInstance = new ConnectionStack();

export default connectionStackInstance;
