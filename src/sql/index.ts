import { Connection, createConnection } from 'mysql2/promise';
import { ConnectionObject } from '../component/Connection/types';

class ConnectionStack {
  private connections: Map<number, Connection> = new Map();

  // List of IPC events and their handlers
  #ipcEventBinding = {
    'sql:connect': this.connect,
    'sql:query': this.query,
  };

  bindIpcMain(ipcMain: Electron.IpcMain): void {
    for (const [channel, handler] of Object.entries(this.#ipcEventBinding)) {
      ipcMain.handle(channel, (event, ...args) =>
        // convert the first argument to senderId and bind the rest
        handler.bind(this)(event.sender.id, ...args)
      );
    }
  }

  async connect(senderId: number, params: ConnectionObject): Promise<number> {
    const { name, ...rest } = params;
    const connection = await createConnection(rest);
    await connection.connect();
    this.connections.set(senderId, connection);

    return connection.threadId;
  }

  async query(senderId: number, query: string): Promise<any> {
    const connection = this.#getConnection(senderId);

    return await connection.query(query);
  }

  #getConnection(senderId: number): Connection {
    const connection = this.connections.get(senderId);

    if (!connection) {
      throw new Error('No connection');
    }

    return connection;
  }
}

const connectionStackInstance = new ConnectionStack();

export default connectionStackInstance;
