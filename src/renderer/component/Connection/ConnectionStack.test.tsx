/** @vitest-environment happy-dom */
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { RouterProvider, createMemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { useConnectionContext } from '../../../contexts/ConnectionContext';
import { useDatabaseContext } from '../../../contexts/DatabaseContext';
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
    root.render(<RouterProvider router={router} />);
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
    root.render(<RouterProvider router={router} />);
  });

  await act(async () => {
    container.querySelector('button')?.click();
  });

  await act(async () => cycleConnection(1));

  expect(router.state.location.pathname).toBe('/connections/a');

  await act(async () => cycleConnection(-1));

  expect(router.state.location.pathname).toBe('/connections/c');
});
