/**
 * @vitest-environment happy-dom
 */
import { act } from 'react';
import {
  QueryClient,
  QueryClientProvider,
  notifyManager,
} from '@tanstack/react-query';
import { createRoot } from 'react-dom/client';
import {
  RouterProvider,
  createMemoryRouter,
  useLoaderData,
} from 'react-router-dom';
import { ThemeProvider } from 'styled-components';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { DEFAULT_THEME } from '../../../configuration/themes';
import type { TableSorting } from '../../../configuration/type';
import { AllColumnsContextProvider } from '../../../contexts/AllColumnsContext';
import { DatabaseContext } from '../../../contexts/DatabaseContext';
import { ForeignKeysContextProvider } from '../../../contexts/ForeignKeysContext';
import type { ColumnDetail } from '../../../sql/dialect/metadata';
import { mysqlDialect } from '../../../sql/dialect/mysql';
import { FieldKind } from '../../../sql/resultField';
import { createQueryClient } from '../../queryClient';
import { TableLayout } from './TableLayout';
import { readOrderParams } from './tableSearch';

vi.mock('../../hooks/useDialect', () => ({ useDialect: () => mysqlDialect }));
vi.mock('../../hooks/usePanelSize', () => ({
  usePanelSize: () => ({ panelProps: {}, onResizeEnd: () => {} }),
}));
// the filter's editor is Monaco, which has nothing to say about the order
vi.mock('../Query/WhereFilter', () => ({ default: () => null }));

