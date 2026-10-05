/**
 * @vitest-environment happy-dom
 */
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { loader } from './connections.$connectionSlug';

describe('loader', () => {
  beforeEach(() => {
    // only the calls the loader makes are mocked: reading the configuration would throw
    window.sql = {
      listDatabases: vi.fn(() =>
        Promise.resolve(['databaseName1', 'databaseName2'])
      ),
      getServerTimeZone: vi.fn(() =>
        Promise.resolve({ name: 'UTC', isAbbreviation: true })
      ),
      connectionNameChanged: vi.fn(),
    } as unknown as typeof window.sql;
  });

  afterEach(() => {
    // @ts-expect-error reset data here, will be re-set in `beforeEach`
    window.sql = undefined;
  });

  test('loads what the connection holds, whatever the database', async () => {
    const params = {
      connectionSlug: 'connectionSlug',
      databaseName: 'databaseName2',
    };

    expect(
      await loader({ params, request: new Request('http://localhost') })
    ).toEqual({
      connectionSlug: 'connectionSlug',
      databaseList: ['databaseName1', 'databaseName2'],
      serverTimeZone: { name: 'UTC', isAbbreviation: true },
    });
  });

  test('announces the database of the URL, or none', async () => {
    await loader({
      params: { connectionSlug: 'connectionSlug' },
      request: new Request('http://localhost'),
    });

    expect(window.sql.connectionNameChanged).toHaveBeenLastCalledWith(
      'connectionSlug',
      undefined
    );

    await loader({
      params: { connectionSlug: 'connectionSlug', databaseName: 'db' },
      request: new Request('http://localhost'),
    });

    expect(window.sql.connectionNameChanged).toHaveBeenLastCalledWith(
      'connectionSlug',
      'db'
    );
  });

  test('should throw if there is not database (for now)', async () => {
    // TODO handle this case
    window.sql.listDatabases = vi.fn(() => Promise.resolve([]));

    await expect(() =>
      loader({
        params: { connectionSlug: 'connectionSlug' },
        request: new Request('http://localhost'),
      })
    ).rejects.toThrowError('No database found. Case not handled for now.');
  });
});
