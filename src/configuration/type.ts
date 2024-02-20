import { ConnectionObject } from '../component/Connection/types';

export type Configuration = {
  version: 1;
  theme: string;
  connections: Record<string, EncryptedConnectionObject>;
};

export type EncryptedConnectionObject = {
  password: string;
} & Omit<ConnectionObject, 'password'>;

export type EncryptedConfiguration = {
  connections: Record<string, EncryptedConnectionObject>;
} & Omit<Configuration, 'connections'>;
