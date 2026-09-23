/**
 * @vitest-environment happy-dom
 */
import { redirect } from 'react-router';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { DEFAULT_LOCALE } from '../../configuration/locale';
import { DEFAULT_THEME } from '../../configuration/themes';
import { Configuration } from '../../configuration/type';
import { DatabaseEngine } from '../../sql/engine';
import { loader } from './connections.$connectionSlug';

function setConfiguration(
  connectionSlug: string | undefined,
  activeDatabase: string | undefined,
  openTables?: Array<string>
): void {
  const config: Configuration = {
    version: 1,
    theme: DEFAULT_THEME.name,
    locale: DEFAULT_LOCALE,
    connections: {},
  };

  if (connectionSlug && activeDatabase) {
    config.connections[connectionSlug] = {
      name: connectionSlug,
      engine: DatabaseEngine.MySQL,
      slug: connectionSlug,
      host: 'localhost',
      port: 3306,
      user: 'root',
      password: '',
      appState: {
        activeDatabase: activeDatabase,
        configByDatabase: openTables
          ? {
              [activeDatabase]: { activeTable: '', openTables, tables: {} },
            }
          : {},
      },
    };
  }

  // @ts-expect-error don't care about the whole object here
  window.config = {
    getConfiguration: () => Promise.resolve(config),
  };
}

describe('loader', () => {
  beforeEach(() => {
    // only the metadata calls the loader makes are mocked
    window.sql = {
      listDatabases: vi.fn(() =>
        Promise.resolve(['databaseName1', 'databaseName2'])
      ),
      listTables: vi.fn(() => Promise.resolve(['table1', 'table2'])),
      getForeignKeys: vi.fn(() => Promise.resolve([])),
      getAllColumns: vi.fn(() => Promise.resolve([])),
      connectionNameChanged: vi.fn(),
    } as unknown as typeof window.sql;
  });

  afterEach(() => {
    // @ts-expect-error reset data here, will be re-set in `beforeEach`
    window.sql = undefined;
    // @ts-expect-error reset data here, will be re-set in the test if needed
    window.config = undefined;
  });

  test('should redirect to the first database if no database is provided', async () => {
    const params = { connectionSlug: 'connectionSlug' };

    setConfiguration(undefined, undefined);

    expect(
      await loader({ params, request: new Request('http://localhost') })
    ).toEqual(redirect('/connections/connectionSlug/databaseName1'));
  });

  test('should throw if there is not database (for now)', async () => {
    // TODO handle this case
    const params = { connectionSlug: 'connectionSlug' };

    window.sql.listDatabases = vi.fn(() => Promise.resolve([]));

    setConfiguration(undefined, undefined);

    await expect(() =>
      loader({ params, request: new Request('http://localhost') })
    ).rejects.toThrowError('No database found. Case not handled for now.');
  });

  test('current database is not in the database list', async () => {
    // TODO handle this case
    const params = { connectionSlug: 'connectionSlug' };

    setConfiguration('connectionSlug', 'inexistant');

    await expect(() =>
      loader({ params, request: new Request('http://localhost') })
    ).rejects.toThrowError(
      'Database not found in the database list. Case not handled for now.'
    );
  });

  test('get active database from config', async () => {
    const params = { connectionSlug: 'connectionSlug' };

    setConfiguration('connectionSlug', 'databaseName2');

    expect(
      await loader({ params, request: new Request('http://localhost') })
    ).toEqual(redirect('/connections/connectionSlug/databaseName2'));
  });

  test('do not redirect if we are already on the right page', async () => {
    const params = { connectionSlug: 'connectionSlug' };

    setConfiguration('connectionSlug', 'databaseName2');

    expect(
      await loader({
        params,
        request: new Request(
          'http://localhost/connections/connectionSlug/databaseName2'
        ),
      })
    ).toEqual({
      connectionSlug: 'connectionSlug',
      activeDatabase: 'databaseName2',
      openTables: [],
      databaseList: ['databaseName1', 'databaseName2'],
      tableList: ['table1', 'table2'],
      foreignKeys: [],
      allColumns: [],
    });
  });

  test('drops the memorised tables the database no longer has', async () => {
    const params = { connectionSlug: 'connectionSlug' };

    setConfiguration('connectionSlug', 'databaseName2', [
      'table2',
      'dropped',
      'table1',
    ]);

    const result = await loader({
      params,
      request: new Request(
        'http://localhost/connections/connectionSlug/databaseName2'
      ),
    });

    expect(result).toMatchObject({ openTables: ['table2', 'table1'] });
  });

  // On this path the loader does not redirect, so it queries the database
  // itself. It must name the database it resolved: the `$databaseName` loader
  // that announces it runs in parallel, and used to be the only thing keeping
  // the main process from querying `undefined`.
  test('queries the resolved database by name, and announces it', async () => {
    const params = { connectionSlug: 'connectionSlug' };

    setConfiguration('connectionSlug', 'databaseName2');

    await loader({
      params,
      request: new Request(
        'http://localhost/connections/connectionSlug/databaseName2'
      ),
    });

    expect(window.sql.listTables).toHaveBeenCalledWith('databaseName2');
    expect(window.sql.getForeignKeys).toHaveBeenCalledWith('databaseName2');
    expect(window.sql.getAllColumns).toHaveBeenCalledWith('databaseName2');
    expect(window.sql.connectionNameChanged).toHaveBeenLastCalledWith(
      'connectionSlug',
      'databaseName2'
    );
  });

  test('handle connection name that are url-encoded', async () => {
    const params = { connectionSlug: 'connection + name' };

    setConfiguration('connection + name', 'databaseName2');

    // if we need a redirection
    expect(
      await loader({ params, request: new Request('http://localhost') })
    ).toEqual(redirect('/connections/connection + name/databaseName2'));

    // if we are already on the right page

    expect(
      await loader({
        params,
        request: new Request(
          'http://localhost/connections/connection + name/database2'
        ),
      })
    ).toEqual(redirect('/connections/connection + name/databaseName2'));
  });
});
