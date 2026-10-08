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
import { columnNamesAtom } from './CellContextMenu/rowsCopyItem';
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
          <DatabaseContext value={{ database: 'db', setDatabase: () => {} }}>
            <ForeignKeysContextProvider foreignKeys={[]} database="db">
              <AllColumnsContextProvider allColumns={allColumns}>
                {element}
              </AllColumnsContextProvider>
            </ForeignKeysContextProvider>
          </DatabaseContext>
        </MemoryRouter>
      </ThemeProvider>
    );
  });
}

/** what a menu entry wrote to the clipboard, in one of its types */
async function clipboardOf(type: string): Promise<string> {
  const [item] = await navigator.clipboard.read();

  return item ? (await item.getType(type)).text() : '';
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
  const updateCell = vi.fn(async (): Promise<UpdateCellOutcome> => ({
    status: UpdateCellStatus.Updated,
    value: null,
  }));

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

    expect(JSON.parse(await clipboardOf('text/plain'))).toEqual({
      id: 2,
      name: 'b',
    });
  });

  test('opens the detail modal, as a double click does', async () => {
    renderGrid();

    openMenu('b');
    await choose('Edit…Double-click');

    expect(document.querySelector('.ant-modal-title')?.textContent).toBe(
      'name'
    );
  });

  test('offers to view what it cannot edit, by the double click as well', () => {
    renderGrid({ primaryKeys: [] });

    openMenu('b');
    expect(menuItem('Edit…Double-click')).toBeUndefined();
    expect(menuItem('View…Double-click')).toBeDefined();
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
    await choose('Edit…Double-click');
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
      <DateDisplayContext
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
      </DateDisplayContext>
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
      // the head asks TanStack, the body its own `columnsMeta`
      expect(cells[index].dataset.lastPinned).toBe(th.dataset.lastPinned);

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
    expect(heads.map((th) => th.dataset.lastPinned)).toEqual([
      undefined,
      'true',
      undefined,
    ]);
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

  test('Select All selects every row, unfocused, and focuses the grid; Escape, in the grid, none', () => {
    HTMLElement.prototype.checkVisibility = () => true;
    const selectionAtom = renderSelectable();

    act(() => selectAllFromMenu());
    expect(selectionAtom.get()).toEqual({ 1: true, 2: true, 3: true });
    // for Ctrl+C to copy them next
    expect(document.activeElement).toBe(
      container.querySelector('[tabindex="0"]')
    );

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

describe('copying the selected rows', () => {
  mountRows();

  const ROWS_ABC = [
    { id: 1, name: 'a' },
    { id: 2, name: 'b' },
    { id: 3, name: 'c' },
  ];

  const onRowsCopied = vi.fn();

  afterEach(() => {
    onRowsCopied.mockClear();
    columnNamesAtom.set(true);
    window.getSelection()?.removeAllRanges();
  });

  function renderCopyable(allColumns: ColumnDetail[] = []): void {
    window.clipboard = { readText: async () => '', writeText: async () => {} };

    render(
      <TableGrid
        fields={FIELDS}
        result={ROWS_ABC}
        primaryKeys={['id']}
        selectionAtom={createAtom<RowSelectionState>({})}
        onRowsCopied={onRowsCopied}
      />,
      allColumns
    );
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

  function select(...names: Array<string>): void {
    act(() => {
      names.forEach((name, index) =>
        cellOf(name).dispatchEvent(
          new MouseEvent('click', {
            bubbles: true,
            detail: 1,
            ctrlKey: index > 0,
          })
        )
      );
    });
  }

  /** a Ctrl+C on the focused grid: Chromium's copy event, on the grid */
  function pressCopy(): ClipboardEvent {
    const event = new ClipboardEvent('copy', {
      clipboardData: new DataTransfer(),
      bubbles: true,
      cancelable: true,
    });

    act(() => {
      cellOf('a').dispatchEvent(event);
    });

    return event;
  }

  function menuItem(label: string): HTMLElement | undefined {
    return [
      ...document.querySelectorAll<HTMLElement>('[role="menuitem"]'),
    ].find((item) => item.textContent?.startsWith(label));
  }

  test('Ctrl+C copies them as TSV, and as an HTML table beside', () => {
    renderCopyable();
    select('a', 'c');

    const event = pressCopy();

    expect(event.defaultPrevented).toBe(true);
    expect(event.clipboardData?.getData('text/plain')).toBe(
      'id\tname\n1\ta\n3\tc'
    );
    expect(event.clipboardData?.getData('text/html')).toBe(
      '<table><thead><tr><th>id</th><th>name</th></tr></thead><tbody><tr><td>1</td><td>a</td></tr><tr><td>3</td><td>c</td></tr></tbody></table>'
    );
    expect(onRowsCopied).toHaveBeenCalledWith({
      rowCount: 2,
      format: 'tsv',
    });
  });

  test('Ctrl+C leaves a text highlighted in a cell, or no selection, to the native copy', () => {
    renderCopyable();

    expect(pressCopy().defaultPrevented).toBe(false);

    select('a');
    const range = document.createRange();
    range.selectNodeContents(cellOf('b'));
    window.getSelection()?.addRange(range);

    expect(pressCopy().defaultPrevented).toBe(false);
    expect(onRowsCopied).not.toHaveBeenCalled();
  });

  /** opens the context menu on a cell, then one of its copy submenus, after antd's hover delay */
  async function openCopyMenu(
    name: string,
    clientX: number,
    submenu: RegExp = /^Copy \d+ rows as/
  ): Promise<void> {
    act(() => {
      cellOf(name).dispatchEvent(
        new MouseEvent('contextmenu', { bubbles: true, clientX })
      );
    });
    act(() => {
      [...document.querySelectorAll('[role="menuitem"][aria-haspopup="true"]')]
        .find((item) => submenu.test(item.textContent ?? ''))
        ?.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }));
    });

    // however long the hover delay takes on a loaded machine
    for (let wait = 0; wait < 100 && !menuItem('Column names'); wait++) {
      await act(() => new Promise((resolve) => setTimeout(resolve, 50)));
    }
  }

  test('the context menu copies them in the format chosen, the column names left out on demand', async () => {
    renderCopyable();
    select('a', 'b');

    await openCopyMenu('b', 10);
    expect(menuItem('Copy 2 rows as')).toBeDefined();
    await act(async () => menuItem('JSON')?.click());

    expect(JSON.parse(await clipboardOf('text/plain'))).toEqual([
      { id: 1, name: 'a' },
      { id: 2, name: 'b' },
    ]);
    expect(onRowsCopied).toHaveBeenCalledWith({
      rowCount: 2,
      format: 'json',
    });

    await openCopyMenu('b', 20);
    await act(async () => menuItem('Column names')?.click());

    // the toggle keeps its submenu open
    expect(menuItem('Copy 2 rows as')?.getAttribute('aria-expanded')).toBe(
      'true'
    );

    await act(async () => menuItem('CSV')?.click());

    expect(await clipboardOf('text/plain')).toBe('1,a\n2,b');
  });

  test('a single selected row is the row of the menu, offered once', async () => {
    renderCopyable();
    select('b');

    await openCopyMenu('b', 10, /^Copy row as/);

    expect(menuItem('Copy 1 row as')).toBeUndefined();

    await act(async () => menuItem('TSV')?.click());

    expect(await clipboardOf('text/plain')).toBe('id\tname\n2\tb');
    expect(await clipboardOf('text/html')).toContain('<td>b</td>');
    expect(onRowsCopied).toHaveBeenCalledWith({ rowCount: 1, format: 'tsv' });
  });

  test('an INSERT is offered only for the columns of a table the schema knows', async () => {
    renderCopyable();
    select('a');
    await openCopyMenu('a', 10, /^Copy row as/);
    expect(menuItem('SQL INSERT')?.getAttribute('aria-disabled')).toBe('true');

    act(() => unmount());
    container.remove();

    renderCopyable(
      ['id', 'name'].map((name) => ({
        table: 'items',
        name,
        nullable: false,
        generated: false,
        binary: false,
        json: false,
        allowedValues: [],
        multiValued: false,
      }))
    );
    select('a');
    await openCopyMenu('a', 10, /^Copy row as/);
    expect(menuItem('SQL INSERT')?.getAttribute('aria-disabled')).not.toBe(
      'true'
    );
  });
});
