import type { RecordedStatement } from '../sql/history/recordedStatement';
import { bindChannel } from './bindChannel';
import { QUERY_HISTORY_CHANNEL } from './queryHistoryChannel';

/** The statements run, one history per group of connections. */
interface QueryHistory {
  record(
    connectionSlug: string,
    databaseName: string,
    statement: RecordedStatement
  ): Promise<void>;
  /** forgets every statement of every connection */
  clear(): Promise<void>;
}

export const queryHistory: QueryHistory = {
  record: bindChannel(QUERY_HISTORY_CHANNEL.RECORD),
  clear: bindChannel(QUERY_HISTORY_CHANNEL.CLEAR),
};
