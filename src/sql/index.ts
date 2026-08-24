import log from 'electron-log';
import type { Connection, ResultSetHeader } from 'mysql2/promise';
import invariant from 'tiny-invariant';
import { getConfiguration } from '../configuration';
import { SQL_CHANNEL } from '../preload/sqlChannel';
import {
  buildReadCellQuery,
  buildUpdateCellQuery,
  escapeIdentifier,
} from './buildUpdateCellQuery';
import {
  QueryResultOrError,
  ResultOrError,
  encodeError,
} from './errorSerializer';
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
} from './types';
import {
  CellReadRow,
  UpdateCellOutcome,
  UpdateCellRequest,
} from './updateCell';

class ConnectionStack {
  #connections: Map<string, Connection> = new Map();

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
    const connection = await this.#getConnection(connectionSlug);

    log.debug(`Execute query on "${connectionSlug}": "${query}"`);

    try {
      return {
        result: await connection.query({
          sql: query,
          rowsAsArray,
          values,
          // Asked for per query, and never for the raw SQL of the editor: the
          // rewriter reads `:name` anywhere outside a string literal — the `:`
          // of a `-- TODO: something` comment included — and then refuses a
          // query it has no parameter for.
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
    await Promise.all(
      Array.from(this.#connections.values()).map((connection) =>
        connection.end()
      )
    );

    this.#connections.clear();
  }

  async #getConnection(connectionSlug: string): Promise<Connection> {
    const connection = this.#connections.get(connectionSlug);

    if (!connection) {
      const { connections } = getConfiguration();

      if (!(connectionSlug in connections)) {
        throw new Error(`Connection "${connectionSlug}" not found`);
      }

      const { appState: _, ...connectionConfig } = connections[connectionSlug];

      return await this.#connect(connectionConfig);
    }

    return connection;
  }

  async #connect(params: ConnectionObject): Promise<Connection> {
    const { slug, name: _, ...rest } = params;

    // don't connect twice to the same connection
    if (this.#connections.has(slug)) {
      throw new Error(`Connection already opened on "${slug}"`);
    }

    log.debug(`Open connection to "${slug}"`);

    // Lazy-load mysql2 only when the user actually opens a connection,
    // to keep app startup light.
    const { createConnection } = await import('mysql2/promise');

    // TODO use a connection pool instead ? https://github.com/mysqljs/mysql?tab=readme-ov-file#establishing-connections
    const connection = await createConnection(rest);

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

    await connection.connect();

    this.#connections.set(slug, connection);

    return connection;
  }
}

const connectionStackInstance = new ConnectionStack();

export default connectionStackInstance;
