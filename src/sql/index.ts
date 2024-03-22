import log from 'electron-log';
import { Connection, createConnection } from 'mysql2/promise';
import { getConfiguration } from '../configuration';
import { SQL_CHANNEL } from '../preload/sqlChannel';
import { QueryResultOrError, encodeError } from './errorSerializer';
import { ConnectionObject } from './types';

class ConnectionStack {
  #connections: Map<string, Connection> = new Map();

  #currentConnectionSlug: string | undefined;

  #databaseName: string | undefined;

  // List of IPC events and their handlers
  #ipcMainHandler = {
    [SQL_CHANNEL.EXECUTE_QUERY]: this.executeQueryAndRetry,
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

  async executeQueryAndRetry(
    connectionSlug: string,
    query: string
  ): QueryResultOrError {
    try {
      return this.executeQuery(connectionSlug, query);
    } catch (error) {
      const message = error instanceof Error ? error.message : error;

      if (
        typeof message === 'string' &&
        message.includes('connection is in closed state')
      ) {
        // retry once
        this.#connections.delete(connectionSlug);

        return this.executeQuery(connectionSlug, query);
      }

      throw error;
    }
  }

  async executeQuery(
    connectionSlug: string,
    query: string
  ): QueryResultOrError {
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
    const { slug, ...rest } = params;

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
