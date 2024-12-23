import { WindowState } from '../main-process/windowState';
import { ConnectionObject } from '../sql/types';

export type Configuration = {
  version: 1;
  theme: string;
  locale: string;
  connections: Record<string, EncryptedConnectionObject>;
  windowState?: WindowState;
};

type TableConfig = {
  currentFilter?: string;
};

export type DatabaseConfig = {
  activeTable: string;
  tables: Record<string, TableConfig>;
};

type ConnectionAppState = {
  activeDatabase: string;
  configByDatabase: Record<string, DatabaseConfig>;
};

export type EncryptedConnectionObject = {
  password: string;
  appState?: ConnectionAppState;
} & Omit<ConnectionObject, 'password'>;

export type EncryptedConfiguration = {
  connections: Record<string, EncryptedConnectionObject>;
} & Omit<Configuration, 'connections'>;
