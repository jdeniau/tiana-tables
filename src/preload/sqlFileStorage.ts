import { bindChannel } from './bindChannel';
import { SQL_FILE_STORAGE_CHANNEL } from './sqlFileStorageChannel';

/** The query last run, one per group of connections. */
interface SqlFileStorage {
  /** the query last run on the connection's group, null before the first run */
  loadLatest(connectionSlug: string): Promise<string | null>;
  saveLatest(connectionSlug: string, sql: string): Promise<void>;
}

export const sqlFileStorage: SqlFileStorage = {
  loadLatest: bindChannel(SQL_FILE_STORAGE_CHANNEL.LOAD_LATEST),
  saveLatest: bindChannel(SQL_FILE_STORAGE_CHANNEL.SAVE_LATEST),
};
