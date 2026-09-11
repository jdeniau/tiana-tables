/**
 * @vitest-environment happy-dom
 */
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { DEFAULT_LOCALE } from '../../configuration/locale';
import { DEFAULT_THEME } from '../../configuration/themes';
import { Configuration } from '../../configuration/type';
import { loader } from './connections.$connectionSlug.$databaseName.$tableName';

const params = {
  connectionSlug: 'connectionSlug',
  databaseName: 'databaseName',
  tableName: 'tableName',
};

function setStoredFilter(currentFilter: string): void {
  const config: Configuration = {
    version: 1,
    theme: DEFAULT_THEME.name,
    locale: DEFAULT_LOCALE,
    connections: {
      connectionSlug: {
        name: 'connectionSlug',
        slug: 'connectionSlug',
        host: 'localhost',
        port: 3306,
        user: 'root',
        password: '',
        appState: {
          activeDatabase: 'databaseName',
          configByDatabase: {
            databaseName: {
              activeTable: 'tableName',
              tables: { tableName: { currentFilter } },
            },
          },
        },
      },
    },
  };

  // @ts-expect-error don't care about the whole object here
  window.config = {
    getConfiguration: () => Promise.resolve(config),
    setActiveTable: vi.fn(),
    setTableFilter: vi.fn(() => Promise.resolve([])),
  };
}

function loadWith(url: string) {
  return loader({ params, request: new Request(url) });
}

describe('loader', () => {
  beforeEach(() => {
    window.sql = {
      // @ts-expect-error return is OK here, type is too complex for now
      getPrimaryKeys: vi.fn(() => Promise.resolve([[{ Column_name: 'id' }]])),
    };
  });

  afterEach(() => {
    // @ts-expect-error reset data here, will be re-set in `beforeEach`
    window.sql = undefined;
    // @ts-expect-error reset data here, will be re-set in the test if needed
    window.config = undefined;
  });

  test('filters on the clause of the `where` param', async () => {
    setStoredFilter('');

    const { whereFilter } = await loadWith('http://localhost?where=id+%3D+1');

    expect(whereFilter).toBe('id = 1');
  });

  test('a `where` param of blank is no filter, and is not stored as one', async () => {
    setStoredFilter('');

    const { whereFilter } = await loadWith('http://localhost?where=+%0A+');

    expect(whereFilter).toBe('');
    expect(window.config.setTableFilter).toHaveBeenCalledWith(
      'connectionSlug',
      'databaseName',
      'tableName',
      ''
    );
  });

  test('a stored filter of blank does not come back as one', async () => {
    setStoredFilter('  ');

    const { whereFilter } = await loadWith('http://localhost');

    expect(whereFilter).toBe('');
  });

  test('keeps the lines of a filter, and drops what surrounds them', async () => {
    setStoredFilter('');

    const { whereFilter } = await loadWith(
      `http://localhost?where=${encodeURIComponent('\n a = 1\n  AND b = 2\n')}`
    );

    expect(whereFilter).toBe('a = 1\n  AND b = 2');
  });
});
