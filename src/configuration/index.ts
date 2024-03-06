import { dialog, safeStorage } from 'electron';
import { existsSync, mkdirSync, readFileSync, writeFile } from 'node:fs';
import { resolve } from 'node:path';
import envPaths from 'env-paths';
import { log } from '../log';
import { CONFIGURATION_CHANNEL } from '../preload/configurationChannel';
import { ConnectionObject } from '../sql/types';
import { DEFAULT_THEME } from './themes';
import {
  Configuration,
  ConnectionAppState,
  EncryptedConfiguration,
  EncryptedConnectionObject,
} from './type';

// TODO use app.getPath('userData') to store the configuration file instead of env-paths
const envPath = envPaths('TianaTables', { suffix: '' });
const dataFilePath = resolve(envPath.config, 'config.json');

log('CONFIG', 'Configuration file path:', dataFilePath);

function getBaseConfig(): Configuration {
  return {
    version: 1,
    theme: DEFAULT_THEME.name,
    connections: {},
  };
}

function encryptConnection(
  connection: ConnectionObject
): EncryptedConnectionObject {
  return {
    ...connection,
    password: safeStorage.encryptString(connection.password).toString('base64'),
  };
}

function decryptConnection(
  connection: EncryptedConnectionObject
): ConnectionObject {
  return {
    ...connection,
    password: safeStorage.decryptString(
      Buffer.from(connection.password, 'base64')
    ),
  };
}

let configuration: Configuration | null = null;

export function getConfiguration(): Configuration {
  if (!configuration) {
    configuration = loadConfiguration();
  }

  return configuration;
}

function loadConfiguration(): Configuration {
  if (!existsSync(dataFilePath)) {
    return getBaseConfig();
  }

  const dataString = readFileSync(dataFilePath, 'utf-8');

  if (!dataString) {
    return getBaseConfig();
  }

  const config = JSON.parse(dataString) as EncryptedConfiguration;

  return {
    ...config,
    connections: Object.fromEntries(
      Object.entries(config.connections ?? {}).map(([name, connection]) => [
        name,
        decryptConnection(connection),
      ])
    ),
  };
}

function writeConfiguration(config: Configuration): void {
  const encryptedConfig = {
    ...config,
    connections: Object.fromEntries(
      Object.entries(config.connections).map(([name, connection]) => [
        name,
        encryptConnection(connection),
      ])
    ),
  };

  mkdirSync(envPath.config, { recursive: true });
  writeFile(
    dataFilePath,
    JSON.stringify(encryptedConfig, null, 2),
    'utf-8',
    (err) => {
      if (err) {
        dialog.showErrorBox('Error', err.message);
      }
    }
  );
}

export function addConnectionToConfig(
  connection: ConnectionObject
): Configuration {
  const config = getConfiguration();

  if (!config.connections) {
    config.connections = {};
  }

  config.connections[connection.name] = connection;

  writeConfiguration(config);

  return config;
}

export function editConnection(
  connectionName: string,
  connection: ConnectionObject
): Configuration {
  const config = getConfiguration();

  if (!config.connections) {
    config.connections = {};
  }

  if (connectionName !== connection.name) {
    // if name change, replace the old connection by the new one
    delete config.connections[connectionName];
  }

  config.connections[connection.name] = connection;

  writeConfiguration(config);

  return config;
}

export function changeTheme(theme: string): void {
  const config = getConfiguration();
  config.theme = theme;

  writeConfiguration(config);
}

export function updateConnectionState<K extends keyof ConnectionAppState>(
  connectionName: string,
  key: K,
  value: ConnectionAppState[K]
) {
  const config = getConfiguration();

  const connection = config.connections[connectionName];

  if (!connection) {
    return;
  }

  if (!connection.appState) {
    connection.appState = {
      isActive: false,
      activeDatabase: '',
      openedTable: '',
    };
  }

  connection.appState[key] = value;

  writeConfiguration(config);
}

const IPC_EVENT_BINDING = {
  [CONFIGURATION_CHANNEL.GET]: getConfiguration,
  [CONFIGURATION_CHANNEL.ADD_CONNECTION]: addConnectionToConfig,
  [CONFIGURATION_CHANNEL.EDIT_CONNECTION]: editConnection,
  [CONFIGURATION_CHANNEL.CHANGE_THEME]: changeTheme,
  [CONFIGURATION_CHANNEL.UPDATE_CONNECTION_STATE]: updateConnectionState,
} as const;

export function bindIpcMain(ipcMain: Electron.IpcMain): void {
  for (const [channel, handler] of Object.entries(IPC_EVENT_BINDING)) {
    ipcMain.handle(channel, (event, ...args: unknown[]) =>
      // convert the first argument to senderId and bind the rest
      // @ts-expect-error issue with strict type in tsconfig, but seems to work at runtime
      handler(...args)
    );
  }
}

export const testables = {
  getBaseConfig,
  resetConfiguration: () => {
    configuration = null;
  },
};
