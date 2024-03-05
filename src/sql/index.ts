import { Connection, createConnection } from 'mysql2/promise';
import { SQL_CHANNEL } from '../preload/sqlChannel';
import { ConnectionObject, QueryResult } from './types';

class ConnectionStack {
  private connections: Map<string, Connection> = new Map();

  // List of IPC events and their handlers
  #ipcEventBinding = {
    [SQL_CHANNEL.CONNECT]: this.connect,
    [SQL_CHANNEL.EXECUTE_QUERY]: this.executeQuery,
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

  async connect(params: ConnectionObject): Promise<void> {
    const { name, ...rest } = params;

    const connection = await createConnection(rest);
    await connection.connect();

    this.connections.set(name, connection);
  }

  async executeQuery(connectionName: string, query: string): QueryResult {
    const connection = this.#getConnection(connectionName);

    console.log(`[SQL] Execute query "${query}"`);

    return await connection.query(query);
  }

  async closeAllConnections(): Promise<void> {
    await Promise.all(
      Array.from(this.connections.values()).map((connection) =>
        connection.end()
      )
    );

    this.connections.clear();
  }

  #getConnection(connectionName: string): Connection {
    const connection = this.connections.get(connectionName);

    if (!connection) {
      throw new Error('No connection');
    }

    return connection;
  }
}

const connectionStackInstance = new ConnectionStack();

export default connectionStackInstance;
