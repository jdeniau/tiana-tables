import { dialog } from 'electron';
import { existsSync, readFileSync } from 'node:fs';
import log from 'electron-log';
import { sync as writeFileAtomicSync } from 'write-file-atomic';
import { changeLanguage as changeI18nLanguage, t } from '../i18n';
import { WindowState } from '../main-process/windowState';
import { CONFIGURATION_CHANNEL } from '../preload/configurationChannel';
import { DatabaseEngine } from '../sql/engine';
import { ConnectionObjectWithoutSlug } from '../sql/types';
import type { DateDisplay } from './dateDisplay';
import { EncryptionUnavailableError, encryptPassword } from './encryption';
import {
  createConfigurationFolderIfNotExists,
  getConfigurationPath,
} from './filePaths';
import { pushFilter } from './filterHistory';
import { DEFAULT_LOCALE } from './locale';
import { PANEL } from './panels';
import { DEFAULT_THEME } from './themes';
import {
  Configuration,
  DatabaseConfig,
  EncryptedConnectionObject,
  TableSorting,
} from './type';
import {
  parseConfiguration,
  recoverUnreadableConfiguration,
  savePreviousConfiguration,
} from './unreadableConfiguration';
import { uniqueSlug } from './utils';

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

/**
 * The connection as it is stored, password encrypted.
 * `null` when the OS refused to encrypt: the user has been told, and nothing must be written.
 * An empty password field on an edit keeps the stored ciphertext, so changing a port does not ask for the password again.
 */
async function encryptSubmittedConnection(
  connection: ConnectionObjectWithoutSlug,
  slug: string,
  stored: EncryptedConnectionObject | undefined
): Promise<EncryptedConnectionObject | null> {
  if (connection.password === '' && stored) {
    return {
      ...connection,
      slug,
      password: stored.password,
      appState: stored.appState,
    };
  }

  try {
    return {
      ...connection,
      slug,
      password: await encryptPassword(connection.password),
      appState: stored?.appState,
    };
  } catch (error) {
    if (!(error instanceof EncryptionUnavailableError)) {
      throw error;
    }

    // writing the password unprotected would be worse than not writing at all: keep the previous file, and tell the user why nothing was saved
    log.error('Configuration not saved:', error);
    dialog.showErrorBox(
      t('config.encryption.unavailable.title'),
      t('config.encryption.unavailable.message')
    );

    return null;
  }
}

let configuration: Configuration | null = null;

export function getConfiguration(): Configuration {
  if (!configuration) {
    configuration = loadConfiguration();
  }

  return configuration;
}

function loadConfiguration(): Configuration {
  // only a missing file is a first launch: an unreadable one holds connections the user still has to get back
  if (!existsSync(configurationPath)) {
    return getBaseConfig();
  }

  const text = readFileSync(configurationPath, 'utf-8');
  const parsed = parseConfiguration(text);

  if ('error' in parsed) {
    return normalizeConfiguration(
      recoverUnreadableConfiguration(parsed.error) ?? getBaseConfig()
    );
  }

  savePreviousConfiguration(text);

  return normalizeConfiguration(parsed.config);
}

// the passwords stay as they are stored: they are decrypted when a connection is opened, never on the way in or out of the file
function normalizeConfiguration(config: Configuration): Configuration {
  return {
    ...config,
    connections: Object.fromEntries(
      Object.entries(config.connections ?? {}).map(([slug, connection]) => [
        slug,
        {
          ...connection,
          // nothing checks what the file holds, and no file names an engine yet: MySQL is all the app has ever talked to
          engine: connection.engine ?? DatabaseEngine.MySQL,
          // the form submitted the port as text until it had a number field, so older files hold a string
          port: Number(connection.port),
        },
      ])
    ),
  };
}

let isWriteFailureShown = false;

