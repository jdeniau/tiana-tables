/**
 * @vitest-environment happy-dom
 */
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { Outlet, RouterProvider, createMemoryRouter } from 'react-router-dom';
import { ThemeProvider } from 'styled-components';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { DEFAULT_THEME } from '../../configuration/themes';
import { OpenTablesContextProvider } from '../../contexts/OpenTablesContext';
import TableTabs from './TableTabs';

let container: HTMLElement;
let unmount: () => void;

beforeEach(() => {
  // @ts-expect-error there is no main process here to answer the writes
  window.config = { setOpenTables: vi.fn(), setActiveTable: vi.fn() };
});

afterEach(() => {
  act(() => unmount());
  container.remove();
});

/**
 * The strip as the app mounts it, data router included.
 * The loader is the point: the router holds the old location until it resolves, so one navigation spans several renders.
 */
async function render(
  openTables: Array<string>,
  tableName?: string
): Promise<void> {
  container = document.createElement('div');
  document.body.append(container);

  const router = createMemoryRouter(
    [
      {
        path: '/connections/:connectionSlug/:databaseName',
        element: (
          <OpenTablesContextProvider
            connectionSlug="test"
            database="shop"
            openTables={openTables}
          >
            <TableTabs />
            <Outlet />
          </OpenTablesContextProvider>
        ),
        children: [
          {
            path: 'tables/:tableName',
            loader: () => Promise.resolve(null),
            element: null,
          },
        ],
      },
    ],
    {
      initialEntries: [
        tableName
          ? `/connections/test/shop/tables/${tableName}`
          : '/connections/test/shop',
      ],
    }
  );

  const root = createRoot(container);
  unmount = () => root.unmount();

  await act(async () => {
    root.render(
      <ThemeProvider theme={DEFAULT_THEME}>
        <RouterProvider router={router} />
      </ThemeProvider>
    );
  });
}

/** the run, as it reads: `article*` is the temporary tab, `article <` the active one */
function strip(): Array<string> {
  return [...container.querySelectorAll<HTMLElement>('div[title]')].map(
    (tab) => {
      const link = tab.querySelector('a');
      const label = tab.querySelector('span:last-of-type');

      return (
        tab.title +
        (label && getComputedStyle(label).fontStyle === 'italic' ? '*' : '') +
        (link?.getAttribute('aria-current') ? ' <' : '')
      );
    }
  );
}

function tab(tableName: string): HTMLElement {
  const element = container.querySelector<HTMLElement>(
    `div[title="${tableName}"]`
  );

  if (!element) {
    throw new Error(`no tab for ${tableName}`);
  }

  return element;
}

async function click(element: Element | null, type = 'click'): Promise<void> {
  await act(async () => {
    element?.dispatchEvent(new MouseEvent(type, { bubbles: true }));
  });
}

describe('TableTabs', () => {
  test('renders the memorised tables and marks the one the route names', async () => {
    await render(['users', 'orders'], 'orders');

    expect(strip()).toEqual(['users', 'orders <']);
  });

  // the table list, a foreign key link and ⌘K all reach a table this way, and the strip has no handler for any of them
  test('a table the route names and has not memorised is the temporary tab', async () => {
    await render(['users'], 'shipments');

    expect(strip()).toEqual(['users', 'shipments* <']);
  });

  test('no tab, no bar', async () => {
    await render([]);

    expect(container.innerHTML).toBe('');
  });

  test('a double click memorises the temporary tab, where it stands', async () => {
    await render(['users'], 'shipments');

    await click(tab('shipments'), 'dblclick');

    expect(strip()).toEqual(['users', 'shipments <']);
    expect(window.config.setOpenTables).toHaveBeenCalledWith('test', 'shop', [
      'users',
      'shipments',
    ]);
  });

  test('opening a memorised tab leaves the temporary one where it is', async () => {
    await render(['users', 'orders'], 'shipments');

    await click(tab('orders').querySelector('a'));

    expect(strip()).toEqual(['users', 'orders <', 'shipments*']);
  });

  test('closing the tab we are on opens the one before it', async () => {
    await render(['users', 'orders'], 'orders');

    await click(tab('orders').querySelector('button'));

    expect(strip()).toEqual(['users <']);
  });

  // the route still names the closed table until the navigation lands, and it used to come back as the temporary tab
  test('a closed tab does not come back as the temporary one', async () => {
    await render(['users', 'orders'], 'orders');

    await click(tab('orders').querySelector('button'));

    expect(strip()).not.toContain('orders*');
  });

  test('closing a tab we are not on moves nothing else', async () => {
    await render(['users', 'orders'], 'orders');

    await click(tab('users').querySelector('button'));

    expect(strip()).toEqual(['orders <']);
  });
});