(
  globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

// a `setTimeout` by default: an answer would reach the page after `act` returned
notifyManager.setScheduler(queueMicrotask);

const FIELDS = [
  { name: 'id', kind: FieldKind.Number },
  { name: 'name', kind: FieldKind.String },
];

const executeQuery = vi.fn();

const column = (name: string): ColumnDetail => ({
  table: 'items',
  name,
  nullable: false,
  generated: false,
  binary: false,
  hasJsonType: false,
  allowedValues: [],
  multiValued: false,
});

let container: HTMLElement;
let unmount: () => void;
let router: ReturnType<typeof createMemoryRouter>;
// one per test: a page rendered again in the same test finds what the first one fetched
let queryClient: QueryClient;

beforeEach(() => {
  queryClient = createQueryClient();
  executeQuery.mockReset();
  executeQuery.mockResolvedValue([[{ id: 1, name: 'a' }], FIELDS]);
  window.sql = { executeQuery } as unknown as typeof window.sql;
});

afterEach(() => {
  act(() => unmount());
  container.remove();
  vi.useRealTimers();
});

/** past the few seconds in which the rows a page just fetched are not fetched again */
function ageTheRows(): void {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(Date.now() + 60_000);
}

function Page({ where }: { where?: string }) {
  const { primaryKeys, sorting } = useLoaderData() as {
    primaryKeys: Array<string>;
    sorting: TableSorting;
  };

  return (
    <TableLayout
      connectionSlug="shop"
      tableName="items"
      database="shop"
      primaryKeys={primaryKeys}
      where={where}
      filterHistory={[]}
      sorting={sorting}
      displayAfterByColumn={{}}
      columnWidths={{}}
    />
  );
}

/** the table page at `url`, behind a loader that answers as the route's: a new key array each time, the URL's order */
async function render(
  where?: string,
  url = '/',
  allColumns: Array<ColumnDetail> = []
): Promise<void> {
  container = document.createElement('div');
  document.body.append(container);

  const root = createRoot(container);
  unmount = () => root.unmount();

  router = createMemoryRouter(
    [
      {
        path: '/',
        loader: ({ request }) => ({
          primaryKeys: ['id'],
          sorting: readOrderParams(new URL(request.url).searchParams) ?? [],
        }),
        element: <Page where={where} />,
      },
    ],
    { initialEntries: [url] }
  );

  await act(async () => {
    root.render(
      <ThemeProvider theme={DEFAULT_THEME}>
        <DatabaseContext value={{ database: 'shop', setDatabase: () => {} }}>
          <ForeignKeysContextProvider foreignKeys={[]} database="shop">
            <AllColumnsContextProvider allColumns={allColumns}>
              <QueryClientProvider client={queryClient}>
                <RouterProvider router={router} />
              </QueryClientProvider>
            </AllColumnsContextProvider>
          </ForeignKeysContextProvider>
        </DatabaseContext>
      </ThemeProvider>
    );
  });
}

function header(name: string): HTMLTableCellElement {
  const cell = [...container.querySelectorAll('th')].find(
    (th) => (th.querySelector('button > span') ?? th).textContent === name
  );

  if (!cell) {
    throw new Error(`No header "${name}"`);
  }

  return cell;
}

async function click(
  element: HTMLElement | null | undefined,
  { shiftKey = false } = {}
): Promise<void> {
  await act(async () => {
    element?.dispatchEvent(
      new MouseEvent('click', { bubbles: true, shiftKey })
    );
  });
}

const lastQuery = (): string => executeQuery.mock.lastCall?.[0];

const clickLoadMore = (): Promise<void> =>
  click(
    [...container.querySelectorAll('button')].find(
      (button) => button.textContent === 'Load more…'
    )
  );

describe('load more', () => {
  test('asks for the next page once', async () => {
    await render();
    executeQuery.mockClear();

    await clickLoadMore();

    expect(executeQuery.mock.calls.map(([query]) => query)).toEqual([
      'SELECT * FROM `shop`.`items` ORDER BY `id` LIMIT 100 OFFSET 100;',
    ]);
  });

  test('a failed page shows its error alone, without the rows loaded', async () => {
    await render();
    expect(container.textContent).toContain('1 row');

    executeQuery.mockRejectedValueOnce(new Error('connection lost'));
    await clickLoadMore();

    expect(container.textContent).toContain('connection lost');
    expect(container.textContent).not.toContain('1 row');
  });
});

describe('back on a table seen before', () => {
  test('shows the rows loaded at once, then fetches every page again behind them', async () => {
    await render();
    await clickLoadMore();
    act(() => unmount());
    container.remove();
    ageTheRows();

    executeQuery.mockClear();
    let answer: (value: unknown) => void = () => {};
    executeQuery.mockReturnValueOnce(
      new Promise((resolve) => {
        answer = resolve;
      })
    );

    await render();

    expect(container.querySelectorAll('.tg-skeleton-row')).toHaveLength(0);
    expect(container.textContent).toContain('2 rows');
    expect(executeQuery.mock.calls.map(([query]) => query)).toEqual([
      'SELECT * FROM `shop`.`items` ORDER BY `id` LIMIT 100 OFFSET 0;',
    ]);

    // a row inserted meanwhile: the virtualized body draws no cell here, the count tells the new rows
    await act(async () =>
      answer([
        [
          { id: 1, name: 'a' },
          { id: 2, name: 'b' },
        ],
        FIELDS,
      ])
    );

    expect(executeQuery.mock.calls.map(([query]) => query)).toEqual([
      'SELECT * FROM `shop`.`items` ORDER BY `id` LIMIT 100 OFFSET 0;',
      'SELECT * FROM `shop`.`items` ORDER BY `id` LIMIT 100 OFFSET 100;',
    ]);
    expect(container.textContent).toContain('3 rows');
  });

  test('asks nothing for rows it fetched a moment ago, as the ones its loader started', async () => {
    await render();
    act(() => unmount());
    container.remove();
    executeQuery.mockClear();

    await render();

    expect(executeQuery).not.toHaveBeenCalled();
  });
});

describe('sorting', () => {
  test('pages in the order of the key before any click, marking no column', async () => {
    await render();

    expect(lastQuery()).toContain('ORDER BY `id` LIMIT 100 OFFSET 0');
    expect(container.querySelector('th[aria-sort]')).toBeNull();
  });

  test('a click on a header fetches the first page in its order', async () => {
    await render();

    await clickLoadMore();
    expect(lastQuery()).toContain('OFFSET 100');

    await click(header('name').querySelector('button'));
    expect(lastQuery()).toContain(
      'ORDER BY `name` ASC, `id` LIMIT 100 OFFSET 0'
    );

    await click(header('name').querySelector('button'));
    expect(lastQuery()).toContain(
      'ORDER BY `name` DESC, `id` LIMIT 100 OFFSET 0'
    );

    await click(header('id').querySelector('button'), { shiftKey: true });
    expect(lastQuery()).toContain(
      'ORDER BY `name` DESC, `id` ASC LIMIT 100 OFFSET 0'
    );
  });

  test('a sort removed goes back to the order of the key', async () => {
    await render();

    const name = header('name').querySelector('button');
    await click(name);
    await click(name);
    ageTheRows();
    await click(name);

    expect(lastQuery()).toContain('ORDER BY `id` LIMIT 100 OFFSET 0');
  });

  test('a failed sort leaves the headers to pick another one', async () => {
    // a query that failed has no rows, so no columns: the headers are the schema's
    await render(undefined, '/', [column('id'), column('name')]);

    executeQuery.mockRejectedValueOnce(new Error('no ordering operator'));
    await click(header('name').querySelector('button'));

    expect(container.textContent).toContain('no ordering operator');

    await click(header('id').querySelector('button'));

    expect(lastQuery()).toContain('ORDER BY `id` ASC LIMIT 100 OFFSET 0');
    expect(container.textContent).not.toContain('no ordering operator');
  });

  test('opens in the order of the URL', async () => {
    await render(undefined, '/?order[name]=DESC');

    expect(lastQuery()).toContain(
      'ORDER BY `name` DESC, `id` LIMIT 100 OFFSET 0'
    );
    expect(header('name').getAttribute('aria-sort')).toBe('descending');
  });

  test('a click writes its order into the URL, next to the filter', async () => {
    await render('id > 1');

    await click(header('name').querySelector('button'));
    await click(header('id').querySelector('button'), { shiftKey: true });

    expect(router.state.location.search).toBe(
      '?where=id%20%3E%201&order[name]=ASC&order[id]=ASC'
    );

    // a click without Shift sorts on that column alone: descending, then not at all
    await click(header('name').querySelector('button'));
    await click(header('name').querySelector('button'));

    expect(router.state.location.search).toBe('?where=id%20%3E%201&order=');
  });

  test('a click asks for its rows once', async () => {
    await render();
    executeQuery.mockClear();

    await click(header('name').querySelector('button'));

    expect(executeQuery).toHaveBeenCalledTimes(1);
  });

  test("a filter's own order leaves the headers inert", async () => {
    await render('name <> "" ORDER BY name');

    expect(container.querySelector('th button')).toBeNull();
    expect(header('id').hasAttribute('aria-sort')).toBe(false);
  });
});

describe('while the rows are on their way', () => {
  /** the answer of the next query, given when the test says */
  function deferAnswer(): (rows: Array<object>) => Promise<void> {
    let answer: (value: unknown) => void = () => {};
    executeQuery.mockReturnValueOnce(
      new Promise((resolve) => {
        answer = resolve;
      })
    );

    return async (rows) => {
      await act(async () => answer([rows, FIELDS]));
    };
  }

  const skeletonRows = (): number =>
    container.querySelectorAll('.tg-skeleton-row').length;

  test('the heads are the columns of the schema, in the order of the table', async () => {
    const answer = deferAnswer();

    await render(undefined, '/', [
      column('id'),
      column('name'),
      { ...column('id'), table: 'other' },
    ]);

    expect(
      [...container.querySelectorAll('th')].map((th) => th.textContent)
    ).toEqual(['id', 'name']);
    expect(skeletonRows()).toBe(20);

    await answer([{ id: 1, name: 'a' }]);

    expect(skeletonRows()).toBe(0);
  });

  test('a new order shows the skeleton until its rows arrive', async () => {
    await render();

    const answer = deferAnswer();
    await click(header('name').querySelector('button'));

    expect(skeletonRows()).toBe(20);

    await answer([{ id: 2, name: 'b' }]);

    expect(skeletonRows()).toBe(0);
  });

  test('the answer of an order already left ends no wait', async () => {
    await render();

    const answerAscending = deferAnswer();
    await click(header('name').querySelector('button'));
    const answerDescending = deferAnswer();
    await click(header('name').querySelector('button'));

    await answerAscending([{ id: 1, name: 'a' }]);
    expect(skeletonRows()).toBe(20);

    await answerDescending([{ id: 2, name: 'b' }]);
    expect(skeletonRows()).toBe(0);
  });
});
