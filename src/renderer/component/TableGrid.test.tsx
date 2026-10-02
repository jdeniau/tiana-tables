/**
 * @vitest-environment happy-dom
 */
import { type ReactElement, act, useState } from 'react';
import { type Atom, createAtom } from '@tanstack/react-store';
import type { RowSelectionState, SortingState } from '@tanstack/react-table';
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
import { DateDisplay } from '../../configuration/dateDisplay';
import { DEFAULT_THEME } from '../../configuration/themes';
import { AllColumnsContextProvider } from '../../contexts/AllColumnsContext';
import { DatabaseContext } from '../../contexts/DatabaseContext';
import { testables as dateDisplayTestables } from '../../contexts/DateDisplayContext';
import { ForeignKeysContextProvider } from '../../contexts/ForeignKeysContext';
import type { ColumnDetail } from '../../sql/dialect/metadata';
import { mysqlDialect } from '../../sql/dialect/mysql';
import { FieldKind } from '../../sql/resultField';
import {
  ConflictReason,
  type UpdateCellOutcome,
  UpdateCellStatus,
} from '../../sql/updateCell';
import { selectAllFromMenu } from '../selectAll';
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

// happy-dom lays nothing out, and the virtualizer mounts the rows that fit
// in the height of the scroller
function mountRows(): void {
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
  function columnDetail(name: string, nullable: boolean): ColumnDetail {
    return {
      table: 'items',
      name,
      nullable,
      generated: false,
      binary: false,
      json: false,
      allowedValues: [],
      multiValued: false,
    };
  }

  // `name` may hold NULL, `id` may not
  const SCHEMA = [columnDetail('id', false), columnDetail('name', true)];

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
    // only the write is called
    window.sql = { ...window.sql, updateCell };

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

  mountRows();

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

  test('copies the whole row', async () => {
    renderGrid();

    openMenu('b');
    // a submenu opens on hover, after antd's delay
    await act(async () => {
      document
        .querySelector('[role="menuitem"][aria-haspopup="true"]')
        ?.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }));
      await new Promise((resolve) => setTimeout(resolve, 300));
    });
    await choose('JSON');

    expect(writeText).toHaveBeenCalledWith(
      JSON.stringify({ id: 2, name: 'b' }, null, 2)
    );
  });

  test('opens the detail modal, as a double click does', async () => {
    renderGrid();

    openMenu('b');
    await choose('Edit…');

    expect(document.querySelector('.ant-modal-title')?.textContent).toBe(
      'name'
    );
  });

  test('offers to view what it cannot edit', () => {
    renderGrid({ primaryKeys: [] });

    openMenu('b');
    expect(menuItem('Edit…')).toBeUndefined();
    expect(menuItem('View…')).toBeDefined();
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

  describe('a write that meets a conflict', () => {
    function conflictModal(): HTMLElement | null {
      return (
        [...document.querySelectorAll<HTMLElement>('.ant-modal')].find(
          (modal) =>
            modal.textContent?.includes('The value changed in the database')
        ) ?? null
      );
    }

    function button(label: string): HTMLButtonElement | undefined {
      return [...(conflictModal()?.querySelectorAll('button') ?? [])].find(
        (candidate) => candidate.textContent === label
      );
    }

    async function setNullOnAChangedCell(
      onValueUpdated = vi.fn()
    ): Promise<void> {
      updateCell.mockResolvedValueOnce({
        status: UpdateCellStatus.Conflict,
        reason: ConflictReason.Changed,
        currentValue: 'changed elsewhere',
      });
      renderGrid({ onValueUpdated });

      openMenu('b');
      await choose('Set to NULL');
    }

    test('opens the conflict modal, with both values', async () => {
      const onValueUpdated = vi.fn();
      await setNullOnAChangedCell(onValueUpdated);

      const values = [
        ...(conflictModal()?.querySelectorAll('textarea') ?? []),
      ].map((textarea) => textarea.value);

      // the server's value, then ours: NULL, an empty text
      expect(values).toEqual(['changed elsewhere', '']);
      expect(onValueUpdated).not.toHaveBeenCalled();
    });

    test('overwrites it without the guard', async () => {
      const onValueUpdated = vi.fn();
      await setNullOnAChangedCell(onValueUpdated);

      await act(async () => {
        button('Overwrite')?.click();
      });

      expect(updateCell).toHaveBeenLastCalledWith(
        expect.objectContaining({ newValue: null, force: true })
      );
      expect(onValueUpdated).toHaveBeenCalledWith(1, 'name', null);
    });

    test('reopens on a row deleted before the overwrite', async () => {
      await setNullOnAChangedCell();
      updateCell.mockResolvedValueOnce({
        status: UpdateCellStatus.Conflict,
        reason: ConflictReason.Deleted,
      });

      await act(async () => {
        button('Overwrite')?.click();
      });

      expect(
        [...document.querySelectorAll('.ant-modal')].some(
          (modal) =>
            modal.textContent?.includes('The row no longer exists') &&
            !modal.classList.contains('ant-zoom-leave')
        )
      ).toBe(true);
    });

    test('cancelling keeps the server value, which the grid then shows', async () => {
      const onValueUpdated = vi.fn();
      await setNullOnAChangedCell(onValueUpdated);

      await act(async () => {
        button('Cancel my change')?.click();
      });

      expect(updateCell).toHaveBeenCalledTimes(1);
      expect(onValueUpdated).toHaveBeenCalledWith(
        1,
        'name',
        'changed elsewhere'
      );
    });
  });

  test('a conflict met by the detail modal closes it, and opens the conflict modal', async () => {
    updateCell.mockResolvedValueOnce({
      status: UpdateCellStatus.Conflict,
      reason: ConflictReason.Deleted,
    });
    renderGrid();

    openMenu('b');
    await choose('Edit…');
    await act(async () => {
      document
        .querySelector<HTMLInputElement>('.ant-modal input[type="checkbox"]')
        ?.click();
    });
    await act(async () => {
      [...document.querySelectorAll<HTMLButtonElement>('.ant-modal button')]
        .find((candidate) => candidate.textContent === 'Save')
        ?.click();
    });

    const modals = [...document.querySelectorAll('.ant-modal')];
    const detailModal = modals.find((modal) =>
      modal.textContent?.includes('Save')
    );
    const conflictModal = modals.find((modal) =>
      modal.textContent?.includes('The row no longer exists')
    );

    expect(updateCell).toHaveBeenCalledWith(
      expect.objectContaining({ newValue: null })
    );
    // antd keeps a closed modal mounted for its leave animation, which happy-dom never ends
    expect(detailModal?.classList.contains('ant-zoom-leave')).toBe(true);
    expect(conflictModal?.classList.contains('ant-zoom-leave')).toBe(false);
  });

  test('a SQL error of the menu opens the conflict modal on it', async () => {
    updateCell.mockRejectedValueOnce(new Error('Column cannot be null'));
    renderGrid();

    openMenu('b');
    await choose('Set to NULL');

    expect(
      [...document.querySelectorAll('.ant-modal')].some((modal) =>
        modal.textContent?.includes('Column cannot be null')
      )
    ).toBe(true);
  });
});

