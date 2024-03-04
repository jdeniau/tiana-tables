import { ipcRenderer } from 'electron';
import type { Configuration, ConnectionAppState } from '../configuration/type';
import type { ConnectionObject } from '../sql/types';

interface Config {
  getConfiguration(): Promise<null | Configuration>;

  addConnectionToConfig(connection: ConnectionObject): Promise<Configuration>;

  changeTheme(theme: string): void;

  updateConnectionState<K extends keyof ConnectionAppState>(
    connectionName: string,
    key: K,
    value: ConnectionAppState[K]
  ): Promise<void>;

  editConnection(
    connectionName: string,
    connection: ConnectionObject
  ): Promise<Configuration>;
}

export const config: Config = {
  getConfiguration: () => ipcRenderer.invoke('config:get'),
  addConnectionToConfig: (connection: ConnectionObject) =>
    ipcRenderer.invoke('config:connection:add', connection),
  editConnection: (connectionName: string, connection: ConnectionObject) =>
    ipcRenderer.invoke('config:connection:edit', connectionName, connection),
  changeTheme: (theme: string) =>
    ipcRenderer.invoke('config:theme:change', theme),
  updateConnectionState: <K extends keyof ConnectionAppState>(
    connectionName: string,
    key: K,
    value: ConnectionAppState[K]
  ) =>
    ipcRenderer.invoke(
      'config:connection:updateState',
      connectionName,
      key,
      value
    ),
};
