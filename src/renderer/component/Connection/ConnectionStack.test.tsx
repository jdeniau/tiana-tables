/** @vitest-environment happy-dom */
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { RouterProvider, createMemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { useDatabaseContext } from '../../../contexts/DatabaseContext';
import ConnectionStack from './ConnectionStack';

(
  globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

let unmount: () => void = () => {};

beforeEach(() => {
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
});

function PickDatabase({ name }: { name: string }) {
  const { setDatabase } = useDatabaseContext();

  return <button onClick={() => setDatabase(name)}>{name}</button>;
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
