// See the Electron documentation for details on how to use preload scripts:
// https://www.electronjs.org/docs/latest/tutorial/process-model#preload-scripts

import { Connection } from 'mysql2/promise';
import { ConnectionObject } from './component/Connection';
import { Configuration } from './configuration';
import { contextBridge, ipcRenderer } from 'electron';

// === environment variables ===
type TianaString = string; // maybe `TIANA__${string}` is TS 5 ?
type TianaEnvVariables = Record<string, TianaString>;

const fpEnvVariables: TianaEnvVariables = Object.fromEntries(
  Object.entries(process.env).filter((entry): entry is [TianaString, string] =>
    entry[0].startsWith('TIANA__')
  )
);

contextBridge.exposeInMainWorld('env', fpEnvVariables);

// === Configuration ===
interface Config {
  readConfigurationFile(): Promise<null | Configuration>;

  addConnectionToConfig(
    name: string,
    connection: ConnectionObject
  ): Promise<void>;
}

const config: Config = {
  readConfigurationFile: () => ipcRenderer.invoke('config:read'),
  addConnectionToConfig: (name: string, connection: ConnectionObject) =>
    ipcRenderer.invoke('config:connection:add', name, connection),
};

contextBridge.exposeInMainWorld('config', config);

// === Sql ===
interface Sql {
  openConnection(params: ConnectionObject): Promise<Connection>;
  query(query: string): Promise<unknown>;
}

// TODO : clone the binder object in sql/index.ts ?
const sql: Sql = {
  openConnection: (params) => ipcRenderer.invoke('sql:connect', params),
  query: (query) => ipcRenderer.invoke('sql:query', query),
};

contextBridge.exposeInMainWorld('sql', sql);

// Declare window global that have been added
declare global {
  interface Window {
    env: TianaEnvVariables;
    config: Config;
    sql: Sql;
  }
}