describe('the head of a date-time column', () => {
  const { DateDisplayContext } = dateDisplayTestables;
  const SERVER = {
    display: DateDisplay.Server,
    zoneLabel: 'UTC',
    disabled: false,
  };
  const LOCAL = {
    display: DateDisplay.Local,
    zoneLabel: 'Europe/Paris',
    disabled: false,
  };

  function heads(segments: Array<typeof SERVER>): string[] {
    render(
      <DateDisplayContext.Provider
        value={{
          display: DateDisplay.Local,
          segments,
          shift: null,
          serverZone: { label: 'UTC', zone: 'UTC' },
          setDisplay: () => {},
        }}
      >
        <TableGrid
          fields={[
            ...FIELDS,
            { name: 'at', kind: FieldKind.DateTime, table: 'items' },
            { name: 'day', kind: FieldKind.Date, table: 'items' },
          ]}
          result={[
            { id: 1, name: 'a', at: '2025-12-23 01:02:26', day: '2025-12-23' },
          ]}
          primaryKeys={['id']}
        />
      </DateDisplayContext.Provider>
    );

    return [...container.querySelectorAll('th')].map(
      (th) => th.textContent ?? ''
    );
  }

  // a `DATE` is never moved to another zone, so it names none
  test('names the zone shown when there is a choice', () => {
    expect(heads([SERVER, LOCAL])).toEqual(['id', 'name', 'atLocal', 'day']);
  });

  test('names nothing when every zone is the same one', () => {
    expect(heads([SERVER])).toEqual(['id', 'name', 'at', 'day']);
  });
});

