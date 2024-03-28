/**
 * @vitest-environment jsdom
 */
import { redirect } from 'react-router';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { DEFAULT_LOCALE } from '../../configuration/locale';
import { DEFAULT_THEME } from '../../configuration/themes';
import { Configuration } from '../../configuration/type';
import { loader } from './connections.$connectionSlug';

function setConfiguration(
  connectionSlug: string | undefined,
  activeDatabase: string | undefined
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
      slug: connectionSlug,
      host: 'localhost',
      port: 3306,
      user: 'root',
      password: '',
      appState: {
        activeDatabase: activeDatabase,
        activeTableByDatabase: {},
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
    window.sql = {
      // @ts-expect-error return is OK here, type is too complex or now
      showDatabases: vi.fn(() =>
        Promise.resolve([
          [
            {
              Database: 'databaseName1',
            },
            {
              Database: 'databaseName2',
            },
          ],
          [],
        ])
      ),
      // @ts-expect-error return is OK here, type is too complex or now
      showTableStatus: vi.fn(() =>
        Promise.resolve([
          [
            {
              Name: 'table1',
              Rows: 1,
              Data_length: 1,
              Comment: 'table1 comment',
            },
            {
              Name: 'table2',
              Rows: 2,
              Data_length: 2,
              Comment: 'table2 comment',
            },
          ],
        ])
      ),
      connectionNameChanged: vi.fn(),
    };
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

    // @ts-expect-error return is OK here, type is too complex or now
    window.sql.showDatabases = vi.fn(() => Promise.resolve([[]]));

    setConfiguration(undefined, undefined);

    expect(() =>
      loader({ params, request: new Request('http://localhost') })
    ).rejects.toThrowError('No database found. Case not handled for now.');
  });

  test('current database is not in the database list', () => {
    // TODO handle this case
    const params = { connectionSlug: 'connectionSlug' };

    setConfiguration('connectionSlug', 'inexistant');

    expect(() =>
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
      databaseList: [
        { Database: 'databaseName1' },
        { Database: 'databaseName2' },
      ],
      tableStatusList: [
        {
          Name: 'table1',
          Rows: 1,
          Data_length: 1,
          Comment: 'table1 comment',
        },
        {
          Name: 'table2',
          Rows: 2,
          Data_length: 2,
          Comment: 'table2 comment',
        },
      ],
    });
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
