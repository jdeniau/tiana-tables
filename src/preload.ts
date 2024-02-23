// See the Electron documentation for details on how to use preload scripts:
// https://www.electronjs.org/docs/latest/tutorial/process-model#preload-scripts

import { Connection } from 'mysql2/promise';
import { ConnectionObject } from './component/Connection/types';
import { Configuration } from './configuration/type';
import { contextBridge, ipcRenderer } from 'electron';

// === Configuration ===
interface Config {
  getConfiguration(): Promise<null | Configuration>;

  addConnectionToConfig(connection: ConnectionObject): Promise<void>;

  changeTheme(theme: string): void;
}

const config: Config = {
  getConfiguration: () => ipcRenderer.invoke('config:get'),
  addConnectionToConfig: (connection: ConnectionObject) =>
    ipcRenderer.invoke('config:connection:add', connection),
  changeTheme: (theme: string) =>
    ipcRenderer.invoke('config:theme:change', theme),
};

contextBridge.exposeInMainWorld('config', config);

// === Sql ===
interface Sql {
  openConnection(params: ConnectionObject): Promise<Connection>;
  executeQuery(query: string): Promise<unknown>;
  closeAllConnections(): Promise<void>;
}

// TODO : clone the binder object in sql/index.ts ?
const sql: Sql = {
  openConnection: (params) => ipcRenderer.invoke('sql:connect', params),
  executeQuery: (query) => ipcRenderer.invoke('sql:executeQuery', query),
  closeAllConnections: () => ipcRenderer.invoke('sql:closeAll'),
};

contextBridge.exposeInMainWorld('sql', sql);

// Declare window global that have been added
declare global {
  interface Window {
    config: Config;
    sql: Sql;
  }
}
