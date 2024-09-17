import { bindChannel } from './bindChannel';
import { SQL_FILE_STORAGE_CHANNEL } from './sqlFileStorageChannel';

interface SqlFileStorage {
  loadLatest(): Promise<string | null>;
  saveLatest(sql: string): Promise<void>;
}

export const sqlFileStorage: SqlFileStorage = {
  loadLatest: bindChannel(SQL_FILE_STORAGE_CHANNEL.LOAD_LATEST),
  saveLatest: bindChannel(SQL_FILE_STORAGE_CHANNEL.SAVE_LATEST),
};
