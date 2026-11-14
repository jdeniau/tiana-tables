/**
 * @vitest-environment happy-dom
 */
import { act } from 'react';
import { QueryClientProvider, notifyManager } from '@tanstack/react-query';
import { createRoot } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import { ThemeProvider } from 'styled-components';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import type { DisplayAfterByTable } from '../../configuration/columnOrder';
import { DEFAULT_THEME } from '../../configuration/themes';
import { AllColumnsContextProvider } from '../../contexts/AllColumnsContext';
import { ConnectionContext } from '../../contexts/ConnectionContext';
import { DatabaseContext } from '../../contexts/DatabaseContext';
import { ForeignKeysContextProvider } from '../../contexts/ForeignKeysContext';
import type { ColumnDetail, ForeignKey } from '../../sql/dialect/metadata';
import { mysqlDialect } from '../../sql/dialect/mysql';
import { FieldKind } from '../../sql/resultField';
import type { SelectLabelsRequest } from '../../sql/selectLabels';
import type { ResultRow } from '../../sql/types';
import { createQueryClient } from '../queryClient';
import TableGrid from './TableGrid';
import { mountRows } from './mountRows.testing';

vi.mock('../hooks/useDialect', () => ({ useDialect: () => mysqlDialect }));

(
  globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

// a `setTimeout` by default: an answer would reach the grid after `act` returned
notifyManager.setScheduler(queueMicrotask);

mountRows();

const TABLE = 'envoi_newsletter';

const FIELDS = [
  { name: 'id', kind: FieldKind.Number, table: TABLE },
  { name: 'article_une_id', kind: FieldKind.Number, table: TABLE },
  { name: 'media_une_id', kind: FieldKind.Number, table: TABLE },
];

const foreignKey = (
  constraintName: string,
  column: string,
  referencedTable: string,
  referencedColumn: string
): ForeignKey => ({
  constraintName,
  table: TABLE,
  column,
  referencedDatabase: 'tiana_dev',
  referencedTable,
  referencedColumn,
});

const FOREIGN_KEYS = [
  foreignKey('fk_envoi_article', 'article_une_id', 'article', 'id'),
  foreignKey(
    'fk_envoi_media_une',
    'article_une_id',
    'article_media',
    'article_id'
  ),
  foreignKey('fk_envoi_media_une', 'media_une_id', 'article_media', 'media_id'),
];

const column = (table: string, name: string): ColumnDetail => ({
  table,
  name,
  nullable: false,
  generated: false,
  binary: false,
  hasJsonType: false,
  allowedValues: [],
  multiValued: false,
});

const ALL_COLUMNS = [
  column('article', 'id'),
  column('article', 'titre'),
  column('article', 'slug'),
  column('article_media', 'article_id'),
  column('article_media', 'media_id'),
  column('article_media', 'position'),
];

/** sends of newsletters, each with its cover article and that article's picture */
function rows(count: number): Array<ResultRow> {
  return Array.from({ length: count }, (_, index) => {
    const article = (index % 30) + 1;

    return {
      id: index + 1,
      article_une_id: article,
      media_une_id: article * 10,
    };
  });
}

/** what the server answers: every key points at a row */
function answer({ table, keys }: SelectLabelsRequest) {
  return keys.map((parts) => {
    const values = parts.map(({ value }) => value);

    return {
      key: values,
      label:
        table === 'article' ? `Article ${values[0]}` : `#${values.join('/')}`,
    };
  });
}

const selectLabels = vi.fn();

let container: HTMLElement;
let root: ReturnType<typeof createRoot>;

beforeEach(() => {
  selectLabels
    .mockReset()
    .mockImplementation(async (request) => answer(request));
  window.sql = { selectLabels } as unknown as typeof window.sql;

  container = document.createElement('div');
  document.body.append(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

const queryClient = createQueryClient;

async function render(
  result: Array<ResultRow>,
  {
    displayAfterByTable = {} as DisplayAfterByTable | null,
    client = queryClient(),
  } = {}
): Promise<void> {
  await act(async () => {
    root.render(
      <QueryClientProvider client={client}>
        <ThemeProvider theme={DEFAULT_THEME}>
          <MemoryRouter>
            <ConnectionContext
              value={{
                currentConnectionSlug: 'dev',
                connectionSlugList: ['dev'],
                addConnectionToList: () => {},
                closeConnection: () => {},
              }}
            >
              <DatabaseContext
                value={{ database: 'tiana_dev', setDatabase: () => {} }}
              >
                <ForeignKeysContextProvider
                  foreignKeys={FOREIGN_KEYS}
                  database="tiana_dev"
                >
                  <AllColumnsContextProvider allColumns={ALL_COLUMNS}>
                    <TableGrid
                      fields={FIELDS}
                      result={result}
                      primaryKeys={['id']}
                      foreignKeyLabels={displayAfterByTable ?? undefined}
                    />
                  </AllColumnsContextProvider>
                </ForeignKeysContextProvider>
              </DatabaseContext>
            </ConnectionContext>
          </MemoryRouter>
        </ThemeProvider>
      </QueryClientProvider>
    );
  });
}

/** the cell of a column in the row of an id, as the grid mounts it */
function cell(id: number, columnIndex: number): HTMLTableCellElement {
  const row = container.querySelector(`tr[data-row-id="${id}"]`);
  const td = row?.querySelectorAll('td')[columnIndex];

  if (!td) {
    throw new Error(`No cell ${columnIndex} in the row of ${id}`);
  }

  return td;
}

const labelOf = (id: number, columnIndex: number): string | null =>
  cell(id, columnIndex)
    .querySelector('[data-label]')
    ?.getAttribute('data-label') ?? null;

describe('the labels of the foreign keys', () => {
  test('a key shows the label of the row it points at, after its value, set flush left', async () => {
    await render(rows(3));

    expect(cell(2, 1).textContent).toBe('2');
    expect(labelOf(2, 1)).toBe('Article 2');
    expect(cell(2, 1).classList.contains('tg-num')).toBe(false);
    // no key, no label: the number stays a number
    expect(labelOf(2, 0)).toBeNull();
    expect(cell(2, 0).classList.contains('tg-num')).toBe(true);
  });

  test('a column of two keys shows its own, the composite key labels its other column', async () => {
    await render(rows(3));

    expect(labelOf(3, 1)).toBe('Article 3');
    expect(labelOf(3, 2)).toBe('#3/30');
  });

  test('each key is asked once per hundred rows, each value once', async () => {
    await render(rows(150));

    expect(
      selectLabels.mock.calls.map(([{ table, keys }]) => [table, keys.length])
    ).toEqual([
      ['article', 30],
      ['article', 30],
      ['article_media', 30],
      ['article_media', 30],
    ]);
  });

  test('a key pointing at no row shows no label', async () => {
    selectLabels.mockResolvedValue([]);
    await render(rows(1));

    expect(cell(1, 1).textContent).toBe('1');
    expect(labelOf(1, 1)).toBeNull();
  });

  test('a key changed in a row keeps the labels of the others on screen while it is looked up', async () => {
    const client = queryClient();
    const before = rows(3);

    await render(before, { client });

    const pending: Array<() => void> = [];

    selectLabels.mockImplementation(
      (request) =>
        new Promise((resolve) => {
          pending.push(() => resolve(answer(request)));
        })
    );
    await render(
      before.map((row) =>
        row.id === 1 ? { ...row, article_une_id: 7, media_une_id: 70 } : row
      ),
      { client }
    );

    expect(labelOf(1, 1)).toBeNull();
    expect(labelOf(2, 1)).toBe('Article 2');

    await act(async () => pending.forEach((respond) => respond()));

    expect(labelOf(1, 1)).toBe('Article 7');
  });

  test('the order given to the table a key points at decides which of its columns names the rows', async () => {
    await render(rows(3), {
      displayAfterByTable: { article: { slug: 'id' } },
    });

    expect(
      selectLabels.mock.calls.map(([{ table, labelColumn }]) => [
        table,
        labelColumn,
      ])
    ).toEqual([
      ['article', 'slug'],
      ['article_media', 'position'],
    ]);
  });

  test('off, nothing is asked and a key stays a number', async () => {
    await render(rows(3), { displayAfterByTable: null });

    expect(selectLabels).not.toHaveBeenCalled();
    expect(labelOf(2, 1)).toBeNull();
    expect(cell(2, 1).classList.contains('tg-num')).toBe(true);
  });
});
