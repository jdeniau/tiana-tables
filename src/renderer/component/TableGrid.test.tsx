/**
 * @vitest-environment happy-dom
 */
import { type ReactElement, act } from 'react';
import { type Atom, createAtom } from '@tanstack/react-store';
import type { SortingState } from '@tanstack/react-table';
import { createRoot } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import { ThemeProvider } from 'styled-components';
import {
  afterAll,
  afterEach,
  beforeAll,
  describe,
  expect,
  test,
  vi,
} from 'vitest';
import { DEFAULT_THEME } from '../../configuration/themes';
import { AllColumnsContextProvider } from '../../contexts/AllColumnsContext';
import { DatabaseContext } from '../../contexts/DatabaseContext';
import { ForeignKeysContextProvider } from '../../contexts/ForeignKeysContext';
import type { ColumnDetail } from '../../sql/dialect/metadata';
import { mysqlDialect } from '../../sql/dialect/mysql';
import { FieldKind } from '../../sql/resultField';
import {
  ConflictReason,
  type UpdateCellOutcome,
  UpdateCellStatus,
} from '../../sql/updateCell';
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

function render(element: ReactElement, allColumns: ColumnDetail[] = []): void {
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
              <AllColumnsContextProvider allColumns={allColumns}>
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

describe('context menu', () => {
  // `name` may hold NULL, `id` may not
  const SCHEMA: ColumnDetail[] = [
    ['id', false],
    ['name', true],
  ].map(([name, nullable]) => ({
    table: 'items',
    name: name as string,
    nullable: nullable as boolean,
    generated: false,
    binary: false,
    json: false,
    allowedValues: [],
    multiValued: false,
  }));

  const writeText = vi.fn<(text: string) => Promise<void>>(async () => {});
  const updateCell = vi.fn(
    async (): Promise<UpdateCellOutcome> => ({
      status: UpdateCellStatus.Updated,
      value: null,
    })
  );

  function renderGrid({
    primaryKeys = ['id'],
    rows = ROWS,
    onValueUpdated = () => {},
  }: {
    primaryKeys?: Array<string>;
    rows?: typeof ROWS | Array<{ id: number; name: string | null }>;
    onValueUpdated?: (row: number, column: string, value: unknown) => void;
  } = {}): void {
    window.clipboard = { readText: async () => '', writeText };
    // @ts-expect-error -- only the write is called
    window.sql = { updateCell };

    render(
      <TableGrid
        fields={FIELDS}
        result={rows}
        primaryKeys={primaryKeys}
        onValueUpdated={onValueUpdated}
      />,
      SCHEMA
    );
  }

  function cell(text: string): HTMLTableCellElement {
    const found = [...container.querySelectorAll('td')].find(
      (td) => td.textContent === text
    );

    if (!found) {
      throw new Error(`No cell "${text}"`);
    }

    return found;
  }

  function openMenu(text: string): void {
    act(() => {
      cell(text).dispatchEvent(
        new MouseEvent('contextmenu', { bubbles: true, clientX: 10 })
      );
    });
  }

  function menuItem(label: string): HTMLElement | undefined {
    return [
      ...document.querySelectorAll<HTMLElement>('[role="menuitem"]'),
    ].find((item) => item.textContent === label);
  }

  async function choose(label: string): Promise<void> {
    await act(async () => {
      menuItem(label)?.click();
    });
  }

  // happy-dom lays nothing out, and the virtualizer mounts the rows that fit
  // in the height of the scroller
  const offsetHeight = Object.getOwnPropertyDescriptor(
    HTMLElement.prototype,
    'offsetHeight'
  );

  beforeAll(() => {
    Object.defineProperty(HTMLElement.prototype, 'offsetHeight', {
      configurable: true,
      get: () => 600,
    });
  });

  afterAll(() => {
    if (offsetHeight) {
      Object.defineProperty(
        HTMLElement.prototype,
        'offsetHeight',
        offsetHeight
      );
    }
  });

  afterEach(() => {
    writeText.mockClear();
    updateCell.mockClear();
  });

  test('copies the value of the cell', async () => {
    renderGrid();

    openMenu('b');
    await choose('Copy value');

    expect(writeText).toHaveBeenCalledWith('b');
  });

  test('sets a nullable cell to NULL, guarded on what was loaded', async () => {
    const onValueUpdated = vi.fn();
    renderGrid({ onValueUpdated });

    openMenu('b');
    await choose('Set to NULL');

    expect(updateCell).toHaveBeenCalledWith(
      expect.objectContaining({
        table: 'items',
        column: 'name',
        primaryKey: [{ column: 'id', value: 2 }],
        newValue: null,
        originalValue: 'b',
        force: false,
      })
    );
    expect(onValueUpdated).toHaveBeenCalledWith(1, 'name', null);
  });

  test('offers NULL only where the detail modal would save it', () => {
    renderGrid();

    // a NOT NULL column
    openMenu('2');
    expect(menuItem('Copy value')).toBeDefined();
    expect(menuItem('Set to NULL')).toBeUndefined();
  });

  test('offers no NULL on a row nothing identifies', () => {
    renderGrid({ primaryKeys: [] });

    openMenu('b');
    expect(menuItem('Set to NULL')).toBeUndefined();
  });

  test('a cell already NULL can be neither copied nor set to NULL', () => {
    renderGrid({ rows: [{ id: 1, name: null }] });

    openMenu('(NULL)');
    expect(menuItem('Copy value')?.getAttribute('aria-disabled')).toBe('true');
    expect(menuItem('Set to NULL')?.getAttribute('aria-disabled')).toBe('true');
  });

  test('a conflicting write opens the detail modal on it', async () => {
    updateCell.mockResolvedValueOnce({
      status: UpdateCellStatus.Conflict,
      reason: ConflictReason.Changed,
      currentValue: 'changed elsewhere',
    });
    const onValueUpdated = vi.fn();
    renderGrid({ onValueUpdated });

    openMenu('b');
    await choose('Set to NULL');

    expect(onValueUpdated).not.toHaveBeenCalled();
    expect(document.querySelector('.ant-modal')?.textContent).toContain(
      'changed elsewhere'
    );
  });
});
