/**
 * @vitest-environment happy-dom
 */
import { act } from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { createRoot } from 'react-dom/client';
import { RouterProvider, createMemoryRouter } from 'react-router-dom';
import { ThemeProvider } from 'styled-components';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { DEFAULT_THEME } from '../../configuration/themes';
import { DatabaseEngine } from '../../sql/engine';
import { RunMode } from '../../sql/runMode';
import type { SqlError } from '../../sql/sqlError';
import { createQueryClient } from '../queryClient';
import SqlPage, { action } from './sql.$connectionSlug';

// the page alone: Monaco, the result grid and the contexts they read stay out
vi.mock('../component/MonacoEditor/RawSqlEditor', () => ({
  RawSqlEditor: ({ defaultValue }: { defaultValue?: string }) => (
    <output>{defaultValue}</output>
  ),
}));
vi.mock('../component/Query/RawSqlResult/RowDataPacketResult', () => ({
  default: () => null,
}));
vi.mock('../hooks/usePanelSize', () => ({
  usePanelSize: () => ({ panelProps: {}, onResizeEnd: () => {} }),
}));
vi.mock('../hooks/useDialect', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../hooks/useDialect')>()),
  useDialect: () => ({ engine: DatabaseEngine.MySQL }),
}));

(
  globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

function runAction(
  databaseName: string,
  raw: string,
  {
    mode = RunMode.Current,
    caretOffset = 0,
    queryClient = createQueryClient(),
  } = {}
) {
  const formData = new FormData();
  formData.set('raw', raw);
  formData.set('mode', mode);
  formData.set('caretOffset', String(caretOffset));

  return action(queryClient)({
    params: { connectionSlug: 'connectionSlug', databaseName },
    request: new Request('http://localhost', {
      method: 'POST',
      body: formData,
    }),
    context: {},
  });
}

/** the queries sent, the leading `USE` left out */
function sentQueries(): unknown[] {
  return vi
    .mocked(window.sql.executeQuery)
    .mock.calls.slice(1)
    .map(([query]) => query);
}

/** a refused statement as the preload throws it: decoded flat */
function sqlError(message: string): SqlError {
  return {
    name: 'Error',
    message,
    kind: 'sql',
    code: 'ER_NO_SUCH_TABLE',
    errno: 1146,
    sqlState: '42S02',
  };
}

describe('action', () => {
  beforeEach(() => {
    window.sql = {
      // @ts-expect-error return is OK here, the type is too complex for now
      executeQuery: vi.fn(() => Promise.resolve([[], []])),
    };

    // the action reads the engine of the connection to know how to spell `USE`
    window.config = {
      // @ts-expect-error only the connections are read here
      getConfiguration: vi.fn(() =>
        Promise.resolve({
          connections: {
            connectionSlug: { engine: DatabaseEngine.MySQL },
          },
        })
      ),
    };
  });

  afterEach(() => {
    // @ts-expect-error reset data here, will be re-set in `beforeEach`
    window.sql = undefined;
    // @ts-expect-error same
    window.config = undefined;
  });

  test('escapes the database name of the USE it sends first', async () => {
    await runAction('some-database', 'SELECT 1');

    // `USE some-database` is a syntax error: the panel used to be unusable on
    // any database whose name holds a dash
    expect(window.sql.executeQuery).toHaveBeenNthCalledWith(
      1,
      'USE `some-database`;'
    );
  });

  test('sends the query the user wrote as written', async () => {
    await runAction('shop', "SELECT * FROM orders WHERE label = 'a:b'");

    expect(window.sql.executeQuery).toHaveBeenNthCalledWith(
      2,
      "SELECT * FROM orders WHERE label = 'a:b'",
      true
    );
  });

  test('sends only the statement the caret sits in', async () => {
    const raw = 'SELECT 1;\nSELECT 2;\nSELECT 3;';

    await runAction('shop', raw, { caretOffset: raw.indexOf('2') });

    expect(sentQueries()).toEqual(['SELECT 2;']);
  });

  test('sends every statement, in order, when asked to run them all', async () => {
    await runAction('shop', 'SELECT 1;\nSELECT 2;\nSELECT 3', {
      mode: RunMode.All,
    });

    expect(sentQueries()).toEqual(['SELECT 1;', 'SELECT 2;', 'SELECT 3']);
  });

  test('stops at the first statement that fails', async () => {
    const error = sqlError('Table `nope` does not exist');

    vi.mocked(window.sql.executeQuery).mockImplementation((query) =>
      query.includes('2') ? Promise.reject(error) : Promise.resolve([[], []])
    );

    const { outcomes } = await runAction(
      'shop',
      'SELECT 1;\nSELECT 2;\nSELECT 3;',
      { mode: RunMode.All }
    );

    expect(sentQueries()).toEqual(['SELECT 1;', 'SELECT 2;']);
    expect(outcomes).toHaveLength(2);
    expect(outcomes[1]).toEqual({ sql: 'SELECT 2;', error });
  });

  // The result panel gates the chart tab on this: a partial result set would
  // draw a chart that looks right and is not.
  test('reports whether the query limited its result set', async () => {
    await expect(runAction('shop', 'SELECT * FROM orders')).resolves.toEqual({
      outcomes: [expect.objectContaining({ hasLimit: false })],
    });

    await expect(
      runAction('shop', 'SELECT * FROM orders LIMIT 10')
    ).resolves.toEqual({
      outcomes: [expect.objectContaining({ hasLimit: true })],
    });
  });

  test('keeps what the run answered for the next visit of the page', async () => {
    const queryClient = createQueryClient();

    await runAction('shop', 'SELECT 1', { queryClient });

    expect(
      queryClient.getQueryData(['connectionSlug', 'shop', 'sqlResult'])
    ).toEqual({
      outcomes: [expect.objectContaining({ sql: 'SELECT 1' })],
    });
  });

  test('sends nothing at all when the editor holds no statement', async () => {
    await expect(runAction('shop', '-- nothing to run yet\n')).resolves.toEqual(
      { outcomes: [] }
    );

    expect(window.sql.executeQuery).not.toHaveBeenCalled();
  });
});

describe('the page', () => {
  const latest: Record<string, string> = {
    'client-a': 'SELECT 1 AS client_a',
    'client-b': 'SELECT 2 AS client_b',
  };

  beforeEach(() => {
    window.sqlFileStorage = {
      loadLatest: vi.fn((slug: string) =>
        Promise.resolve(latest[slug] ?? null)
      ),
      saveLatest: vi.fn(() => Promise.resolve()),
    };
  });

  afterEach(() => {
    // @ts-expect-error reset data here, will be re-set in `beforeEach`
    window.sqlFileStorage = undefined;
  });

  test('going straight from the SQL page of a connection to that of another shows the query of the other', async () => {
    const router = createMemoryRouter(
      [
        {
          path: '/connections/:connectionSlug/:databaseName/sql',
          Component: SqlPage,
          // a navigation that resolves later, as in the app
          loader: () => null,
        },
      ],
      { initialEntries: ['/connections/client-a/shop/sql'] }
    );
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);

    await act(async () => {
      root.render(
        <ThemeProvider theme={DEFAULT_THEME}>
          <QueryClientProvider client={createQueryClient()}>
            <RouterProvider router={router} />
          </QueryClientProvider>
        </ThemeProvider>
      );
    });

    expect(container.querySelector('output')?.textContent).toBe(
      'SELECT 1 AS client_a'
    );

    await act(() => router.navigate('/connections/client-b/shop/sql'));

    expect(container.querySelector('output')?.textContent).toBe(
      'SELECT 2 AS client_b'
    );

    act(() => root.unmount());
    container.remove();
  });
});
