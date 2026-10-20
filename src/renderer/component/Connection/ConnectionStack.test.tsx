/** @vitest-environment happy-dom */
import { act } from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { createRoot } from 'react-dom/client';
import { Outlet, RouterProvider, createMemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { useConnectionContext } from '../../../contexts/ConnectionContext';
import { useDatabaseContext } from '../../../contexts/DatabaseContext';
import { createQueryClient } from '../../queryClient';
import ConnectionStack from './ConnectionStack';

(
  globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

let unmount: () => void = () => {};

/** what the Navigate menu's Next and Previous Connection send */
let cycleConnection: (offset: number) => void = () => {};

beforeEach(() => {
  window.navigationListener = {
    onCycleConnection: (callback: (offset: number) => void) => {
      cycleConnection = callback;

      return () => {};
    },
  } as unknown as typeof window.navigationListener;
  window.sql = {
    closeAllConnections: vi.fn(),
    closeConnection: vi.fn(),
  } as unknown as typeof window.sql;
  window.config = {
    getConfiguration: () =>
      Promise.resolve({
        connections: {
          connectionSlug: {
            appState: {
              activeDatabase: 'app',
              configByDatabase: {
                app: { activeTable: 'orders', tables: {} },
                public: { activeTable: 'article', tables: {} },
              },
            },
          },
        },
      }),
  } as unknown as typeof window.config;
});

afterEach(() => {
  act(() => unmount());
  document.body.innerHTML = '';
  // @ts-expect-error reset data here, will be re-set in `beforeEach`
  window.sql = undefined;
  // @ts-expect-error reset data here, will be re-set in `beforeEach`
  window.config = undefined;
  // @ts-expect-error reset data here, will be re-set in `beforeEach`
  window.navigationListener = undefined;
  cycleConnection = () => {};
});

function PickDatabase({ name }: { name: string }) {
  const { setDatabase } = useDatabaseContext();

  return <button onClick={() => setDatabase(name)}>{name}</button>;
}

function OpenConnections({ slugs }: { slugs: Array<string> }) {
  const { addConnectionToList } = useConnectionContext();

  return (
    <button onClick={() => slugs.forEach(addConnectionToList)}>open</button>
  );
}

test('picking a database goes straight to its last table', async () => {
  const router = createMemoryRouter(
    [
      {
        path: '*',
        element: (
          <ConnectionStack>
            <PickDatabase name="public" />
          </ConnectionStack>
        ),
      },
    ],
    { initialEntries: ['/connections/connectionSlug/app/tables/orders'] }
  );
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);
  unmount = () => root.unmount();

  await act(async () => {
    root.render(
      <QueryClientProvider client={createQueryClient()}>
        <RouterProvider router={router} />
      </QueryClientProvider>
    );
  });

  await act(async () => {
    container.querySelector('button')?.click();
  });

  expect(router.state.location.pathname).toBe(
    '/connections/connectionSlug/public/tables/article'
  );
});

test('the menu cycles through the connection tabs, wrapping around', async () => {
  const router = createMemoryRouter(
    [
      {
        path: '*',
        element: (
          <ConnectionStack>
            <OpenConnections slugs={['a', 'b', 'c']} />
          </ConnectionStack>
        ),
      },
    ],
    { initialEntries: ['/connections/c/app'] }
  );
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);
  unmount = () => root.unmount();

  await act(async () => {
    root.render(
      <QueryClientProvider client={createQueryClient()}>
        <RouterProvider router={router} />
      </QueryClientProvider>
    );
  });

  await act(async () => {
    container.querySelector('button')?.click();
  });

  await act(async () => cycleConnection(1));

  expect(router.state.location.pathname).toBe('/connections/a');

  await act(async () => cycleConnection(-1));

  expect(router.state.location.pathname).toBe('/connections/c');
});

function CloseConnection({ slug }: { slug: string }) {
  const { addConnectionToList, closeConnection } = useConnectionContext();

  return (
    <>
      <button onClick={() => ['a', 'b'].forEach(addConnectionToList)}>
        open
      </button>
      <button onClick={() => closeConnection(slug)}>close</button>
    </>
  );
}

/** connections `a` and `b` open on a table of `a`, each with rows in the cache; `/connections/b` loads until `arrive` */
async function renderOnA(closedSlug: string) {
  const queryClient = createQueryClient();
  queryClient.setQueryData(['a', 'app', 'tableRows', 'orders', 'SELECT'], []);
  queryClient.setQueryData(['b', 'app', 'tableRows', 'orders', 'SELECT'], []);

  let arrive: () => void = () => {};
  const router = createMemoryRouter(
    [
      {
        element: (
          <ConnectionStack>
            <CloseConnection slug={closedSlug} />
            <Outlet />
          </ConnectionStack>
        ),
        children: [
          {
            path: 'connections/b',
            loader: () =>
              new Promise((resolve) => {
                arrive = () => resolve(null);
              }),
            element: null,
          },
          { path: '*', element: null },
        ],
      },
    ],
    { initialEntries: ['/connections/a/app/tables/orders'] }
  );
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);
  unmount = () => root.unmount();

  await act(async () => {
    root.render(
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router} />
      </QueryClientProvider>
    );
  });

  const [open, close] = container.querySelectorAll('button');
  await act(async () => open?.click());
  await act(async () => close?.click());

  const cachedSlugs = () =>
    queryClient
      .getQueryCache()
      .getAll()
      .map((query) => query.queryKey[0]);

  return { cachedSlugs, arrive: () => act(async () => arrive()) };
}

test('closing the current connection empties its cache once its page has left', async () => {
  const { cachedSlugs, arrive } = await renderOnA('a');

  expect(cachedSlugs()).toEqual(['a', 'b']);

  await arrive();

  expect(cachedSlugs()).toEqual(['b']);
});

test('closing another connection empties its cache at once', async () => {
  const { cachedSlugs } = await renderOnA('b');

  expect(cachedSlugs()).toEqual(['a']);
});