describe('the primary key columns', () => {
  mountRows();

  /** the value a `var(--tg-…)` of the table holds */
  function resolve(value: string): string {
    const name = /^var\((.+)\)$/.exec(value)?.[1];

    return name
      ? (container.querySelector('table')?.style.getPropertyValue(name) ?? '')
      : value;
  }

  /** the heads and the cells of the first row, checked to line up */
  function columns(
    names: Array<string>,
    primaryKeys: Array<string>
  ): Array<[string | null, string | null]> {
    render(
      <TableGrid
        fields={names.map((name) => ({
          name,
          kind: FieldKind.String,
          table: 'tag_cart',
        }))}
        result={[Object.fromEntries(names.map((name) => [name, `${name}!`]))]}
        primaryKeys={primaryKeys}
      />
    );

    const heads = [...container.querySelectorAll('th')];
    const cells = [...container.querySelectorAll<HTMLElement>('tbody td')];

    return heads.map((th, index) => {
      expect(resolve(cells[index].style.width)).toBe(resolve(th.style.width));
      expect(resolve(cells[index].style.left)).toBe(resolve(th.style.left));

      return [th.textContent, cells[index].textContent];
    });
  }

  test('lead in the order of the table, whatever the order of the key', () => {
    expect(
      columns(['tag_id', 'cart_id', 'label'], ['cart_id', 'tag_id'])
    ).toEqual([
      ['tag_id', 'tag_id!'],
      ['cart_id', 'cart_id!'],
      ['label', 'label!'],
    ]);

    const heads = [...container.querySelectorAll('th')];

    expect(resolve(heads[0].style.left)).toBe('0px');
    expect(resolve(heads[1].style.left)).toBe(resolve(heads[0].style.width));
    expect(heads[2].style.left).toBe('');
  });

  test('lead when the table places them after another column', () => {
    expect(columns(['label', 'id'], ['id'])).toEqual([
      ['id', 'id!'],
      ['label', 'label!'],
    ]);
  });
});

