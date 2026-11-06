/**
 * @vitest-environment happy-dom
 */
import { type ReactElement, act, useState } from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { type Atom, createAtom } from '@tanstack/react-store';
import type { RowSelectionState, SortingState } from '@tanstack/react-table';
import { createRoot } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import { ThemeProvider } from 'styled-components';
import { afterEach, describe, expect, test, vi } from 'vitest';
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
import { createQueryClient } from '../queryClient';
import { selectAllFromMenu } from '../selectAll';
import { columnNamesAtom } from './CellContextMenu/rowsCopyItem';
import TableGrid from './TableGrid';
import { NO_CURSOR, type RowCursor } from './gridSelectionGesture';
import { mountRows } from './mountRows.testing';

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
      <QueryClientProvider client={createQueryClient()}>
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
      </QueryClientProvider>
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
      hasJsonType: false,
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

    expect(await clipboardOf('text/plain')).toBe('b');
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
        .find((candidate) => candidate.textContent?.startsWith('Save'))
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

describe('while the rows are on their way', () => {
  test('the body is a skeleton under the heads, the key pinned', () => {
    render(
      <TableGrid fields={FIELDS} result={ROWS} loading primaryKeys={['name']} />
    );

    const heads = [...container.querySelectorAll('th')];
    const rows = container.querySelectorAll('tbody tr');
    const cells = [...rows[0].querySelectorAll<HTMLElement>('td')];

    expect(rows).toHaveLength(20);
    expect(container.querySelector('tbody')?.textContent).toBe('');
    expect(heads.map((th) => th.textContent)).toEqual(['name', 'id']);
    expect(cells.map((td) => td.style.width)).toEqual(
      heads.map((th) => th.style.width)
    );
    expect(cells.map((td) => td.style.left)).toEqual(
      heads.map((th) => th.style.left)
    );
  });

  test('says nothing of an empty result', () => {
    render(<TableGrid fields={FIELDS} result={[]} />);
    expect(container.textContent).toContain('No data');

    act(() => unmount());
    container.remove();

    render(<TableGrid fields={FIELDS} result={[]} loading />);
    expect(container.textContent).not.toContain('No data');
  });
});

