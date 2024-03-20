/**
 * @vitest-environment jsdom
 */
import { redirect } from 'react-router';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { DEFAULT_THEME } from '../../configuration/themes';
import { Configuration } from '../../configuration/type';
import { loader } from './connections.$connectionName';

function setConfiguration(
  connectionName: string | undefined,
  activeDatabase: string | undefined
): void {
  const config: Configuration = {
    version: 1,
    theme: DEFAULT_THEME.name,
    connections: {},
  };

  if (connectionName && activeDatabase) {
    config.connections[connectionName] = {
      name: connectionName,
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
      executeQuery: vi.fn(() =>
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
    };
  });

  afterEach(() => {
    // @ts-expect-error reset data here, will be re-set in `beforeEach`
    window.sql = undefined;
    // @ts-expect-error reset data here, will be re-set in the test if needed
    window.config = undefined;
  });

  test('should redirect to the first database if no database is provided', async () => {
    const params = { connectionName: 'connectionName' };

    setConfiguration(undefined, undefined);

    expect(
      await loader({ params, request: new Request('http://localhost') })
    ).toEqual(redirect('/connections/connectionName/databaseName1'));
  });

  test('should throw if there is not database (for now)', async () => {
    // TODO handle this case
    const params = { connectionName: 'connectionName' };

    // @ts-expect-error return is OK here, type is too complex or now
    window.sql.executeQuery = vi.fn(() => Promise.resolve([[]]));

    setConfiguration(undefined, undefined);

    expect(() =>
      loader({ params, request: new Request('http://localhost') })
    ).rejects.toThrowError('No database found. Case not handled for now.');
  });

  test('current database is not in the database list', () => {
    // TODO handle this case
    const params = { connectionName: 'connectionName' };

    setConfiguration('connectionName', 'inexistant');

    expect(() =>
      loader({ params, request: new Request('http://localhost') })
    ).rejects.toThrowError(
      'Database not found in the database list. Case not handled for now.'
    );
  });

  test('get active database from config', async () => {
    const params = { connectionName: 'connectionName' };

    setConfiguration('connectionName', 'databaseName2');

    expect(
      await loader({ params, request: new Request('http://localhost') })
    ).toEqual(redirect('/connections/connectionName/databaseName2'));
  });

  test('do not redirect if we are already on the right page', async () => {
    const params = { connectionName: 'connectionName' };

    setConfiguration('connectionName', 'databaseName2');

    expect(
      await loader({
        params,
        request: new Request(
          'http://localhost/connections/connectionName/databaseName2'
        ),
      })
    ).toEqual({
      databaseList: [
        { Database: 'databaseName1' },
        { Database: 'databaseName2' },
      ],
    });
  });

  test('handle connection name that are url-encoded', async () => {
    const params = { connectionName: 'connection + name' };

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