describe('row selection', () => {
  mountRows();

  const THREE_ROWS = [
    { id: 1, name: 'a' },
    { id: 2, name: 'b' },
    { id: 3, name: 'c' },
  ];

  let showRows: (rows: typeof THREE_ROWS) => void;

  /** a grid whose rows the test can replace, as a cell write or a reload does */
  function Grid({
    primaryKeys,
    selectionAtom,
    sortingAtom,
  }: {
    primaryKeys?: Array<string>;
    selectionAtom?: Atom<RowSelectionState>;
    sortingAtom?: Atom<SortingState>;
  }): ReactElement {
    const [rows, setRows] = useState(THREE_ROWS);
    showRows = setRows;

    return (
      <TableGrid
        fields={FIELDS}
        result={rows}
        primaryKeys={primaryKeys}
        selectionAtom={selectionAtom}
        sortingAtom={sortingAtom}
      />
    );
  }

  function renderSelectable({
    primaryKeys = ['id'],
    sortingAtom,
  }: {
    primaryKeys?: Array<string>;
    sortingAtom?: Atom<SortingState>;
  } = {}): Atom<RowSelectionState> {
    const selectionAtom = createAtom<RowSelectionState>({});

    render(
      <Grid
        primaryKeys={primaryKeys}
        selectionAtom={selectionAtom}
        sortingAtom={sortingAtom}
      />
    );

    return selectionAtom;
  }

  function cellOf(name: string): HTMLTableCellElement {
    const found = [...container.querySelectorAll('td')].find(
      (td) => td.textContent === name
    );

    if (!found) {
      throw new Error(`No cell "${name}"`);
    }

    return found;
  }

  function clickCell(
    name: string,
    { shiftKey = false, ctrlKey = false, metaKey = false, detail = 1 } = {}
  ): void {
    const init = {
      bubbles: true,
      cancelable: true,
      shiftKey,
      ctrlKey,
      metaKey,
    };

    act(() => {
      cellOf(name).dispatchEvent(new MouseEvent('mousedown', init));
      cellOf(name).dispatchEvent(new MouseEvent('click', { ...init, detail }));
    });
  }

  function pressKey(key: string, { ctrlKey = false } = {}): KeyboardEvent {
    const event = new KeyboardEvent('keydown', {
      key,
      ctrlKey,
      bubbles: true,
      cancelable: true,
    });

    act(() => {
      container.querySelector('[tabindex="0"]')?.dispatchEvent(event);
    });

    return event;
  }

  /** the names of the rows drawn as selected */
  function shownSelected(): Array<string | null | undefined> {
    return [...container.querySelectorAll('tr[data-selected]')].map(
      (tr) => tr.querySelectorAll('td')[1]?.textContent
    );
  }

  afterEach(() => {
    window.getSelection()?.removeAllRanges();
  });

  test('a click selects the row alone, a second one deselects it', () => {
    const selectionAtom = renderSelectable();

    clickCell('a');
    clickCell('b');
    expect(selectionAtom.get()).toEqual({ 2: true });
    expect(shownSelected()).toEqual(['b']);

    clickCell('b');
    expect(selectionAtom.get()).toEqual({});
    expect(shownSelected()).toEqual([]);
  });

  test('Ctrl or Cmd adds a row, Shift selects the range from the last click', () => {
    const selectionAtom = renderSelectable();

    clickCell('a');
    clickCell('c', { metaKey: true });
    expect(shownSelected()).toEqual(['a', 'c']);

    clickCell('a', { ctrlKey: true });
    clickCell('b', { shiftKey: true });
    expect(selectionAtom.get()).toEqual({ 1: true, 2: true });
  });

  test('a modified click prevents the text selection of its mousedown', () => {
    renderSelectable();
    const mousedown = new MouseEvent('mousedown', {
      bubbles: true,
      cancelable: true,
      shiftKey: true,
    });

    act(() => {
      cellOf('a').dispatchEvent(mousedown);
    });

    expect(mousedown.defaultPrevented).toBe(true);
  });

  test('a text highlighted in the cell, or the second click of a double click, selects nothing', () => {
    const selectionAtom = renderSelectable();
    const range = document.createRange();
    range.selectNodeContents(cellOf('a'));
    window.getSelection()?.addRange(range);

    act(() => {
      cellOf('a').dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });
    expect(selectionAtom.get()).toEqual({});

    window.getSelection()?.removeAllRanges();
    clickCell('b');
    clickCell('b', { detail: 2 });
    expect(selectionAtom.get()).toEqual({ 2: true });
  });

  test('a double click on the only selected row leaves it selected', () => {
    const selectionAtom = renderSelectable();

    clickCell('b');
    clickCell('b');
    clickCell('b', { detail: 2 });
    act(() => {
      cellOf('b').dispatchEvent(new MouseEvent('dblclick', { bubbles: true }));
    });

    expect(selectionAtom.get()).toEqual({ 2: true });
  });

  test('Select All selects every row, unfocused; Escape, in the grid, none', () => {
    HTMLElement.prototype.checkVisibility = () => true;
    const selectionAtom = renderSelectable();

    act(() => selectAllFromMenu());
    expect(selectionAtom.get()).toEqual({ 1: true, 2: true, 3: true });

    pressKey('Escape');
    expect(selectionAtom.get()).toEqual({});
  });

  test('a secondary click selects its row, unless it is already selected', () => {
    window.clipboard = { readText: async () => '', writeText: async () => {} };
    const selectionAtom = renderSelectable();
    const openMenuOn = (name: string): void => {
      act(() => {
        cellOf(name).dispatchEvent(
          new MouseEvent('contextmenu', { bubbles: true, clientX: 10 })
        );
      });
    };

    openMenuOn('a');
    expect(selectionAtom.get()).toEqual({ 1: true });

    clickCell('b', { ctrlKey: true });
    openMenuOn('a');
    expect(selectionAtom.get()).toEqual({ 1: true, 2: true });
  });

  test('a row whose key changed is selected no more', () => {
    const selectionAtom = renderSelectable();

    clickCell('a');
    clickCell('b', { ctrlKey: true });
    act(() => {
      showRows([{ id: 1, name: 'a' }, { id: 20, name: 'b' }, THREE_ROWS[2]]);
    });

    expect(selectionAtom.get()).toEqual({ 1: true });
  });

  test('a new order selects nothing, and extends from no row', () => {
    const sortingAtom = createAtom<SortingState>([]);
    const selectionAtom = renderSelectable({ sortingAtom });

    clickCell('a');
    act(() => sortingAtom.set([{ id: 'name', desc: true }]));
    expect(selectionAtom.get()).toEqual({});

    clickCell('c', { shiftKey: true });
    expect(selectionAtom.get()).toEqual({ 3: true });
  });

  test('a grid given no atom selects nothing', () => {
    render(
      <TableGrid fields={FIELDS} result={THREE_ROWS} primaryKeys={['id']} />
    );

    clickCell('a');

    expect(shownSelected()).toEqual([]);
    expect(container.querySelector('[tabindex]')).toBeNull();
  });
});
