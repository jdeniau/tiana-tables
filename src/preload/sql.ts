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
  executeQuery: bindChannel(SQL_CHANNEL.EXECUTE_QUERY),
  closeAllConnections: bindChannel(SQL_CHANNEL.CLOSE_ALL),
};
