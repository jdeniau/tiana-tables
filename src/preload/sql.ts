import { ipcRenderer } from 'electron';
import { RowDataPacket } from 'mysql2';
import { decodeError } from '../sql/errorSerializer';
import type { QueryResult, QueryReturnType } from '../sql/types';
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
  executeQuery<T extends QueryReturnType>(
    connectionSlug: string,
    query: string
  ): QueryResult<T>;
  closeAllConnections(): Promise<void>;
  connectionNameChanged(
    connectionSlug: string | undefined,
    databaseName?: string | undefined
  ): void;
  getForeignKeys(tableName: string): QueryResult<KeyColumnUsageRow[]>;
  getPrimaryKeys(tableName: string): QueryResult<ShowKeyRow[]>;
}

export const sql: Sql = {
  executeQuery: async (connectionSlug: string, query: string) => {
    const { result, error } = await ipcRenderer.invoke(
      SQL_CHANNEL.EXECUTE_QUERY,
      connectionSlug,
      query
    );

    if (error) {
      throw decodeError(error);
    }

    return result;
  },
  getForeignKeys: async (tableName) => {
    const { result, error } = await ipcRenderer.invoke(
      SQL_CHANNEL.GET_FOREIGN_KEYS,
      tableName
    );

    if (error) {
      throw decodeError(error);
    }

    return result;
  },

  getPrimaryKeys: async (tableName) => {
    const { result, error } = await ipcRenderer.invoke(
      SQL_CHANNEL.GET_PRIMARY_KEYS,
      tableName
    );

    if (error) {
      throw decodeError(error);
    }

    return result;
  },

  closeAllConnections: bindChannel(SQL_CHANNEL.CLOSE_ALL),

  // events
  connectionNameChanged: bindEvent(SQL_CHANNEL.ON_CONNECTION_CHANGED),
};
