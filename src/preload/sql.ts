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
import type { UpdateCellOutcome, UpdateCellRequest } from '../sql/updateCell';
import { bindChannel, bindEvent } from './bindChannel';
import { SQL_CHANNEL } from './sqlChannel';

interface Sql {
  executeQuery<T extends QueryReturnType>(
    query: string,
    rowsAsArray?: boolean
  ): QueryResult<T>;
  /**
   * Write one cell, guarded on the value it was loaded with. The main process
   * builds the statement, so no value typed by the user ever reaches the SQL
   * text: they travel as bound parameters.
   */
  updateCell(request: UpdateCellRequest): Promise<UpdateCellOutcome>;
  closeAllConnections(): Promise<void>;
  connectionNameChanged(
    connectionSlug: string | undefined,
    databaseName?: string | undefined
  ): void;
  /**
   * Every database-scoped query takes its database name explicitly: the
   * `connectionNameChanged` event and the loaders that query are not ordered
   * with one another, so the main process cannot be trusted to already know
   * which database the caller means.
   */
  getKeyColumnUsage(
    databaseName: string,
    tableName?: string
  ): QueryResult<KeyColumnUsageRow[]>;
  getAllColumns(databaseName: string): QueryResult<ColumnDetailResult>;
  showDatabases(): QueryResult<ShowDatabasesResult>;
  getPrimaryKeys(
    databaseName: string,
    tableName: string
  ): QueryResult<ShowKeyRow[]>;
  showTableStatus(databaseName: string): QueryResult<ShowTableStatusResult>;
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

  updateCell: async (request) =>
    doInvokeQuery(SQL_CHANNEL.UPDATE_CELL, request),

  getKeyColumnUsage: async (databaseName, tableName) =>
    doInvokeQuery(SQL_CHANNEL.GET_KEY_COLUMN_USAGE, databaseName, tableName),

  getAllColumns: async (databaseName) =>
    doInvokeQuery(SQL_CHANNEL.GET_ALL_COLUMNS, databaseName),

  getPrimaryKeys: async (databaseName, tableName) =>
    doInvokeQuery(SQL_CHANNEL.GET_PRIMARY_KEYS, databaseName, tableName),

  showDatabases: async () => doInvokeQuery(SQL_CHANNEL.SHOW_DATABASES),

  showTableStatus: async (databaseName) =>
    doInvokeQuery(SQL_CHANNEL.SHOW_TABLE_STATUS, databaseName),

  closeAllConnections: bindChannel(SQL_CHANNEL.CLOSE_ALL),

  // events
  connectionNameChanged: bindEvent(SQL_CHANNEL.ON_CONNECTION_CHANGED),
};
