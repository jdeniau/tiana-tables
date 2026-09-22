import { ipcRenderer } from 'electron';
import type {
  ColumnDetail,
  ForeignKey,
  TableStructureRow,
} from '../sql/dialect/metadata';
import { decodeError } from '../sql/errorSerializer';
import type { QueryResult, QueryReturnType } from '../sql/types';
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
  closeConnection(connectionSlug: string): Promise<void>;
  closeAllConnections(): Promise<void>;
  connectionNameChanged(
    connectionSlug: string | undefined,
    databaseName?: string | undefined
  ): void;
  listDatabases(): Promise<string[]>;
  /**
   * Tables and views alike: the app browses both.
   *
   * Every database-scoped query takes its database name explicitly: the
   * `connectionNameChanged` event and the loaders that query are not ordered
   * with one another, so the main process cannot be trusted to already know
   * which database the caller means.
   */
  listTables(databaseName: string): Promise<string[]>;
  /** Only the columns that reference another. */
  getForeignKeys(databaseName: string): Promise<ForeignKey[]>;
  /** The columns of the primary key, in the order the key declares them. */
  getPrimaryKeyColumns(
    databaseName: string,
    tableName: string
  ): Promise<string[]>;
  getAllColumns(databaseName: string): Promise<ColumnDetail[]>;
  /** Every column of one table with its detail, for the structure page. */
  getTableStructure(
    databaseName: string,
    tableName: string
  ): QueryResult<TableStructureRow[]>;
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

  listDatabases: async () => doInvokeQuery(SQL_CHANNEL.LIST_DATABASES),

  listTables: async (databaseName) =>
    doInvokeQuery(SQL_CHANNEL.LIST_TABLES, databaseName),

  getForeignKeys: async (databaseName) =>
    doInvokeQuery(SQL_CHANNEL.GET_FOREIGN_KEYS, databaseName),

  getPrimaryKeyColumns: async (databaseName, tableName) =>
    doInvokeQuery(SQL_CHANNEL.GET_PRIMARY_KEY_COLUMNS, databaseName, tableName),

  getAllColumns: async (databaseName) =>
    doInvokeQuery(SQL_CHANNEL.GET_ALL_COLUMNS, databaseName),

  getTableStructure: async (databaseName, tableName) =>
    doInvokeQuery(SQL_CHANNEL.GET_TABLE_STRUCTURE, databaseName, tableName),

  closeConnection: bindChannel(SQL_CHANNEL.CLOSE),

  closeAllConnections: bindChannel(SQL_CHANNEL.CLOSE_ALL),

  // events
  connectionNameChanged: bindEvent(SQL_CHANNEL.ON_CONNECTION_CHANGED),
};
