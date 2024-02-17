// See the Electron documentation for details on how to use preload scripts:
// https://www.electronjs.org/docs/latest/tutorial/process-model#preload-scripts

import type { Connection } from 'mysql';
import { ConnectionObject } from './component/Connection';
import { Configuration } from './main';
import { contextBridge, ipcRenderer } from 'electron';

// === environment variables ===
type FpString = string; // maybe `FP__${string}` is TS 5 ?
type FpEnvVariables = Record<string, FpString>;

const fpEnvVariables: FpEnvVariables = Object.fromEntries(
  Object.entries(process.env).filter((entry): entry is [FpString, string] =>
    entry[0].startsWith('FP__')
  )
);

contextBridge.exposeInMainWorld('env', fpEnvVariables);

// === Configuration ===
interface Config {
  readConfigurationFile(): Promise<Configuration>;

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
  createConnection(params: ConnectionObject): Promise<Connection>;
}

const sql: Sql = {
  createConnection: (params: ConnectionObject) => {
    const connection = ipcRenderer.invoke('sql:createConnection', params);

    console.log('preload', connection);

    return connection;
  },
};

contextBridge.exposeInMainWorld('sql', sql);

// Declare window global that have been added
declare global {
  interface Window {
    env: FpEnvVariables;
    config: Config;
    sql: Sql;
  }
}
