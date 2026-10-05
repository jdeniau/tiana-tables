/**
 * @vitest-environment happy-dom
 */
import { createMemoryRouter, redirect } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { DEFAULT_LOCALE } from '../../configuration/locale';
import { DEFAULT_THEME } from '../../configuration/themes';
import { Configuration, DatabaseConfig } from '../../configuration/type';
import { DatabaseEngine } from '../../sql/engine';
import { loader as connectionLoader } from './connections.$connectionSlug';
import { loader as databaseLoader } from './connections.$connectionSlug.$databaseName';
import { loader as databaseIndexLoader } from './connections.$connectionSlug.$databaseName._index';
import { loader as connectionIndexLoader } from './connections.$connectionSlug._index';

const params = { connectionSlug: 'connectionSlug', databaseName: 'app' };

/** Stores `activeDatabase` as the app does, so a loader reading it after the write sees it. */
function setConfiguration(
  activeDatabase: string,
  configByDatabase: Record<string, DatabaseConfig>
): void {
  const config: Configuration = {
    version: 1,
    theme: DEFAULT_THEME.name,
    locale: DEFAULT_LOCALE,
    connections: {
      connectionSlug: {
        name: 'connectionSlug',
        engine: DatabaseEngine.MySQL,
        slug: 'connectionSlug',
        host: 'localhost',
        port: 3306,
        user: 'root',
        password: '',
        appState: { activeDatabase, configByDatabase },
      },
    },
  };

  // @ts-expect-error don't care about the whole object here
  window.config = {
    getConfiguration: () => Promise.resolve(structuredClone(config)),
    setActiveDatabase: vi.fn((_slug: string, databaseName: string) => {
      config.connections.connectionSlug!.appState!.activeDatabase =
        databaseName;

      return Promise.resolve();
    }),
  };
}

function load() {
  return databaseLoader({ params, request: new Request('http://localhost') });
}

beforeEach(() => {
  window.sql = {
    listDatabases: vi.fn(() => Promise.resolve(['app', 'public'])),
    listTables: vi.fn(() => Promise.resolve(['orders', 'users'])),
    getForeignKeys: vi.fn(() => Promise.resolve([])),
    getAllColumns: vi.fn(() => Promise.resolve([])),
    getServerTimeZone: vi.fn(() =>
      Promise.resolve({ name: 'UTC', isAbbreviation: true })
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

describe('loader', () => {
  test('queries the database of the URL, announces and stores it', async () => {
    setConfiguration('public', {});

    expect(await load()).toEqual({
      connectionSlug: 'connectionSlug',
      databaseName: 'app',
      tableList: ['orders', 'users'],
      foreignKeys: [],
      allColumns: [],
      openTables: [],
    });
    expect(window.sql.listTables).toHaveBeenCalledWith('app');
    expect(window.sql.getForeignKeys).toHaveBeenCalledWith('app');
    expect(window.sql.getAllColumns).toHaveBeenCalledWith('app');
    expect(window.sql.connectionNameChanged).toHaveBeenLastCalledWith(
      'connectionSlug',
      'app'
    );
    expect(window.config.setActiveDatabase).toHaveBeenCalledWith(
      'connectionSlug',
      'app'
    );
  });

  test('current database is not in the database list', async () => {
    // TODO handle this case
    setConfiguration('app', {});
    window.sql.listDatabases = vi.fn(() => Promise.resolve(['public']));

    await expect(load).rejects.toThrowError(
      'Database not found in the database list. Case not handled for now.'
    );
  });

  test('drops the memorised tables the database no longer has', async () => {
    setConfiguration('app', {
      app: {
        activeTable: '',
        openTables: ['users', 'dropped', 'orders'],
        tables: {},
      },
    });

    expect(await load()).toMatchObject({ openTables: ['users', 'orders'] });
  });
});

describe('index loader', () => {
  test('resumes the last table of the database', async () => {
    setConfiguration('public', {
      app: { activeTable: 'orders', tables: {} },
    });

    expect(
      await databaseIndexLoader({
        params,
        request: new Request('http://localhost'),
      })
    ).toEqual(redirect('/connections/connectionSlug/app/tables/orders'));
  });

  test('stays on the database when no table was left open', async () => {
    setConfiguration('app', { app: { activeTable: '', tables: {} } });

    expect(
      await databaseIndexLoader({
        params,
        request: new Request('http://localhost'),
      })
    ).toBeNull();
  });
});

describe('routing', () => {
  // the tree of `app.tsx`, its real loaders included: they run in parallel, as in the app
  function createRouter(initialEntry: string) {
    return createMemoryRouter(
      [
        {
          path: '/connections/:connectionSlug',
          loader: connectionLoader,
          shouldRevalidate: ({ currentParams, nextParams }) =>
            currentParams.connectionSlug !== nextParams.connectionSlug,
          children: [
            { index: true, loader: connectionIndexLoader },
            {
              path: ':databaseName',
              loader: databaseLoader,
              shouldRevalidate: ({ currentParams, nextParams }) =>
                currentParams.connectionSlug !== nextParams.connectionSlug ||
                currentParams.databaseName !== nextParams.databaseName,
              children: [
                { index: true, loader: databaseIndexLoader },
                { path: 'tables/:tableName', loader: () => null },
              ],
            },
          ],
        },
      ],
      { initialEntries: [initialEntry] }
    );
  }

  async function settled(router: ReturnType<typeof createRouter>) {
    await vi.waitFor(() => {
      expect(router.state.navigation.state).toBe('idle');
      expect(router.state.initialized).toBe(true);
    });

    return `${router.state.location.pathname}${router.state.location.search}`;
  }

  beforeEach(() => {
    setConfiguration('app', {
      app: { activeTable: 'orders', tables: {} },
      public: { activeTable: 'article', tables: {} },
    });
  });

  test('opening the connection resumes its last database and table', async () => {
    const router = createRouter('/connections/connectionSlug');

    expect(await settled(router)).toBe(
      '/connections/connectionSlug/app/tables/orders'
    );
  });

  test('re-entering the connection on screen keeps its database announced', async () => {
    const router = createRouter(
      '/connections/connectionSlug/app/tables/orders'
    );
    await settled(router);

    await router.navigate('/connections/connectionSlug');

    expect(await settled(router)).toBe(
      '/connections/connectionSlug/app/tables/orders'
    );
    expect(window.sql.connectionNameChanged).toHaveBeenLastCalledWith(
      'connectionSlug',
      'app'
    );
  });

  test('a link to a table of another database keeps its table and filter', async () => {
    const router = createRouter(
      '/connections/connectionSlug/app/tables/orders'
    );
    await settled(router);

    await router.navigate(
      '/connections/connectionSlug/public/tables/users?where=id%20%3D%201'
    );

    expect(await settled(router)).toBe(
      '/connections/connectionSlug/public/tables/users?where=id%20%3D%201'
    );
  });

  test('picking another database lands on its last table', async () => {
    const router = createRouter(
      '/connections/connectionSlug/app/tables/orders'
    );
    await settled(router);

    await router.navigate('/connections/connectionSlug/public');

    expect(await settled(router)).toBe(
      '/connections/connectionSlug/public/tables/article'
    );
  });
});
