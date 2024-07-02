import { ipcRenderer } from 'electron';
import { decodeError } from '../sql/errorSerializer';
import type {
  ColumnDetailResult,
  KeyColumnUsageRow,
  QueryResult,
  QueryReturnType,
  ShowDatabasesResult,
  ShowKeyRow,
  ShowTableStatusResult,
} from '../sql/types';
import { bindChannel, bindEvent } from './bindChannel';
import { SQL_CHANNEL } from './sqlChannel';

interface Sql {
  executeQuery<T extends QueryReturnType>(
    query: string,
    rowsAsArray?: boolean
  ): QueryResult<T>;
  closeAllConnections(): Promise<void>;
  connectionNameChanged(
    connectionSlug: string | undefined,
    databaseName?: string | undefined
  ): void;
  getKeyColumnUsage(tableName?: string): QueryResult<KeyColumnUsageRow[]>;
  getAllColumns(): QueryResult<ColumnDetailResult>;
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
  executeQuery: async (query, rowsAsArray) =>
    doInvokeQuery(SQL_CHANNEL.EXECUTE_QUERY, query, rowsAsArray),

  getKeyColumnUsage: async (tableName) =>
    doInvokeQuery(SQL_CHANNEL.GET_KEY_COLUMN_USAGE, tableName),

  getAllColumns: async () => doInvokeQuery(SQL_CHANNEL.GET_ALL_COLUMNS),

  getPrimaryKeys: async (tableName) =>
    doInvokeQuery(SQL_CHANNEL.GET_PRIMARY_KEYS, tableName),

  showDatabases: async () => doInvokeQuery(SQL_CHANNEL.SHOW_DATABASES),

  showTableStatus: async () => doInvokeQuery(SQL_CHANNEL.SHOW_TABLE_STATUS),

  closeAllConnections: bindChannel(SQL_CHANNEL.CLOSE_ALL),

  // events
  connectionNameChanged: bindEvent(SQL_CHANNEL.ON_CONNECTION_CHANGED),
};
