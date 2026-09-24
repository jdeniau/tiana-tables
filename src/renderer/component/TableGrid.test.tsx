/**
 * @vitest-environment happy-dom
 */
import { type ReactElement, act, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import { ThemeProvider } from 'styled-components';
import { afterEach, describe, expect, test, vi } from 'vitest';
import { DEFAULT_THEME } from '../../configuration/themes';
import { AllColumnsContextProvider } from '../../contexts/AllColumnsContext';
import { DatabaseContext } from '../../contexts/DatabaseContext';
import { ForeignKeysContextProvider } from '../../contexts/ForeignKeysContext';
import { mysqlDialect } from '../../sql/dialect/mysql';
import { FieldKind } from '../../sql/resultField';
import { SortDirection, type SortOrder } from '../../sql/sortOrder';
import TableGrid from './TableGrid';

vi.mock('../hooks/useDialect', () => ({ useDialect: () => mysqlDialect }));

(
  globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

const FIELDS = [
  { name: 'id', kind: FieldKind.Number, table: 'items' },
  { name: 'name', kind: FieldKind.String, table: 'items' },
];

const ROWS = [
  { id: 1, name: 'a' },
  { id: 2, name: 'b' },
];

let container: HTMLElement;
let unmount: () => void;

afterEach(() => {
  act(() => unmount());
  container.remove();
});

function SortableGrid({
  onSortChange,
}: {
  onSortChange: (sort: SortOrder) => void;
}) {
  const [sort, setSort] = useState<SortOrder | null>({
    column: 'id',
    direction: SortDirection.Asc,
  });

  return (
    <TableGrid
      fields={FIELDS}
      result={ROWS}
      primaryKeys={['id']}
      sort={sort}
      onSortChange={(next) => {
        onSortChange(next);
        setSort(next);
      }}
    />
  );
}

function render(element: ReactElement): void {
  container = document.createElement('div');
  document.body.append(container);

  const root = createRoot(container);
  unmount = () => root.unmount();

  act(() => {
    root.render(
      <ThemeProvider theme={DEFAULT_THEME}>
        <MemoryRouter>
          <DatabaseContext.Provider
            value={{ database: 'db', setDatabase: () => {} }}
          >
            <ForeignKeysContextProvider foreignKeys={[]}>
              <AllColumnsContextProvider allColumns={[]}>
                {element}
              </AllColumnsContextProvider>
            </ForeignKeysContextProvider>
          </DatabaseContext.Provider>
        </MemoryRouter>
      </ThemeProvider>
    );
  });
}

function header(name: string): HTMLTableCellElement {
  const cell = [...container.querySelectorAll('th')].find(
    (th) => th.textContent === name
  );

  if (!cell) {
    throw new Error(`No header "${name}"`);
  }

  return cell;
}

function click(name: string): void {
  act(() => {
    header(name).querySelector('button')?.click();
  });
}

describe('sorting', () => {
  test('ascending first, then each click on the same header flips it', () => {
    const onSortChange = vi.fn();
    render(<SortableGrid onSortChange={onSortChange} />);

    expect(header('id').getAttribute('aria-sort')).toBe('ascending');
    expect(header('name').hasAttribute('aria-sort')).toBe(false);

    click('name');
    click('name');
    click('name');

    expect(onSortChange.mock.calls).toEqual([
      [{ column: 'name', direction: SortDirection.Asc }],
      [{ column: 'name', direction: SortDirection.Desc }],
      [{ column: 'name', direction: SortDirection.Asc }],
    ]);
    expect(header('name').getAttribute('aria-sort')).toBe('ascending');
    expect(header('id').hasAttribute('aria-sort')).toBe(false);
  });

  test('a newly clicked column is sorted ascending, whatever the last direction', () => {
    const onSortChange = vi.fn();
    render(<SortableGrid onSortChange={onSortChange} />);

    click('id');
    expect(header('id').getAttribute('aria-sort')).toBe('descending');

    click('name');
    expect(onSortChange).toHaveBeenLastCalledWith({
      column: 'name',
      direction: SortDirection.Asc,
    });

    // TanStack would start a column of numbers descending
    click('name');
    click('id');
    expect(onSortChange).toHaveBeenLastCalledWith({
      column: 'id',
      direction: SortDirection.Asc,
    });
  });

  test('a grid given no `onSortChange` has no header to click', () => {
    render(<TableGrid fields={FIELDS} result={ROWS} primaryKeys={['id']} />);

    expect(container.querySelector('th button')).toBeNull();
  });
});
