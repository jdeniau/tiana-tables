import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'path';
import {
  createConfigurationFolderIfNotExists,
  getConfigurationFolder,
} from '../configuration/filePaths';
import { SQL_FILE_STORAGE_CHANNEL } from '../preload/sqlFileStorageChannel';

const LATEST_SQL_FILENAME = 'latest.sql';

function getSqlFilePath(): string {
  const configurationFolder = getConfigurationFolder();

  return join(configurationFolder, LATEST_SQL_FILENAME);
}

function loadLatest(): string | null {
  const latestSqlFilePath = getSqlFilePath();

  if (!existsSync(latestSqlFilePath)) {
    return null;
  }

  return readFileSync(latestSqlFilePath, 'utf-8');
}

function saveLatest(sql: string): void {
  const latestSqlFilePath = getSqlFilePath();

  createConfigurationFolderIfNotExists();

  return writeFileSync(latestSqlFilePath, sql);
}

const IPC_EVENT_BINDING = {
  [SQL_FILE_STORAGE_CHANNEL.LOAD_LATEST]: loadLatest,
  [SQL_FILE_STORAGE_CHANNEL.SAVE_LATEST]: saveLatest,
} as const;

export function bindIpcMainSqlFileStorage(ipcMain: Electron.IpcMain): void {
  for (const [channel, handler] of Object.entries(IPC_EVENT_BINDING)) {
    ipcMain.handle(channel, (event, ...args: unknown[]) =>
      // convert the first argument to senderId and bind the rest
      // @ts-expect-error issue with strict type in tsconfig, but seems to work at runtime
      handler(...args)
    );
  }
}
