import { dialog, safeStorage } from 'electron';
import { resolve } from 'node:path';
import { existsSync, mkdirSync, readFileSync, writeFile } from 'node:fs';
import envPaths from 'env-paths';
import { ConnectionObject } from './component/Connection/types';
import { DEFAULT_THEME } from './theme';

export type Configuration = {
  version: 1;
  theme: string;
  connections: Record<string, EncryptedConnectionObject>;
};

type EncryptedConnectionObject = {
  password: string;
} & Omit<ConnectionObject, 'password'>;

type EncryptedConfiguration = {
  connections: Record<string, EncryptedConnectionObject>;
} & Omit<Configuration, 'connections'>;

const envPath = envPaths('TianaTables', { suffix: '' });
const dataFilePath = resolve(envPath.config, 'config.json');

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

export function readConfigurationFile(): null | Configuration {
  if (!existsSync(dataFilePath)) {
    return null;
  }

  const dataString = readFileSync(dataFilePath, 'utf-8');

  if (!dataString) {
    return null;
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
  name: string,
  connection: ConnectionObject
): void {
  const config = readConfigurationFile() ?? getBaseConfig();

  if (!config.connections) {
    config.connections = {};
  }

  config.connections[name] = connection;

  writeConfiguration(config);
}

export function changeTheme(theme: string): void {
  const config = readConfigurationFile() ?? getBaseConfig();
  config.theme = theme;

  writeConfiguration(config);
}
