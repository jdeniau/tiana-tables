import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { getConfiguration } from '../configuration';
import type { Configuration } from '../configuration/type';
import { SQL_FILE_STORAGE_CHANNEL } from '../preload/sqlFileStorageChannel';
import { bindIpcMainSqlFileStorage } from './sqlFileStorage';

vi.mock('node:fs', () => ({
  existsSync: vi.fn(),
  readFileSync: vi.fn(),
  writeFileSync: vi.fn(),
}));

vi.mock('../configuration', () => ({ getConfiguration: vi.fn() }));

vi.mock('../configuration/filePaths', () => ({
  createConfigurationFolderIfNotExists: vi.fn(),
  getConfigurationFolder: () => '/config',
}));

const groups: Record<string, string | undefined> = {
  ungrouped: undefined,
  'client-a-prod': 'Client A',
  'client-a-staging': 'Client A',
  'client-b': 'Client B',
  'no-letter': '日本',
};

/** the handlers as the renderer reaches them, through the IPC channels */
function bindHandlers() {
  const handlers = new Map<string, (...args: unknown[]) => unknown>();

  bindIpcMainSqlFileStorage({
    handle: (channel: string, handler: (...args: unknown[]) => unknown) => {
      handlers.set(channel, (...args) => handler({}, ...args));
    },
  } as unknown as Electron.IpcMain);

  return {
    load: (slug: string) =>
      handlers.get(SQL_FILE_STORAGE_CHANNEL.LOAD_LATEST)?.(slug),
    save: (slug: string, sql: string) =>
      handlers.get(SQL_FILE_STORAGE_CHANNEL.SAVE_LATEST)?.(slug, sql),
  };
}

/** the file each connection writes its query to */
function savedFile(slug: string): unknown {
  bindHandlers().save(slug, 'SELECT 1');

  return vi.mocked(writeFileSync).mock.lastCall?.[0];
}

describe('the file of the latest query', () => {
  beforeEach(() => {
    vi.mocked(getConfiguration).mockReturnValue({
      connections: Object.fromEntries(
        Object.entries(groups).map(([slug, group]) => [slug, { slug, group }])
      ),
    } as unknown as Configuration);
  });

  test('a connection with no group keeps `latest.sql`', () => {
    vi.mocked(existsSync).mockReturnValue(true);
    vi.mocked(readFileSync).mockReturnValue('SELECT 2');

    expect(bindHandlers().load('ungrouped')).toBe('SELECT 2');
    expect(vi.mocked(readFileSync)).toHaveBeenLastCalledWith(
      '/config/latest.sql',
      'utf-8'
    );
    expect(savedFile('ungrouped')).toBe('/config/latest.sql');
  });

  test('the connections of a group share its file, another group has its own', () => {
    expect(savedFile('client-a-prod')).toBe('/config/latest-client-a.sql');
    expect(savedFile('client-a-staging')).toBe('/config/latest-client-a.sql');
    expect(savedFile('client-b')).toBe('/config/latest-client-b.sql');
  });

  test('a group with nothing to slugify, and an unknown connection, fall back to `latest.sql`', () => {
    expect(savedFile('no-letter')).toBe('/config/latest.sql');
    expect(savedFile('deleted')).toBe('/config/latest.sql');
  });

  test('nothing saved yet reads as null', () => {
    vi.mocked(existsSync).mockReturnValue(false);

    expect(bindHandlers().load('client-b')).toBeNull();
  });

  test('a payload that is not text is refused', () => {
    expect(() => bindHandlers().save('client-b', null as never)).toThrow();
    expect(() => bindHandlers().load(42 as never)).toThrow();
  });
});