function writeConfiguration(config: Configuration): void {
  // create the folder of the `dataFilePath` if it does not exist
  createConfigurationFolderIfNotExists();

  try {
    // a temporary file renamed over the target: a reader or a crash never meets a half-written file
    writeFileAtomicSync(configurationPath, JSON.stringify(config, null, 2));
    isWriteFailureShown = false;
  } catch (error) {
    log.error('Configuration not saved:', error);

    // the file on disk is still the previous complete one, and every write retries: one warning until a write succeeds
    if (!isWriteFailureShown) {
      isWriteFailureShown = true;
      dialog.showErrorBox(
        t('config.writeFailed.title'),
        t('config.writeFailed.message', { reason: (error as Error).message })
      );
    }
  }
}

export async function addConnectionToConfig(
  connection: ConnectionObjectWithoutSlug
): Promise<Configuration> {
  const config = getConfiguration();

  if (!config.connections) {
    config.connections = {};
  }

  const slug = uniqueSlug(connection.name, Object.keys(config.connections));
  const encrypted = await encryptSubmittedConnection(
    connection,
    slug,
    undefined
  );

  // nothing is mutated before the password is encrypted, so a refused write leaves the configuration exactly as the file holds it
  if (!encrypted) {
    return config;
  }

  config.connections[slug] = encrypted;

  writeConfiguration(config);

  return config;
}

export async function editConnection(
  oldSlug: string,
  connection: ConnectionObjectWithoutSlug
): Promise<Configuration> {
  const config = getConfiguration();

  if (!config.connections) {
    config.connections = {};
  }

  // the connection being edited does not collide with itself: renaming it back
  // to the name it already has must keep its slug, suffix included
  const newSlug = uniqueSlug(
    connection.name,
    Object.keys(config.connections).filter((slug) => slug !== oldSlug)
  );

  const encrypted = await encryptSubmittedConnection(
    connection,
    newSlug,
    config.connections[oldSlug]
  );

  if (!encrypted) {
    return config;
  }

  if (oldSlug !== newSlug) {
    // if slugname change, replace the old connection by the new one
    delete config.connections[oldSlug];
  }

  config.connections[newSlug] = encrypted;

  writeConfiguration(config);

  return config;
}

/** Removes the connection, its encrypted password and its app state; an unknown slug writes nothing. */
export function deleteConnection(slug: string): Configuration {
  const config = getConfiguration();

  if (!config.connections[slug]) {
    return config;
  }

  delete config.connections[slug];

  writeConfiguration(config);

  return config;
}

export function changeTheme(theme: string): void {
  const config = getConfiguration();
  config.theme = theme;

  writeConfiguration(config);
}

export async function changeLanguage(language: string): Promise<Configuration> {
  const config = getConfiguration();
  config.locale = language;

  writeConfiguration(config);

  // the main process's own i18next instance: its menu and its dialogs
  await changeI18nLanguage(language);

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

/** Stores the kind of page the database reopens on, its `activeTable` filling the table it names. */
export function setActivePathKey(
  connectionSlug: string,
  database: string,
  activePathKey: string
): void {
  const config = getConfiguration();

  if (!config.connections[connectionSlug]) {
    return;
  }

  const connection = ensureConnectionAppStateExist(
    config.connections[connectionSlug]
  );

  connection.appState.configByDatabase[database] = {
    ...ensureConnectionAppStateIsCorrect(
      connection.appState.configByDatabase[database]
    ),
    activePathKey,
  };

  writeConfiguration(config);
}

/** Stores the table the database opens on; `null` clears it, so the database page redirects nowhere. */
export function setActiveTable(
  connectionSlug: string,
  database: string,
  tableName: string | null
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
    activeTable: tableName ?? '',
  };

  writeConfiguration(config);
}

/** Stores the tables kept open as tabs, in their order — the whole run at once. */
export function setOpenTables(
  connectionSlug: string,
  database: string,
  openTables: Array<string>
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
    openTables,
  };

  writeConfiguration(config);
}

/** Stores the filter a table is now showing, and returns its new history. */
export function setTableFilter(
  connectionSlug: string,
  database: string,
  tableName: string,
  filter: string
): Array<string> {
  const config = getConfiguration();

  if (!config.connections[connectionSlug]) {
    return [];
  }

  const connection = ensureConnectionAppStateExist(
    config.connections[connectionSlug]
  );

  const newConfig = ensureConnectionAppStateIsCorrect(
    connection.appState.configByDatabase[database]
  );

  const filterHistory = pushFilter(
    newConfig.tables[tableName]?.filterHistory,
    filter
  );

  // merged, not replaced: the table holds more than its filter
  newConfig.tables[tableName] = {
    ...newConfig.tables[tableName],
    currentFilter: filter,
    filterHistory,
  };

  connection.appState.configByDatabase[database] = {
    ...newConfig,
  };

  writeConfiguration(config);

  return filterHistory;
}

