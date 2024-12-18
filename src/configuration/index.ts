import { dialog, safeStorage } from 'electron';
import { existsSync, readFileSync, writeFile } from 'node:fs';
import log from 'electron-log';
import { WindowState } from '../main-process/windowState';
import { CONFIGURATION_CHANNEL } from '../preload/configurationChannel';
import { ConnectionObject, ConnectionObjectWithoutSlug } from '../sql/types';
import {
  createConfigurationFolderIfNotExists,
  getConfigurationPath,
} from './filePaths';
import { DEFAULT_LOCALE } from './locale';
import { DEFAULT_THEME } from './themes';
import {
  Configuration,
  DatabaseConfig,
  EncryptedConfiguration,
  EncryptedConnectionObject,
} from './type';
import { slugify } from './utils';

const configurationPath = getConfigurationPath();

log.info('Configuration file path:', configurationPath);

function getBaseConfig(): Configuration {
  return {
    version: 1,
    theme: DEFAULT_THEME.name,
    locale: DEFAULT_LOCALE,
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
  if (!existsSync(configurationPath)) {
    return getBaseConfig();
  }

  const dataString = readFileSync(configurationPath, 'utf-8');

  if (!dataString) {
    return getBaseConfig();
  }

  const config = JSON.parse(dataString) as EncryptedConfiguration;

  return {
    ...config,
    connections: Object.fromEntries(
      Object.entries(config.connections ?? {}).map(([slug, connection]) => [
        slug,
        decryptConnection(connection),
      ])
    ),
  };
}

function writeConfiguration(config: Configuration): void {
  const encryptedConfig = {
    ...config,
    connections: Object.fromEntries(
      Object.entries(config.connections).map(([slug, connection]) => [
        slug,
        encryptConnection(connection),
      ])
    ),
  };

  // create the folder of the `dataFilePath` if it does not exist
  createConfigurationFolderIfNotExists();

  writeFile(
    configurationPath,
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
  connection: ConnectionObjectWithoutSlug
): Configuration {
  const config = getConfiguration();

  if (!config.connections) {
    config.connections = {};
  }

  const slug = slugify(connection.name);

  config.connections[slug] = { ...connection, slug };

  writeConfiguration(config);

  return config;
}

export function editConnection(
  oldSlug: string,
  connection: ConnectionObjectWithoutSlug
): Configuration {
  const config = getConfiguration();

  if (!config.connections) {
    config.connections = {};
  }

  const newSlug = slugify(connection.name);

  if (oldSlug !== newSlug) {
    // if slugname change, replace the old connection by the new one
    delete config.connections[oldSlug];
  }

  config.connections[newSlug] = { ...connection, slug: newSlug };

  writeConfiguration(config);

  return config;
}

export function changeTheme(theme: string): void {
  const config = getConfiguration();
  config.theme = theme;

  writeConfiguration(config);
}

export function changeLanguage(language: string): Configuration {
  const config = getConfiguration();
  config.locale = language;

  writeConfiguration(config);

  return config;
}

export function setActiveDatabase(connectionSlug: string, database: string) {
  const config = getConfiguration();

  const connection = config.connections[connectionSlug];

  if (!connection) {
    return;
  }

  if (!connection.appState) {
    connection.appState = {
      activeDatabase: '',
      configByDatabase: {},
    };
  }

  connection.appState.activeDatabase = database;

  writeConfiguration(config);
}

export function setActiveTable(
  connectionSlug: string,
  database: string,
  tableName: string
): void {
  const config = getConfiguration();

  if (!config.connections[connectionSlug]) {
    return;
  }

  const connection = ensureConnectionAppStateExist(
    config.connections[connectionSlug]
  );

  const newConfig = ensureConnectionAppStateIsCorrect(
    connection.appState.configByDatabase[database]
  );

  connection.appState.configByDatabase[database] = {
    ...newConfig,
    activeTable: tableName,
  };

  writeConfiguration(config);
}

export function setTableFilter(
  connectionSlug: string,
  database: string,
  tableName: string,
  filter: string
): void {
  const config = getConfiguration();

  if (!config.connections[connectionSlug]) {
    return;
  }

  const connection = ensureConnectionAppStateExist(
    config.connections[connectionSlug]
  );

  const newConfig = ensureConnectionAppStateIsCorrect(
    connection.appState.configByDatabase[database]
  );

  newConfig.tables[tableName] = {
    currentFilter: filter,
  };

  connection.appState.configByDatabase[database] = {
    ...newConfig,
  };

  writeConfiguration(config);
}

export function saveWindowState(windowState: WindowState): void {
  const config = getConfiguration();

  config.windowState = windowState;

  writeConfiguration(config);
}

function hasAppState(
  connection: EncryptedConnectionObject
): connection is EncryptedConnectionObject &
  Required<Pick<EncryptedConnectionObject, 'appState'>> {
  return typeof connection.appState !== 'undefined';
}

function ensureConnectionAppStateExist(
  connection: EncryptedConnectionObject
): EncryptedConnectionObject &
  Required<Pick<EncryptedConnectionObject, 'appState'>> {
  if (hasAppState(connection)) {
    if (!connection.appState.configByDatabase) {
      connection.appState.configByDatabase = {};
    }

    return connection;
  }

  connection.appState = {
    activeDatabase: '',
    configByDatabase: {},
  };

  if (!hasAppState(connection)) {
    throw new Error('Could not create app state for connection');
  }

  return connection;
}

function ensureConnectionAppStateIsCorrect(
  databaseConfig: Partial<DatabaseConfig>
): DatabaseConfig {
  if (!databaseConfig) {
    databaseConfig = {};
  }

  if (!databaseConfig.activeTable) {
    databaseConfig.activeTable = '';
  }

  if (!databaseConfig.tables) {
    databaseConfig.tables = {};
  }

  return databaseConfig as DatabaseConfig;
}

const IPC_EVENT_BINDING = {
  [CONFIGURATION_CHANNEL.GET]: getConfiguration,
  [CONFIGURATION_CHANNEL.ADD_CONNECTION]: addConnectionToConfig,
  [CONFIGURATION_CHANNEL.EDIT_CONNECTION]: editConnection,
  [CONFIGURATION_CHANNEL.CHANGE_THEME]: changeTheme,
  [CONFIGURATION_CHANNEL.CHANGE_LANGUAGE]: changeLanguage,
  [CONFIGURATION_CHANNEL.SET_ACTIVE_DATABASE]: setActiveDatabase,
  [CONFIGURATION_CHANNEL.SET_ACTIVE_TABLE]: setActiveTable,
  [CONFIGURATION_CHANNEL.SET_TABLE_FILTER]: setTableFilter,
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
