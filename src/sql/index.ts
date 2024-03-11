import log from 'electron-log';
import { Connection, createConnection } from 'mysql2/promise';
import { getConfiguration } from '../configuration';
import { SQL_CHANNEL } from '../preload/sqlChannel';
import { QueryResultOrError, encodeError } from './errorSerializer';
import { ConnectionObject } from './types';

class ConnectionStack {
  private connections: Map<string, Connection> = new Map();

  // List of IPC events and their handlers
  #ipcEventBinding = {
    [SQL_CHANNEL.EXECUTE_QUERY]: this.executeQueryAndRetry,
    [SQL_CHANNEL.CLOSE_ALL]: this.closeAllConnections,
  };

  bindIpcMain(ipcMain: Electron.IpcMain): void {
    for (const [channel, handler] of Object.entries(this.#ipcEventBinding)) {
      ipcMain.handle(channel, (event, ...args: unknown[]) =>
        // convert the first argument to senderId and bind the rest
        // @ts-expect-error issue with strict type in tsconfig, but seems to work at runtime
        handler.bind(this)(...args)
      );
    }
  }

  async executeQueryAndRetry(
    connectionName: string,
    query: string
  ): QueryResultOrError {
    try {
      return this.executeQuery(connectionName, query);
    } catch (error) {
      const message = error instanceof Error ? error.message : error;

      if (
        typeof message === 'string' &&
        message.includes('connection is in closed state')
      ) {
        // retry once
        this.connections.delete(connectionName);

        return this.executeQuery(connectionName, query);
      }

      throw error;
    }
  }

  async executeQuery(
    connectionName: string,
    query: string
  ): QueryResultOrError {
    const connection = await this.#getConnection(connectionName);

    log.debug(`Execute query on "${connectionName}": "${query}"`);

    try {
      return { result: await connection.query(query), error: undefined };
    } catch (error) {
      return { result: undefined, error: encodeError(error) };
    }
  }

  async closeAllConnections(): Promise<void> {
    await Promise.all(
      Array.from(this.connections.values()).map((connection) =>
        connection.end()
      )
    );

    this.connections.clear();
  }

  async #getConnection(connectionName: string): Promise<Connection> {
    const connection = this.connections.get(connectionName);

    if (!connection) {
      // throw new Error('No connection');

      const { appState: _, ...connectionConfig } =
        getConfiguration().connections[connectionName];

      return await this.#connect(connectionConfig);
    }

    return connection;
  }

  async #connect(params: ConnectionObject): Promise<Connection> {
    const { name, ...rest } = params;

    // don't connect twice to the same connection
    if (this.connections.has(name)) {
      throw new Error(`Connection already opened on "${name}"`);
    }

    log.debug(`Open connection to "${name}"`);

    // TODO use a connection pool instead ? https://github.com/mysqljs/mysql?tab=readme-ov-file#establishing-connections
    const connection = await createConnection(rest);

    connection.on('end', () => {
      log.debug(`Connection to "${name}" ended`);
      this.connections.delete(name);
    });

    await connection.connect();

    this.connections.set(name, connection);

    return connection;
  }
}

const connectionStackInstance = new ConnectionStack();

export default connectionStackInstance;
