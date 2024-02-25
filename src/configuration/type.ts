import { ConnectionObject } from '../component/Connection/types';

export type Configuration = {
  version: 1;
  theme: string;
  connections: Record<string, EncryptedConnectionObject>;
};

export type ConnectionAppState = {
  isActive: boolean;
  activeDatabase: string;
  openedTable: string;
};

export type EncryptedConnectionObject = {
  password: string;
  appState?: ConnectionAppState;
} & Omit<ConnectionObject, 'password'>;

export type EncryptedConfiguration = {
  connections: Record<string, EncryptedConnectionObject>;
} & Omit<Configuration, 'connections'>;
