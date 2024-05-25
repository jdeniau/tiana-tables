import log from 'electron-log';
import { Connection, createConnection } from 'mysql2/promise';
import invariant from 'tiny-invariant';
import { getConfiguration } from '../configuration';
import { SQL_CHANNEL } from '../preload/sqlChannel';
import { QueryResultOrError, encodeError } from './errorSerializer';
import {
  ColumnDetail,
  ColumnDetailResult,
  ConnectionObject,
  KeyColumnUsageRow,
  QueryReturnType,
  ShowDatabasesResult,
  ShowKeyRow,
  ShowTableStatusResult,
} from './types';

class ConnectionStack {
  #connections: Map<string, Connection> = new Map();

  #currentConnectionSlug: string | undefined;

  #databaseName: string | undefined;

  // List of IPC events and their handlers
  #ipcMainHandler = {
    [SQL_CHANNEL.EXECUTE_QUERY]: this.executeQueryAndRetry,
    [SQL_CHANNEL.GET_KEY_COLUMN_USAGE]: this.getKeyColumnUsage,
    [SQL_CHANNEL.GET_PRIMARY_KEYS]: this.getPrimaryKeys,
    [SQL_CHANNEL.GET_ALL_COLUMNS]: this.getAllColumns,
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
    tableName?: string
  ): QueryResultOrError<KeyColumnUsageRow[]> {
    invariant(this.#databaseName, 'Database name is required');

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
        TABLE_SCHEMA = '${this.#databaseName}'
        ${tableName ? `AND TABLE_NAME = '${tableName}'` : ''}
    `;

    return this.executeQueryAndRetry<KeyColumnUsageRow[]>(query);
  }

  async getAllColumns(): QueryResultOrError<Array<ColumnDetail>> {
    const query = `
      SELECT
        TABLE_NAME AS \`Table\`,
        COLUMN_NAME AS \`Column\`,
        DATA_TYPE AS \`DataType\`
      FROM
        INFORMATION_SCHEMA.COLUMNS
      WHERE
        TABLE_SCHEMA = '${this.#databaseName}'
    `;

    return this.executeQueryAndRetry<ColumnDetailResult>(query);
  }

  async getPrimaryKeys(tableName: string): QueryResultOrError<ShowKeyRow[]> {
    invariant(this.#databaseName, 'Database name is required');

    const query = `
      SHOW KEYS FROM ${this.#databaseName}.${tableName} WHERE Key_name = 'PRIMARY';
    `;

    return this.executeQueryAndRetry<ShowKeyRow[]>(query);
  }

  async showDatabases(): QueryResultOrError<ShowDatabasesResult> {
    return this.executeQueryAndRetry<ShowDatabasesResult>('SHOW DATABASES');
  }

  async showTableStatus(): QueryResultOrError<ShowTableStatusResult> {
    invariant(this.#databaseName, 'Database name is required');

    return this.executeQueryAndRetry<ShowTableStatusResult>(
      `SHOW TABLE STATUS FROM ${this.#databaseName}`
    );
  }

  async executeQueryAndRetry<T extends QueryReturnType = QueryReturnType>(
    query: string
  ): QueryResultOrError<T> {
    invariant(this.#currentConnectionSlug, 'Connection slug is required');

    try {
      return this.executeQuery<T>(this.#currentConnectionSlug, query);
    } catch (error) {
      const message = error instanceof Error ? error.message : error;

      if (
        typeof message === 'string' &&
        message.includes('connection is in closed state')
      ) {
        // retry once
        this.#connections.delete(this.#currentConnectionSlug);

        return this.executeQuery<T>(this.#currentConnectionSlug, query);
      }

      throw error;
    }
  }

  async executeQuery<T extends QueryReturnType = QueryReturnType>(
    connectionSlug: string,
    query: string
  ): QueryResultOrError<T> {
    const connection = await this.#getConnection(connectionSlug);

    log.debug(`Execute query on "${connectionSlug}": "${query}"`);

    try {
      return { result: await connection.query(query), error: undefined };
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

    // TODO use a connection pool instead ? https://github.com/mysqljs/mysql?tab=readme-ov-file#establishing-connections
    const connection = await createConnection(rest);

    connection.on('end', () => {
      log.debug(`Connection to "${slug}" ended`);
      this.#connections.delete(slug);
    });

    await connection.connect();

    this.#connections.set(slug, connection);

    return connection;
  }
}

const connectionStackInstance = new ConnectionStack();

export default connectionStackInstance;
