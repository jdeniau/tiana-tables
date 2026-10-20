import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'path';
import { z } from 'zod';
import { getConfiguration } from '../configuration';
import {
  createConfigurationFolderIfNotExists,
  getConfigurationFolder,
} from '../configuration/filePaths';
import { slugify } from '../configuration/utils';
import { SQL_FILE_STORAGE_CHANNEL } from '../preload/sqlFileStorageChannel';

/** `latest.sql` for a connection with no group, or one unknown */
function latestSqlFilename(connectionSlug: string): string {
  const group = getConfiguration().connections[connectionSlug]?.group;
  const groupSlug = group ? slugify(group) : '';

  return groupSlug ? `latest-${groupSlug}.sql` : 'latest.sql';
}

function getSqlFilePath(connectionSlug: string): string {
  return join(getConfigurationFolder(), latestSqlFilename(connectionSlug));
}

function loadLatest(connectionSlug: string): string | null {
  const latestSqlFilePath = getSqlFilePath(connectionSlug);

  if (!existsSync(latestSqlFilePath)) {
    return null;
  }

  return readFileSync(latestSqlFilePath, 'utf-8');
}

function saveLatest(connectionSlug: string, sql: string): void {
  const latestSqlFilePath = getSqlFilePath(connectionSlug);

  createConfigurationFolderIfNotExists();

  return writeFileSync(latestSqlFilePath, sql);
}

export function bindIpcMainSqlFileStorage(ipcMain: Electron.IpcMain): void {
  ipcMain.handle(SQL_FILE_STORAGE_CHANNEL.LOAD_LATEST, (event, ...args) =>
    loadLatest(...z.tuple([z.string()]).parse(args))
  );

  ipcMain.handle(SQL_FILE_STORAGE_CHANNEL.SAVE_LATEST, (event, ...args) =>
    saveLatest(...z.tuple([z.string(), z.string()]).parse(args))
  );
}
