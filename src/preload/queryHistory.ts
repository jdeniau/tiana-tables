import type {
  QueryHistoryContent,
  RecordedStatement,
} from '../sql/history/recordedStatement';
import { bindChannel } from './bindChannel';
import { QUERY_HISTORY_CHANNEL } from './queryHistoryChannel';

/** The statements run, one history per group of connections. */
interface QueryHistory {
  record(
    connectionSlug: string,
    databaseName: string,
    statement: RecordedStatement
  ): Promise<void>;
  /** what ran on this database, on this connection or another of its group */
  load(
    connectionSlug: string,
    databaseName: string
  ): Promise<QueryHistoryContent>;
  /** forgets every statement of every connection */
  clear(): Promise<void>;
}

export const queryHistory: QueryHistory = {
  record: bindChannel(QUERY_HISTORY_CHANNEL.RECORD),
  load: bindChannel(QUERY_HISTORY_CHANNEL.LOAD),
  clear: bindChannel(QUERY_HISTORY_CHANNEL.CLEAR),
};
