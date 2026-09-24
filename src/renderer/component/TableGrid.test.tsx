/**
 * @vitest-environment happy-dom
 */
import { type ReactElement, act } from 'react';
import { type Atom, createAtom } from '@tanstack/react-store';
import type { SortingState } from '@tanstack/react-table';
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

function renderSortable(): Atom<SortingState> {
  const sortingAtom = createAtom<SortingState>([]);

  render(
    <TableGrid
      fields={FIELDS}
      result={ROWS}
      primaryKeys={['id']}
      sortingAtom={sortingAtom}
    />
  );

  return sortingAtom;
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
  // a sortable head holds its label in a span, next to the caret and the rank
  const cell = [...container.querySelectorAll('th')].find(
    (th) => (th.querySelector('button > span') ?? th).textContent === name
  );

  if (!cell) {
    throw new Error(`No header "${name}"`);
  }

  return cell;
}

function click(name: string, { shiftKey = false } = {}): void {
  act(() => {
    header(name)
      .querySelector('button')
      ?.dispatchEvent(new MouseEvent('click', { bubbles: true, shiftKey }));
  });
}

/** what the head shows after its label: the caret, then the rank when several columns sort */
function mark(name: string): string {
  const button = header(name).querySelector('button');
  const caret = button?.querySelector('[aria-label="caret-up"]')
    ? '▲'
    : button?.querySelector('[aria-label="caret-down"]')
      ? '▼'
      : '';

  return (
    caret +
    (button?.lastChild?.nodeType === Node.TEXT_NODE
      ? button.lastChild.textContent
      : '')
  );
}

describe('sorting', () => {
  test('ascending, then descending, then back to no sort', () => {
    const sortingAtom = renderSortable();
    const written: Array<SortingState> = [];
    sortingAtom.subscribe((sorting) => written.push(sorting));

    click('name');
    expect(header('name').getAttribute('aria-sort')).toBe('ascending');
    expect(mark('name')).toBe('▲');

    click('name');
    expect(mark('name')).toBe('▼');

    click('name');
    expect(written).toEqual([
      [{ id: 'name', desc: false }],
      [{ id: 'name', desc: true }],
      [],
    ]);
    expect(header('name').hasAttribute('aria-sort')).toBe(false);
    expect(mark('name')).toBe('');
  });

  test('a plain click on another column sorts by it alone, ascending', () => {
    const sortingAtom = renderSortable();

    click('name');
    click('name');
    // TanStack would start a column of numbers descending
    click('id');

    expect(sortingAtom.get()).toEqual([{ id: 'id', desc: false }]);
  });

  test('Shift adds a column to the order, and ranks the heads', () => {
    const sortingAtom = renderSortable();

    click('name');
    click('id', { shiftKey: true });

    expect(sortingAtom.get()).toEqual([
      { id: 'name', desc: false },
      { id: 'id', desc: false },
    ]);
    expect(mark('name')).toBe('▲1');
    expect(mark('id')).toBe('▲2');
    expect(header('name').getAttribute('aria-sort')).toBe('ascending');
    expect(header('id').hasAttribute('aria-sort')).toBe(false);

    click('id', { shiftKey: true });
    click('id', { shiftKey: true });

    expect(sortingAtom.get()).toEqual([{ id: 'name', desc: false }]);
    expect(mark('name')).toBe('▲');
  });

  test('a grid given no atom has no header to click', () => {
    render(<TableGrid fields={FIELDS} result={ROWS} primaryKeys={['id']} />);

    expect(container.querySelector('th button')).toBeNull();
  });

  test('a disabled sort neither clicks nor marks its column', () => {
    render(
      <TableGrid
        fields={FIELDS}
        result={ROWS}
        primaryKeys={['id']}
        sortingAtom={createAtom<SortingState>([{ id: 'id', desc: false }])}
        enableSorting={false}
      />
    );

    expect(container.querySelector('th button')).toBeNull();
    expect(header('id').hasAttribute('aria-sort')).toBe(false);
  });
});
