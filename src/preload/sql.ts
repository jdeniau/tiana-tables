import { ipcRenderer } from 'electron';
import { RowDataPacket } from 'mysql2';
import { decodeError } from '../sql/errorSerializer';
import type {
  QueryResult,
  QueryReturnType,
  ShowDatabasesResult,
  ShowTableStatusResult,
} from '../sql/types';
import { bindChannel, bindEvent } from './bindChannel';
import { SQL_CHANNEL } from './sqlChannel';

export interface KeyColumnUsageRow extends RowDataPacket {
  TABLE_NAME: string;
  COLUMN_NAME: string;
  CONSTRAINT_NAME: string;
  REFERENCED_TABLE_NAME: string;
  REFERENCED_COLUMN_NAME: string;
}

export interface ShowKeyRow extends RowDataPacket {
  Column_name: string;
}

interface Sql {
  executeQuery<T extends QueryReturnType>(query: string): QueryResult<T>;
  closeAllConnections(): Promise<void>;
  connectionNameChanged(
    connectionSlug: string | undefined,
    databaseName?: string | undefined
  ): void;
  getForeignKeys(tableName: string): QueryResult<KeyColumnUsageRow[]>;
  showDatabases(): QueryResult<ShowDatabasesResult>;
  getPrimaryKeys(tableName: string): QueryResult<ShowKeyRow[]>;
  showTableStatus(): QueryResult<ShowTableStatusResult>;
}

async function doInvokeQuery(sqlChannel: SQL_CHANNEL, ...params: unknown[]) {
  const { result, error } = await ipcRenderer.invoke(sqlChannel, ...params);

  if (error) {
    throw decodeError(error);
  }

  return result;
}

export const sql: Sql = {
  executeQuery: async (query) =>
    doInvokeQuery(SQL_CHANNEL.EXECUTE_QUERY, query),

  getForeignKeys: (tableName) =>
    doInvokeQuery(SQL_CHANNEL.GET_FOREIGN_KEYS, tableName),

  getPrimaryKeys: async (tableName) =>
    doInvokeQuery(SQL_CHANNEL.GET_PRIMARY_KEYS, tableName),

  showDatabases: async () => doInvokeQuery(SQL_CHANNEL.SHOW_DATABASES),

  showTableStatus: async () => doInvokeQuery(SQL_CHANNEL.SHOW_TABLE_STATUS),

  closeAllConnections: bindChannel(SQL_CHANNEL.CLOSE_ALL),

  // events
  connectionNameChanged: bindEvent(SQL_CHANNEL.ON_CONNECTION_CHANGED),
};
