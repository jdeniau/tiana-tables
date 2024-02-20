import { dialog, safeStorage } from 'electron';
import { resolve } from 'node:path';
import { existsSync, mkdirSync, readFileSync, writeFile } from 'node:fs';
import envPaths from 'env-paths';
import { ConnectionObject } from './component/Connection';

export type Configuration = {
  version: 1;
  connections: Record<string, EncryptedConnectionObject>;
};

type EncryptedConnectionObject = {
  password: string;
} & Omit<ConnectionObject, 'password'>;

type EncryptedConfiguration = {
  connections: Record<string, EncryptedConnectionObject>;
} & Omit<Configuration, 'connections'>;

const envPath = envPaths('FuzzyPotato', { suffix: '' });
const dataFilePath = resolve(envPath.config, 'config.json');

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
export function addConnectionToConfig(
  event: Electron.IpcMainInvokeEvent,
  name: string,
  connection: ConnectionObject
): void {
  let config = readConfigurationFile();

  if (!config) {
    config = {
      version: 1,
      connections: {},
    };
  }

  if (!config.connections) {
    config.connections = {};
  }

  config.connections[name] = connection;

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
