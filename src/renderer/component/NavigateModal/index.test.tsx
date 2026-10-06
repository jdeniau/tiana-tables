/** @vitest-environment happy-dom */
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { RouterProvider, createMemoryRouter } from 'react-router-dom';
import { ThemeProvider } from 'styled-components';
import { afterEach, expect, test, vi } from 'vitest';
import { DEFAULT_THEME } from '../../../configuration/themes';
import { ConnectionContext } from '../../../contexts/ConnectionContext';
import { DatabaseContext } from '../../../contexts/DatabaseContext';
import { DatabaseListContextProvider } from '../../../contexts/DatabaseListContext';
import { TableListContextProvider } from '../../../contexts/TableListContext';
import NavigateModalContainer from '.';

(
  globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

let unmount: () => void = () => {};

afterEach(() => {
  act(() => unmount());
  document.body.innerHTML = '';
});

async function render(setDatabase: (database: string) => void) {
  const router = createMemoryRouter(
    [
      {
        path: '*',
        element: (
          <ConnectionContext
            value={{ currentConnectionSlug: 'connectionSlug' } as never}
          >
            <DatabaseContext value={{ database: 'app', setDatabase }}>
              <DatabaseListContextProvider databaseList={['app', 'public']}>
                <TableListContextProvider tableList={['orders']}>
                  <NavigateModalContainer
                    isNavigateModalOpen
                    setIsNavigateModalOpen={() => {}}
                  />
                </TableListContextProvider>
              </DatabaseListContextProvider>
            </DatabaseContext>
          </ConnectionContext>
        ),
      },
    ],
    { initialEntries: ['/connections/connectionSlug/app/sql'] }
  );
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);
  unmount = () => root.unmount();

  await act(async () => {
    root.render(
      <ThemeProvider theme={DEFAULT_THEME}>
        <RouterProvider router={router} />
      </ThemeProvider>
    );
  });

  return router;
}

async function clickItem(name: string): Promise<void> {
  const item = [...document.querySelectorAll('li')].find(
    (li) => li.textContent?.trim() === name
  );

  if (!item) {
    throw new Error(`No item "${name}"`);
  }

  await act(async () => item.click());
}

test('a table opens its URL', async () => {
  const router = await render(vi.fn());

  await clickItem('orders');

  expect(router.state.location.pathname).toBe(
    '/connections/connectionSlug/app/tables/orders'
  );
});

test('a database is entered as the database selector does', async () => {
  const setDatabase = vi.fn();
  const router = await render(setDatabase);

  await clickItem('public');

  expect(setDatabase).toHaveBeenCalledWith('public');
  expect(router.state.location.pathname).toBe(
    '/connections/connectionSlug/app/sql'
  );
});
