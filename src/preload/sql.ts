import { ipcRenderer } from 'electron';
import { decodeError } from '../sql/errorSerializer';
import type { QueryResult, QueryReturnType } from '../sql/types';
import { bindChannel } from './bindChannel';
import { SQL_CHANNEL } from './sqlChannel';

interface Sql {
  executeQuery<T extends QueryReturnType>(
    connectionName: string,
    query: string
  ): QueryResult<T>;
  closeAllConnections(): Promise<void>;
}

export const sql: Sql = {
  executeQuery: async (connectionName: string, query: string) => {
    const { result, error } = await ipcRenderer.invoke(
      SQL_CHANNEL.EXECUTE_QUERY,
      connectionName,
      query
    );

    if (error) {
      throw decodeError(error);
    }

    return result;
  },
  closeAllConnections: bindChannel(SQL_CHANNEL.CLOSE_ALL),
};
