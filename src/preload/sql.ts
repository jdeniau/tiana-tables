import type {
  ConnectionObject,
  QueryResult,
  QueryReturnType,
} from '../sql/types';
import { bindChannel } from './bindChannel';
import { SQL_CHANNEL } from './sqlChannel';

interface Sql {
  openConnection(params: ConnectionObject): Promise<void>;
  executeQuery<T extends QueryReturnType>(
    connectionName: string,
    query: string
  ): QueryResult<T>;
  closeAllConnections(): Promise<void>;
}

export const sql: Sql = {
  openConnection: bindChannel(SQL_CHANNEL.CONNECT),
  executeQuery: bindChannel(SQL_CHANNEL.EXECUTE_QUERY),
  closeAllConnections: bindChannel(SQL_CHANNEL.CLOSE_ALL),
};