describe('selection', () => {
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
    cursorAtom,
    panelOpenAtom,
  }: {
    primaryKeys?: Array<string>;
    selectionAtom?: Atom<RowSelectionState>;
    sortingAtom?: Atom<SortingState>;
    cursorAtom?: Atom<RowCursor>;
    panelOpenAtom?: Atom<boolean>;
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
        cursorAtom={cursorAtom}
        panelOpenAtom={panelOpenAtom}
      />
    );
  }

  function renderSelectable({
    primaryKeys = ['id'],
    sortingAtom,
    cursorAtom,
    panelOpenAtom,
  }: {
    primaryKeys?: Array<string>;
    sortingAtom?: Atom<SortingState>;
    cursorAtom?: Atom<RowCursor>;
    panelOpenAtom?: Atom<boolean>;
  } = {}): Atom<RowSelectionState> {
    const selectionAtom = createAtom<RowSelectionState>({});

    render(
      <Grid
        primaryKeys={primaryKeys}
        selectionAtom={selectionAtom}
        sortingAtom={sortingAtom}
        cursorAtom={cursorAtom}
        panelOpenAtom={panelOpenAtom}
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

  function pressKey(
    key: string,
    { ctrlKey = false, shiftKey = false } = {}
  ): KeyboardEvent {
    const event = new KeyboardEvent('keydown', {
      key,
      ctrlKey,
      shiftKey,
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

  /** the values of the cells drawn as selected, in reading order */
  function shownCells(): Array<string | null> {
    return [...container.querySelectorAll('td[data-selected]')].map(
      (td) => td.textContent
    );
  }

  afterEach(() => {
    window.getSelection()?.removeAllRanges();
  });

  test('a click selects the cell alone, a second one deselects it', () => {
    const selectionAtom = renderSelectable();

    clickCell('a');
    clickCell('b');
    expect(shownCells()).toEqual(['b']);
    expect(shownSelected()).toEqual([]);
    expect(selectionAtom.get()).toEqual({});

    clickCell('b');
    expect(shownCells()).toEqual([]);
  });

  test('Ctrl or Cmd adds a cell of any row, or removes it', () => {
    const selectionAtom = renderSelectable();

    clickCell('a');
    clickCell('3', { metaKey: true });
    clickCell('1', { ctrlKey: true });
    expect(shownCells()).toEqual(['1', 'a', '3']);
    expect(selectionAtom.get()).toEqual({});

    clickCell('a', { ctrlKey: true });
    expect(shownCells()).toEqual(['1', '3']);
  });

  test('Shift selects the rows from the last click, Ctrl then adds or removes a row, a click goes back to a cell', () => {
    const selectionAtom = renderSelectable();

    clickCell('a');
    clickCell('c', { shiftKey: true });
    expect(selectionAtom.get()).toEqual({ 1: true, 2: true, 3: true });
    expect(shownSelected()).toEqual(['a', 'b', 'c']);
    expect(shownCells()).toEqual([]);

    clickCell('b', { ctrlKey: true });
    expect(selectionAtom.get()).toEqual({ 1: true, 3: true });

    clickCell('b');
    expect(selectionAtom.get()).toEqual({});
    expect(shownCells()).toEqual(['b']);
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
    renderSelectable();
    const range = document.createRange();
    range.selectNodeContents(cellOf('a'));
    window.getSelection()?.addRange(range);

    act(() => {
      cellOf('a').dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });
    expect(shownCells()).toEqual([]);

    window.getSelection()?.removeAllRanges();
    clickCell('b');
    clickCell('b', { detail: 2 });
    expect(shownCells()).toEqual(['b']);
  });

  test('a double click on the only selected cell leaves it selected', () => {
    renderSelectable();

    clickCell('b');
    clickCell('b');
    clickCell('b', { detail: 2 });
    act(() => {
      cellOf('b').dispatchEvent(new MouseEvent('dblclick', { bubbles: true }));
    });

    expect(shownCells()).toEqual(['b']);
  });

  test('Select All selects every row, unfocused, and focuses the grid; Escape, in the grid, none', () => {
    HTMLElement.prototype.checkVisibility = () => true;
    const selectionAtom = renderSelectable();

    clickCell('a');
    act(() => selectAllFromMenu());
    expect(selectionAtom.get()).toEqual({ 1: true, 2: true, 3: true });
    expect(shownCells()).toEqual([]);
    // for Ctrl+C to copy them next
    expect(document.activeElement).toBe(
      container.querySelector('[tabindex="0"]')
    );

    pressKey('Escape');
    expect(selectionAtom.get()).toEqual({});
  });

  test('the arrows move the cell from the last click, Shift+↓ selects the rows from there', () => {
    const selectionAtom = renderSelectable();

    clickCell('a');
    const down = pressKey('ArrowDown');
    expect(shownCells()).toEqual(['b']);
    // or the grid would scroll as well
    expect(down.defaultPrevented).toBe(true);

    pressKey('ArrowLeft');
    expect(shownCells()).toEqual(['2']);
    pressKey('ArrowLeft');
    expect(shownCells()).toEqual(['2']);
    pressKey('ArrowRight');
    expect(shownCells()).toEqual(['b']);

    pressKey('ArrowDown', { shiftKey: true });
    expect(selectionAtom.get()).toEqual({ 2: true, 3: true });
    expect(shownCells()).toEqual([]);
  });

  test('an arrow from several cells moves the last one added, alone', () => {
    renderSelectable();

    clickCell('a');
    clickCell('3', { ctrlKey: true });
    pressKey('ArrowUp');
    expect(shownCells()).toEqual(['2']);
  });

  test('the arrows reach a row whose key is empty', () => {
    renderSelectable({ primaryKeys: ['name'] });
    act(() => {
      showRows([{ id: 1, name: '' }, THREE_ROWS[1], THREE_ROWS[2]]);
    });

    clickCell('2');
    pressKey('ArrowUp');
    expect(shownCells()).toEqual(['1']);
  });

  test('↓ and ↑ move a row selection, ← and → are left to the scroll', () => {
    const selectionAtom = renderSelectable();

    clickCell('a');
    clickCell('a', { shiftKey: true });
    pressKey('ArrowDown');
    expect(selectionAtom.get()).toEqual({ 2: true });

    const right = pressKey('ArrowRight');
    expect(selectionAtom.get()).toEqual({ 2: true });
    expect(right.defaultPrevented).toBe(false);

    pressKey('ArrowDown', { shiftKey: true });
    clickCell('a', { ctrlKey: true });
    pressKey('ArrowUp');
    expect(selectionAtom.get()).toEqual({ 1: true });
  });

  test('from no selection, ↓ selects the first row; Ctrl+↓ is left to the scroll', () => {
    const selectionAtom = renderSelectable();

    clickCell('b');
    pressKey('Escape');
    expect(shownCells()).toEqual([]);
    pressKey('ArrowDown');
    expect(selectionAtom.get()).toEqual({ 1: true });

    const ctrlDown = pressKey('ArrowDown', { ctrlKey: true });
    expect(selectionAtom.get()).toEqual({ 1: true });
    expect(ctrlDown.defaultPrevented).toBe(false);
  });

  test('a secondary click selects its cell, unless it is selected or in a selected row', () => {
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
    expect(shownCells()).toEqual(['a']);

    clickCell('b', { ctrlKey: true });
    openMenuOn('a');
    expect(shownCells()).toEqual(['a', 'b']);

    clickCell('c', { shiftKey: true });
    openMenuOn('3');
    expect(selectionAtom.get()).toEqual({ 2: true, 3: true });
    expect(shownCells()).toEqual([]);
  });

  test('a row whose key changed is selected no more, nor are its cells', () => {
    const selectionAtom = renderSelectable();

    clickCell('a');
    clickCell('b', { shiftKey: true });
    act(() => {
      showRows([{ id: 1, name: 'a' }, { id: 20, name: 'b' }, THREE_ROWS[2]]);
    });
    expect(selectionAtom.get()).toEqual({ 1: true });

    clickCell('a');
    clickCell('b', { ctrlKey: true });
    act(() => {
      showRows([{ id: 1, name: 'a' }, { id: 21, name: 'b' }, THREE_ROWS[2]]);
    });
    // its key written back, the row is no longer the one selected
    act(() => {
      showRows([{ id: 1, name: 'a' }, { id: 20, name: 'b' }, THREE_ROWS[2]]);
    });
    expect(shownCells()).toEqual(['a']);
  });

  test('a new order selects nothing, and extends from no row', () => {
    const sortingAtom = createAtom<SortingState>([]);
    const selectionAtom = renderSelectable({ sortingAtom });

    clickCell('a');
    act(() => sortingAtom.set([{ id: 'name', desc: true }]));
    expect(shownCells()).toEqual([]);

    clickCell('c', { shiftKey: true });
    expect(selectionAtom.get()).toEqual({});
    expect(shownCells()).toEqual(['c']);
  });

  test('a grid given no atom selects nothing', () => {
    render(
      <TableGrid fields={FIELDS} result={THREE_ROWS} primaryKeys={['id']} />
    );

    clickCell('a');

    expect(shownSelected()).toEqual([]);
    expect(shownCells()).toEqual([]);
    expect(container.querySelector('[tabindex]')).toBeNull();
  });

  describe('the eye of a row', () => {
    function renderWithPanel(
      sortingAtom?: Atom<SortingState>
    ): [Atom<RowSelectionState>, Atom<RowCursor>] {
      const cursorAtom = createAtom<RowCursor>(NO_CURSOR);
      const panelOpenAtom = createAtom(false);

      return [
        renderSelectable({ sortingAtom, cursorAtom, panelOpenAtom }),
        cursorAtom,
      ];
    }

    function clickEye(name: string): void {
      const eye = cellOf(name)
        .closest('tr')
        ?.querySelector<HTMLButtonElement>('.tg-eye-button');

      if (!eye) {
        throw new Error(`No eye on the row of "${name}"`);
      }

      act(() => eye.click());
    }

    /** the names of the rows whose eye is pressed: the row the panel shows */
    function pressedEyes(): Array<string | null | undefined> {
      return [...container.querySelectorAll('[aria-pressed="true"]')].map(
        (button) => button.closest('tr')?.querySelectorAll('td')[1]?.textContent
      );
    }

    test('shows its row alone selected, and gives the grid the keys', () => {
      const [selectionAtom] = renderWithPanel();

      // set from outside, which leaves the focus where it was
      act(() => selectionAtom.set({ 1: true }));
      clickEye('b');

      expect(pressedEyes()).toEqual(['b']);
      expect(selectionAtom.get()).toEqual({ 2: true });
      expect(document.activeElement).toBe(
        container.querySelector('[tabindex="0"]')
      );
    });

    test('shows a row of the selection as it stands, and moves the arrows from it', () => {
      const [selectionAtom, cursorAtom] = renderWithPanel();

      clickCell('a');
      clickCell('c', { shiftKey: true });
      clickEye('b');
      expect(selectionAtom.get()).toEqual({ 1: true, 2: true, 3: true });
      expect(pressedEyes()).toEqual(['b']);

      // as a chip of the panel picks a row
      act(() => cursorAtom.set({ ...cursorAtom.get(), leadId: '1' }));
      expect(pressedEyes()).toEqual(['a']);

      pressKey('ArrowDown');
      expect(pressedEyes()).toEqual(['b']);
    });

    test('the open panel follows the selection, and closes with it', () => {
      renderWithPanel();

      clickEye('a');
      pressKey('ArrowDown');
      expect(pressedEyes()).toEqual(['b']);

      clickCell('c');
      expect(pressedEyes()).toEqual(['c']);

      pressKey('Escape');
      expect(pressedEyes()).toEqual([]);

      // closed, not only empty
      clickCell('a');
      expect(pressedEyes()).toEqual([]);
    });

    test('Ctrl removing another row leaves the panel, and the arrows, on the row shown', () => {
      const [selectionAtom] = renderWithPanel();

      clickCell('a');
      clickCell('c', { shiftKey: true });
      clickEye('c');
      clickCell('a', { ctrlKey: true });
      expect(selectionAtom.get()).toEqual({ 2: true, 3: true });
      expect(pressedEyes()).toEqual(['c']);

      pressKey('ArrowUp');
      expect(selectionAtom.get()).toEqual({ 2: true });
    });

    test('Ctrl removing the row shown closes the panel', () => {
      renderWithPanel();

      clickCell('a');
      clickCell('c', { shiftKey: true });
      clickEye('b');
      clickCell('b', { ctrlKey: true });
      expect(pressedEyes()).toEqual([]);

      // closed, not only hidden
      clickCell('c', { ctrlKey: true });
      expect(pressedEyes()).toEqual([]);
    });

    test('a row shown whose key changed closes the panel', () => {
      renderWithPanel();

      clickCell('a');
      clickCell('c', { shiftKey: true });
      clickEye('b');
      act(() => {
        showRows([THREE_ROWS[0], { id: 20, name: 'b' }, THREE_ROWS[2]]);
      });
      expect(pressedEyes()).toEqual([]);

      clickCell('c', { shiftKey: true });
      expect(pressedEyes()).toEqual([]);
    });

    test('the open panel follows a cell, moved by a click or the arrows', () => {
      renderWithPanel();

      clickEye('a');
      clickCell('b');
      expect(pressedEyes()).toEqual(['b']);

      pressKey('ArrowDown');
      pressKey('ArrowLeft');
      expect(pressedEyes()).toEqual(['c']);

      clickCell('a', { ctrlKey: true });
      clickCell('3', { ctrlKey: true });
      expect(pressedEyes()).toEqual(['a']);
    });

    test('a click opens no panel', () => {
      renderWithPanel();

      clickCell('a');

      expect(pressedEyes()).toEqual([]);
    });

    test('the eye of the row shown closes the panel, and leaves the selection', () => {
      const [selectionAtom] = renderWithPanel();

      clickEye('a');
      clickEye('a');

      expect(pressedEyes()).toEqual([]);
      expect(selectionAtom.get()).toEqual({ 1: true });
    });

    test('a new order closes the panel', () => {
      const sortingAtom = createAtom<SortingState>([]);
      renderWithPanel(sortingAtom);

      clickEye('a');
      act(() => sortingAtom.set([{ id: 'name', desc: true }]));
      expect(pressedEyes()).toEqual([]);

      clickCell('b');
      expect(pressedEyes()).toEqual([]);
    });

    test('a grid given no atom for the panel has no eye', () => {
      renderSelectable();

      expect(container.querySelector('.tg-eye')).toBeNull();
    });
  });
});

describe('copying the selection', () => {
  mountRows();

  const ROWS_ABC = [
    { id: 1, name: 'a' },
    { id: 2, name: 'b' },
    { id: 3, name: 'c' },
  ];

  const onCopied = vi.fn();

  afterEach(() => {
    onCopied.mockClear();
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
        onCopied={onCopied}
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

  /** selects the rows of these cells: a click, a Shift+click on the first, then a Ctrl+click on each other */
  function selectRows(first: string, ...others: Array<string>): void {
    act(() => {
      cellOf(first).dispatchEvent(
        new MouseEvent('click', { bubbles: true, detail: 1 })
      );
      cellOf(first).dispatchEvent(
        new MouseEvent('click', { bubbles: true, detail: 1, shiftKey: true })
      );
      others.forEach((name) =>
        cellOf(name).dispatchEvent(
          new MouseEvent('click', { bubbles: true, detail: 1, ctrlKey: true })
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

  test('Ctrl+C copies the values of the selected cells, a line per row, with no column names', () => {
    renderCopyable();
    select('a', '3', '1');

    const event = pressCopy();

    expect(event.defaultPrevented).toBe(true);
    expect(event.clipboardData?.getData('text/plain')).toBe('1\ta\n3');
    expect(event.clipboardData?.getData('text/html')).toBe('');
    expect(onCopied).toHaveBeenCalledWith({ kind: 'values', valueCount: 3 });
  });

  test('Ctrl+C copies the selected rows as TSV, and as an HTML table beside', () => {
    renderCopyable();
    selectRows('a', 'c');

    const event = pressCopy();

    expect(event.defaultPrevented).toBe(true);
    expect(event.clipboardData?.getData('text/plain')).toBe(
      'id\tname\n1\ta\n3\tc'
    );
    expect(event.clipboardData?.getData('text/html')).toBe(
      '<table><thead><tr><th>id</th><th>name</th></tr></thead><tbody><tr><td>1</td><td>a</td></tr><tr><td>3</td><td>c</td></tr></tbody></table>'
    );
    expect(onCopied).toHaveBeenCalledWith({
      kind: 'rows',
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
    expect(onCopied).not.toHaveBeenCalled();
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

  test('the context menu copies the selected values, as Ctrl+C does', async () => {
    renderCopyable();
    select('a', 'c');

    act(() => {
      cellOf('c').dispatchEvent(
        new MouseEvent('contextmenu', { bubbles: true, clientX: 10 })
      );
    });
    expect(menuItem('Copy 2 values')?.textContent).toBe('Copy 2 values ctrl+C');
    await act(async () => menuItem('Copy 2 values')?.click());

    expect(await clipboardOf('text/plain')).toBe('a\nc');
    expect(onCopied).toHaveBeenCalledWith({ kind: 'values', valueCount: 2 });
  });

  test('the rows of the selected cells are copied from the context menu, Ctrl+C left to the values', async () => {
    renderCopyable();
    select('a', 'c');

    await openCopyMenu('c', 10);
    expect(menuItem('TSV')?.textContent).toBe('TSV');
    await act(async () => menuItem('CSV')?.click());

    expect(await clipboardOf('text/plain')).toBe('id,name\n1,a\n3,c');
  });

  test('the context menu copies them in the format chosen, the column names left out on demand', async () => {
    renderCopyable();
    selectRows('a', 'b');

    await openCopyMenu('b', 10);
    expect(menuItem('Copy 2 rows as')).toBeDefined();
    await act(async () => menuItem('JSON')?.click());

    expect(JSON.parse(await clipboardOf('text/plain'))).toEqual([
      { id: 1, name: 'a' },
      { id: 2, name: 'b' },
    ]);
    expect(onCopied).toHaveBeenCalledWith({
      kind: 'rows',
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
    selectRows('b');

    await openCopyMenu('b', 10, /^Copy row as/);

    expect(menuItem('Copy 1 row as')).toBeUndefined();
    expect(menuItem('TSV')?.textContent).toBe('TSV ctrl+C');

    await act(async () => menuItem('TSV')?.click());

    expect(await clipboardOf('text/plain')).toBe('id\tname\n2\tb');
    expect(await clipboardOf('text/html')).toContain('<td>b</td>');
    expect(onCopied).toHaveBeenCalledWith({
      kind: 'rows',
      rowCount: 1,
      format: 'tsv',
    });
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
        hasJsonType: false,
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

describe('deleting the selected rows', () => {
  mountRows();

  const ROWS_ABC = [
    { id: 1, name: 'a' },
    { id: 2, name: 'b' },
    { id: 3, name: 'c' },
  ];

  const onDeleteRows = vi.fn(async (): Promise<void> => {});

  afterEach(() => {
    onDeleteRows.mockReset();
    onDeleteRows.mockImplementation(async () => {});
  });

  function renderDeletable({
    primaryKeys = ['id'],
    deletable = true,
  }: { primaryKeys?: Array<string>; deletable?: boolean } = {}): void {
    window.clipboard = { readText: async () => '', writeText: async () => {} };

    render(
      <TableGrid
        fields={FIELDS}
        result={ROWS_ABC}
        primaryKeys={primaryKeys}
        selectionAtom={createAtom<RowSelectionState>({})}
        onDeleteRows={deletable ? onDeleteRows : undefined}
      />
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

  /** selects the rows of these cells: a click, a Shift+click on the first, then a Ctrl+click on each other */
  function selectRows(first: string, ...others: Array<string>): void {
    act(() => {
      cellOf(first).dispatchEvent(
        new MouseEvent('click', { bubbles: true, detail: 1 })
      );
      cellOf(first).dispatchEvent(
        new MouseEvent('click', { bubbles: true, detail: 1, shiftKey: true })
      );
      others.forEach((name) =>
        cellOf(name).dispatchEvent(
          new MouseEvent('click', { bubbles: true, detail: 1, ctrlKey: true })
        )
      );
    });
  }

  function openMenu(name: string): void {
    act(() => {
      cellOf(name).dispatchEvent(
        new MouseEvent('contextmenu', { bubbles: true, clientX: 10 })
      );
    });
  }

  function menuItem(label: string): HTMLElement | undefined {
    return [
      ...document.querySelectorAll<HTMLElement>('[role="menuitem"]'),
    ].find((item) => item.textContent?.startsWith(label));
  }

  function pressDelete({ shiftKey = false } = {}): void {
    act(() => {
      container.querySelector('[tabindex="0"]')?.dispatchEvent(
        new KeyboardEvent('keydown', {
          key: 'Delete',
          shiftKey,
          bubbles: true,
          cancelable: true,
        })
      );
    });
  }

  function confirmation(): HTMLElement | undefined {
    return [...document.querySelectorAll<HTMLElement>('.ant-modal')].find(
      (modal) => /Delete th(is|ese)/.test(modal.textContent ?? '')
    );
  }

  async function press(label: string): Promise<void> {
    await act(async () => {
      [...(confirmation()?.querySelectorAll('button') ?? [])]
        .find((button) => button.textContent === label)
        ?.click();
    });
  }

  test('the context menu deletes the selected rows, once confirmed', async () => {
    renderDeletable();
    selectRows('a', 'c');

    openMenu('c');
    expect(menuItem('Delete 2 rows…')?.textContent).toBe('Delete 2 rows…Del');
    await act(async () => menuItem('Delete 2 rows…')?.click());

    expect(confirmation()?.textContent).toContain('Delete these 2 rows?');
    expect(onDeleteRows).not.toHaveBeenCalled();

    await press('Delete');

    expect(onDeleteRows).toHaveBeenCalledExactlyOnceWith([
      [{ column: 'id', value: 1 }],
      [{ column: 'id', value: 3 }],
    ]);
  });

  test('the context menu deletes the rows of the selected cells; the Delete key does not', () => {
    renderDeletable();
    select('a', 'c');

    openMenu('c');
    expect(menuItem('Delete 2 rows…')?.textContent).toBe('Delete 2 rows…');

    pressDelete();
    expect(confirmation()).toBeUndefined();
  });

  test('the Delete key on the focused grid asks first, and Cancel deletes nothing', async () => {
    renderDeletable();
    selectRows('b');

    pressDelete({ shiftKey: true });
    expect(confirmation()).toBeUndefined();

    pressDelete();
    expect(confirmation()?.textContent).toContain('Delete this row?');

    await press('Cancel');

    expect(onDeleteRows).not.toHaveBeenCalled();
  });

  test('an error of the server stays in the confirmation', async () => {
    onDeleteRows.mockRejectedValueOnce(
      Object.assign(new Error('Cannot delete a parent row'), {
        code: 'ER_ROW_IS_REFERENCED_2',
      })
    );
    renderDeletable();
    selectRows('b');
    pressDelete();

    await press('Delete');

    expect(confirmation()?.textContent).toContain('Cannot delete a parent row');
  });

  test.each([
    ['a table with no primary key', { primaryKeys: [] }],
    ['a grid that deletes nothing', { deletable: false }],
  ])('%s offers no deletion', (_label, options) => {
    renderDeletable(options);
    selectRows('b');

    openMenu('b');
    expect(menuItem('Copy value')).toBeDefined();
    expect(menuItem('Delete')).toBeUndefined();

    pressDelete();
    expect(confirmation()).toBeUndefined();
  });
});

describe('setting the selected cells to NULL', () => {
  mountRows();

  const ROWS_ABC = [
    { id: 1, name: 'a' },
    { id: 2, name: 'b' },
    { id: 3, name: 'c' },
  ];

  // `name` may hold NULL, `id` may not
  const SCHEMA: Array<ColumnDetail> = ['id', 'name'].map((name) => ({
    table: 'items',
    name,
    nullable: name === 'name',
    generated: false,
    binary: false,
    hasJsonType: false,
    allowedValues: [],
    multiValued: false,
  }));

  const updateCell = vi.fn(async (): Promise<UpdateCellOutcome> => ({
    status: UpdateCellStatus.Updated,
    value: null,
  }));

  afterEach(() => {
    updateCell.mockClear();
  });

  function renderNullable(
    rows: Array<{ id: number; name: string | null }> = ROWS_ABC
  ): void {
    window.clipboard = { readText: async () => '', writeText: async () => {} };
    window.sql = { ...window.sql, updateCell };

    render(
      <TableGrid
        fields={FIELDS}
        result={rows}
        primaryKeys={['id']}
        selectionAtom={createAtom<RowSelectionState>({})}
        onValueUpdated={() => {}}
      />,
      SCHEMA
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

  async function pressDelete(): Promise<void> {
    await act(async () => {
      container.querySelector('[tabindex="0"]')?.dispatchEvent(
        new KeyboardEvent('keydown', {
          key: 'Delete',
          bubbles: true,
          cancelable: true,
        })
      );
    });
  }

  function confirmation(): HTMLElement | undefined {
    return [...document.querySelectorAll<HTMLElement>('.ant-modal')].find(
      (modal) =>
        /to NULL\?/.test(modal.textContent ?? '') &&
        !modal.classList.contains('ant-zoom-leave')
    );
  }

  function menuItem(label: string): HTMLElement | undefined {
    return [
      ...document.querySelectorAll<HTMLElement>('[role="menuitem"]'),
    ].find((item) => item.textContent?.startsWith(label));
  }

  test('the Delete key sets a single cell to NULL at once', async () => {
    renderNullable();
    select('b');

    await pressDelete();

    expect(confirmation()).toBeUndefined();
    expect(updateCell.mock.calls).toEqual([
      [
        expect.objectContaining({
          column: 'name',
          primaryKey: [{ column: 'id', value: 2 }],
          originalValue: 'b',
          newValue: null,
          force: false,
        }),
      ],
    ]);
  });

  test('the Delete key asks first for several cells, and writes those that can be NULL, in order', async () => {
    renderNullable();
    select('c', '2', 'a');

    await pressDelete();
    expect(confirmation()?.textContent).toContain(
      'Set these 2 values to NULL?'
    );
    expect(updateCell).not.toHaveBeenCalled();

    await act(async () => {
      [...(confirmation()?.querySelectorAll('button') ?? [])]
        .find((button) => button.textContent === 'Set to NULL')
        ?.click();
    });

    expect(updateCell.mock.calls).toEqual([
      [expect.objectContaining({ originalValue: 'a', newValue: null })],
      [expect.objectContaining({ originalValue: 'c', newValue: null })],
    ]);
  });

  test('a cell already NULL is left out of the count and of the writes', async () => {
    renderNullable([
      { id: 1, name: 'a' },
      { id: 2, name: null },
      { id: 3, name: 'c' },
    ]);
    select('a', '(NULL)', 'c');

    await pressDelete();
    expect(confirmation()?.textContent).toContain(
      'Set these 2 values to NULL?'
    );

    await act(async () => {
      [...(confirmation()?.querySelectorAll('button') ?? [])]
        .find((button) => button.textContent === 'Set to NULL')
        ?.click();
    });

    expect(updateCell.mock.calls).toEqual([
      [expect.objectContaining({ originalValue: 'a' })],
      [expect.objectContaining({ originalValue: 'c' })],
    ]);
  });

  test('a write that does not land stops the next ones, and opens the conflict modal', async () => {
    updateCell.mockResolvedValueOnce({
      status: UpdateCellStatus.Conflict,
      reason: ConflictReason.Deleted,
    });
    renderNullable();
    select('a', 'c');

    await pressDelete();
    await act(async () => {
      [...(confirmation()?.querySelectorAll('button') ?? [])]
        .find((button) => button.textContent === 'Set to NULL')
        ?.click();
    });

    expect(updateCell).toHaveBeenCalledTimes(1);
    expect(
      [...document.querySelectorAll('.ant-modal')].some((modal) =>
        modal.textContent?.includes('The row no longer exists')
      )
    ).toBe(true);
  });

  test('the context menu sets the selected cells to NULL, as the Delete key does', async () => {
    renderNullable();
    select('a', 'c');

    act(() => {
      cellOf('c').dispatchEvent(
        new MouseEvent('contextmenu', { bubbles: true, clientX: 10 })
      );
    });

    expect(menuItem('Set 2 values to NULL…')?.textContent).toBe(
      'Set 2 values to NULL…Del'
    );

    await act(async () => menuItem('Set 2 values to NULL…')?.click());
    expect(confirmation()?.textContent).toContain(
      'Set these 2 values to NULL?'
    );
  });

  test('on selected rows, the context menu sets its own cell to NULL, and Delete no cell', async () => {
    renderNullable();
    select('a');
    act(() => {
      cellOf('a').dispatchEvent(
        new MouseEvent('click', { bubbles: true, detail: 1, shiftKey: true })
      );
    });

    act(() => {
      cellOf('a').dispatchEvent(
        new MouseEvent('contextmenu', { bubbles: true, clientX: 10 })
      );
    });
    expect(menuItem('Set to NULL')?.textContent).toBe('Set to NULL');

    await pressDelete();
    expect(updateCell).not.toHaveBeenCalled();
  });
});
