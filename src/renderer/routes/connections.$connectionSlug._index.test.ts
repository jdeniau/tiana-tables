/**
 * @vitest-environment happy-dom
 */
import { redirect } from 'react-router';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { DEFAULT_LOCALE } from '../../configuration/locale';
import { DEFAULT_THEME } from '../../configuration/themes';
import { Configuration } from '../../configuration/type';
import { DatabaseEngine } from '../../sql/engine';
import { loader } from './connections.$connectionSlug._index';

function setConfiguration(
  connectionSlug: string,
  activeDatabase?: string,
  activeTable = ''
): void {
  const config: Configuration = {
    version: 1,
    theme: DEFAULT_THEME.name,
    locale: DEFAULT_LOCALE,
    connections: {},
  };

  if (activeDatabase) {
    config.connections[connectionSlug] = {
      name: connectionSlug,
      engine: DatabaseEngine.MySQL,
      slug: connectionSlug,
      host: 'localhost',
      port: 3306,
      user: 'root',
      password: '',
      appState: {
        activeDatabase,
        configByDatabase: {
          [activeDatabase]: { activeTable, tables: {} },
        },
      },
    };
  }

  // @ts-expect-error don't care about the whole object here
  window.config = {
    getConfiguration: () => Promise.resolve(config),
  };
}

function load(connectionSlug: string) {
  return loader({
    params: { connectionSlug },
    request: new Request('http://localhost'),
  });
}

describe('loader', () => {
  beforeEach(() => {
    window.sql = {
      listDatabases: vi.fn(() =>
        Promise.resolve(['databaseName1', 'databaseName2'])
      ),
      connectionNameChanged: vi.fn(),
    } as unknown as typeof window.sql;
  });

  afterEach(() => {
    // @ts-expect-error reset data here, will be re-set in `beforeEach`
    window.sql = undefined;
    // @ts-expect-error reset data here, will be re-set in the test
    window.config = undefined;
  });

  test('opens the first database when none was used', async () => {
    setConfiguration('connectionSlug');

    expect(await load('connectionSlug')).toEqual(
      redirect('/connections/connectionSlug/databaseName1')
    );
    expect(window.sql.connectionNameChanged).toHaveBeenCalledWith(
      'connectionSlug',
      undefined
    );
  });

  test('resumes the last database, with no query to announce', async () => {
    setConfiguration('connectionSlug', 'databaseName2');

    expect(await load('connectionSlug')).toEqual(
      redirect('/connections/connectionSlug/databaseName2')
    );
    expect(window.sql.connectionNameChanged).not.toHaveBeenCalled();
  });

  test('resumes the last table of the last database', async () => {
    setConfiguration('connectionSlug', 'databaseName2', 'users');

    expect(await load('connectionSlug')).toEqual(
      redirect('/connections/connectionSlug/databaseName2/tables/users')
    );
    expect(window.sql.listDatabases).not.toHaveBeenCalled();
  });

  test('should throw if there is not database (for now)', async () => {
    // TODO handle this case
    window.sql.listDatabases = vi.fn(() => Promise.resolve([]));
    setConfiguration('connectionSlug');

    await expect(() => load('connectionSlug')).rejects.toThrowError(
      'No database found. Case not handled for now.'
    );
  });

  test('handle connection name that are url-encoded', async () => {
    setConfiguration('connection + name', 'databaseName2');

    expect(await load('connection + name')).toEqual(
      redirect('/connections/connection + name/databaseName2')
    );
  });
});
