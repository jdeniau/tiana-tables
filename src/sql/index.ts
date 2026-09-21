import log from 'electron-log';
import invariant from 'tiny-invariant';
import { getConfiguration } from '../configuration';
import { decryptPassword } from '../configuration/encryption';
import { EncryptedConnectionObject } from '../configuration/type';
import { SQL_CHANNEL } from '../preload/sqlChannel';
import {
  buildReadCellQuery,
  buildUpdateCellQuery,
} from './buildUpdateCellQuery';
import {
  KEYRING_LOCKED,
  PASSWORD_UNREADABLE,
  asConnectionError,
} from './connectionError';
import { getDialect } from './dialect';
import type { Dialect } from './dialect/types';
import { loadDriver } from './driver';
import type { DriverConnection } from './driver';
import {
  QueryResultOrError,
  ResultOrError,
  encodeError,
} from './errorSerializer';
import {
  ColumnDetail,
  ColumnDetailResult,
  KeyColumnUsageRow,
  QueryReturnType,
  ShowDatabasesResult,
  ShowKeyRow,
  ShowTableStatusResult,
  SqlBoundValues,
  TableStructureResult,
  WriteResult,
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
  #connections: Map<string, Promise<DriverConnection>> = new Map();

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
    [SQL_CHANNEL.CLOSE]: this.closeConnection,
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

  /** The SQL text of the connection queries are currently sent to. */
  #dialect(): Dialect {
    invariant(this.#currentConnectionSlug, 'Connection slug is required');

    const connection =
      getConfiguration().connections[this.#currentConnectionSlug];

    invariant(
      connection,
      `Connection "${this.#currentConnectionSlug}" not found`
    );

    return getDialect(connection.engine);
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
      SHOW KEYS FROM ${this.#dialect().qualify(databaseName, tableName)} WHERE Key_name = 'PRIMARY';
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

    const updateResult = await this.executeQueryAndRetry<WriteResult>(
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
      `SHOW TABLE STATUS FROM ${this.#dialect().escapeIdentifier(databaseName)}`
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

    const connectionSlug = this.#currentConnectionSlug;

    for (let attempt = 0; ; attempt++) {
      let connection: DriverConnection | undefined;

      // Opening the connection is inside the try: a handshake that fails is an
      // answer like any other, and must travel encoded next to the result. Left
      // outside, it escaped the `{ result, error }` envelope and reached the
      // renderer as Electron's own "Error invoking remote method …".
      try {
        connection = await this.#getConnection(connectionSlug);

        log.debug(`Execute query on "${connectionSlug}": "${query}"`);

        const [rows, fields] = await connection.query({
          sql: query,
          rowsAsArray,
          values,
        });

        // nothing between here and the socket read the query, so the shape is
        // the caller's to name
        return { result: [rows as T, fields], error: undefined };
      } catch (error) {
        // A socket the server dropped is worth one fresh connection; a
        // statement it refused is not, and neither is a second drop. Only the
        // connection that failed can tell the two apart, which is why the
        // question is asked here rather than a layer up.
        const worthRetrying =
          attempt === 0 && connection?.isConnectionLost(error) === true;

        if (!worthRetrying) {
          return { result: undefined, error: encodeError(error) };
        }

        this.#connections.delete(connectionSlug);
      }
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

  /** Close one connection, leaving the others open. Unknown slug: nothing to do. */
  async closeConnection(connectionSlug: string): Promise<void> {
    const connectionPromise = this.#connections.get(connectionSlug);

    if (!connectionPromise) {
      return;
    }

    this.#connections.delete(connectionSlug);

    try {
      const connection = await connectionPromise;

      await connection.end();
    } catch {
      // an attempt that never opened a socket has nothing to close
    }
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

  async #getConnection(connectionSlug: string): Promise<DriverConnection> {
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

  async #connect(
    params: Omit<EncryptedConnectionObject, 'appState'>
  ): Promise<DriverConnection> {
    const { slug, engine, host, port, user, password } = params;

    log.debug(`Open connection to "${slug}"`);

    const driver = await loadDriver(engine);

    try {
      // the only place the stored password is read back: the configuration holds the ciphertext from end to end, so a keyring that cannot open it costs this connection and never the file
      // opening a connection is also when asking the user to unlock makes sense, and the asynchronous safeStorage is the API that prompts for it
      const decrypted = await decryptPassword(password);

      if (decrypted.status !== 'ok') {
        throw Object.assign(
          new Error(`Could not decrypt the password of "${slug}"`),
          {
            code:
              decrypted.status === 'locked'
                ? KEYRING_LOCKED
                : PASSWORD_UNREADABLE,
          }
        );
      }

      return await driver.connect(
        { host, port, user, password: decrypted.password },
        {
          connectTimeoutMs: CONNECT_TIMEOUT_MS,
          onClosed: () => {
            log.debug(`Connection to "${slug}" ended`);
            this.#connections.delete(slug);
          },
        }
      );
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