/** Stores the columns a table is now sorted on. */
export function setTableSorting(
  connectionSlug: string,
  database: string,
  tableName: string,
  sorting: TableSorting
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
    ...newConfig.tables[tableName],
    sorting,
  };

  connection.appState.configByDatabase[database] = {
    ...newConfig,
  };

  writeConfiguration(config);
}

/** `null` puts the column back in the place the database gives it. */
export function setColumnDisplayAfter(
  connectionSlug: string,
  database: string,
  tableName: string,
  columnName: string,
  displayAfter: string | null
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

  const table = newConfig.tables[tableName] ?? {};
  const displayAfterByColumn = { ...table.displayAfterByColumn };

  if (displayAfter) {
    displayAfterByColumn[columnName] = displayAfter;
  } else {
    delete displayAfterByColumn[columnName];
  }

  newConfig.tables[tableName] = {
    ...table,
    displayAfterByColumn,
  };

  connection.appState.configByDatabase[database] = {
    ...newConfig,
  };

  writeConfiguration(config);
}

/** The width a column was dragged to. */
export function setColumnWidth(
  connectionSlug: string,
  database: string,
  tableName: string,
  columnName: string,
  width: number
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

  const table = newConfig.tables[tableName] ?? {};

  newConfig.tables[tableName] = {
    ...table,
    columnWidthByColumn: {
      ...table.columnWidthByColumn,
      [columnName]: width,
    },
  };

  connection.appState.configByDatabase[database] = {
    ...newConfig,
  };

  writeConfiguration(config);
}

export function setPanelSize(panel: PANEL, size: string): Configuration {
  const config = getConfiguration();

  config.panelSizes = {
    ...config.panelSizes,
    [panel]: size,
  };

  writeConfiguration(config);

  return config;
}

export function setDateDisplay(dateDisplay: DateDisplay): Configuration {
  const config = getConfiguration();

  config.dateDisplay = dateDisplay;

  writeConfiguration(config);

  return config;
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
  return connection.appState !== undefined;
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
  [CONFIGURATION_CHANNEL.DELETE_CONNECTION]: deleteConnection,
  [CONFIGURATION_CHANNEL.CHANGE_THEME]: changeTheme,
  [CONFIGURATION_CHANNEL.CHANGE_LANGUAGE]: changeLanguage,
  [CONFIGURATION_CHANNEL.SET_ACTIVE_DATABASE]: setActiveDatabase,
  [CONFIGURATION_CHANNEL.SET_ACTIVE_TABLE]: setActiveTable,
  [CONFIGURATION_CHANNEL.SET_ACTIVE_PATH_KEY]: setActivePathKey,
  [CONFIGURATION_CHANNEL.SET_OPEN_TABLES]: setOpenTables,
  [CONFIGURATION_CHANNEL.SET_TABLE_FILTER]: setTableFilter,
  [CONFIGURATION_CHANNEL.SET_TABLE_SORTING]: setTableSorting,
  [CONFIGURATION_CHANNEL.SET_COLUMN_DISPLAY_AFTER]: setColumnDisplayAfter,
  [CONFIGURATION_CHANNEL.SET_COLUMN_WIDTH]: setColumnWidth,
  [CONFIGURATION_CHANNEL.SET_PANEL_SIZE]: setPanelSize,
  [CONFIGURATION_CHANNEL.SET_DATE_DISPLAY]: setDateDisplay,
} as const;

export function bindIpcMain(ipcMain: Electron.IpcMain): void {
  for (const [channel, handler] of Object.entries(IPC_EVENT_BINDING)) {
    ipcMain.handle(channel, (event, ...args: Array<unknown>) =>
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
    isWriteFailureShown = false;
  },
};
