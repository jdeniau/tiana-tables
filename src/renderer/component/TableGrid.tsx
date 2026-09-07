import { ReactElement, memo, useCallback, useMemo, useState } from 'react';
import {
  columnOrderingFeature,
  columnPinningFeature,
  columnSizingFeature,
  createColumnHelper,
  tableFeatures,
  useTable,
} from '@tanstack/react-table';
import type { ReactTable, Row as TanstackRow } from '@tanstack/react-table';
import { useVirtualizer } from '@tanstack/react-virtual';
import { Empty } from 'antd';
import type { FieldPacket, RowDataPacket } from 'mysql2/promise';
import { styled } from 'styled-components';
import invariant from 'tiny-invariant';
import { useAllColumnsContext } from '../../contexts/AllColumnsContext';
import { useDatabaseContext } from '../../contexts/DatabaseContext';
import { useForeignKeysContext } from '../../contexts/ForeignKeysContext';
import { isJsonColumn } from '../../sql/columnEditing';
import type { ColumnDetail } from '../../sql/types';
import type { PrimaryKeyPart } from '../../sql/updateCell';
import {
  background,
  commentForeground,
  selection,
  size,
  space,
} from '../theme';
import Cell, { isNumericType } from './Cell';
import CellContextMenu, { CellFilterTarget } from './CellContextMenu';
import CellDetailModal, { CellDetail, SaveCellParams } from './CellDetailModal';
import { toBoundValue } from './CellEditor/editableValue';
import ForeignKeyLink from './ForeignKeyLink';

const features = tableFeatures({
  // columnOrderingFeature provides `getIsLastColumn`, used to draw the shadow
  // on the edge of the pinned region
  columnOrderingFeature,
  columnPinningFeature,
  columnSizingFeature,
});

// matches the previous antd `scroll.x = 150 * fields.length` sizing
const DEFAULT_COLUMN_WIDTH = 150;
const ROW_HEIGHT = parseInt(size.row, 10);

const EMPTY_DATA: RowDataPacket[] = [];

interface TableGridProps<R extends RowDataPacket> {
  rowsAsArray?: boolean;
  result: null | R[];
  fields: null | FieldPacket[];
  primaryKeys?: Array<string>;
  /**
   * Called once a cell has been written, with the value the server now holds.
   * The owner of `result` patches the row with it — without this the grid keeps
   * showing what was loaded, and cells are read-only.
   */
  onValueUpdated?: (
    rowIndex: number,
    columnName: string,
    value: unknown
  ) => void;
  /**
   * Called with the `WHERE` clause a secondary click built, which replaces the
   * current filter. Providing it is what gives the grid its context menu: a raw
   * query result has no filter to feed.
   */
  onFilterChange?: (where: string) => void;
}

/**
 * What identifies the row of a cell, or `null` when no primary key does.
 *
 * The values go back as they were read, with no conversion: a `PRIMARY KEY`
 * column is `NOT NULL` and holds a scalar the driver answers with as a number,
 * a string or a `Date` — all three of which mysql2 binds back. A `BINARY` key
 * would be the exception, arriving as bytes, but such a table does not reach
 * this point: the grid renders that column through `StringCell`, which hands
 * the bytes straight to React. Nothing to guard against here.
 */
function buildRowKey(
  row: RowDataPacket,
  primaryKeys: Array<string> | undefined
): Array<PrimaryKeyPart> | null {
  if (!primaryKeys || primaryKeys.length === 0) {
    return null;
  }

  return primaryKeys.map((column) => ({ column, value: row[column] }));
}

/**
 * PERFORMANCE NOTE: the virtualized body is the hot path of this component —
 * scrolling vertically MOUNTS new rows continuously (memo only prevents
 * re-renders, not mounts). Row and cell shells are plain DOM elements styled
 * with static .tg-* classes (declared once on ScrollContainer), and per-cell
 * work (FK detection, pinning offsets) is precomputed per column in
 * `columnsMeta`. Inside cells, React components are fine (GridCell/Cell,
 * measured free) but antd components are forbidden (antd Flex alone doubled
 * the mount cost) and every *extra element* mounted per cell costs (~+15% for
 * one more styled span). Chained `styled(...)` variants are free: they fold
 * into the single element they style. See the CLAUDE.md gotcha for the
 * benchmark details.
 */
function TableGrid<Row extends RowDataPacket>({
  fields,
  result,
  primaryKeys,
  rowsAsArray = false,
  onValueUpdated,
  onFilterChange,
}: TableGridProps<Row>): ReactElement {
  // store the scroll element in a state (not a ref): the virtualizer reads it
  // in a layout effect that runs before the parent ref is attached, so a ref
  // would stay null until an unrelated re-render happens
  const [scrollElement, setScrollElement] = useState<HTMLDivElement | null>(
    null
  );

  // the value shown by the detail modal, `null` when it is closed
  const [cellDetail, setCellDetail] = useState<CellDetail | null>(null);

  // the cell the context menu is open on, `null` when it is closed
  const [filterTarget, setFilterTarget] = useState<CellFilterTarget | null>(
    null
  );

  // a stable reference either way, so that the `memo` of `BodyRow` still holds
  const onCellContextMenu = onFilterChange ? setFilterTarget : undefined;

  const foreignKeys = useForeignKeysContext();
  const allColumns = useAllColumnsContext();
  const { database } = useDatabaseContext();

  const saveCell = useCallback(
    async ({ detail, newValue, originalValue, force }: SaveCellParams) => {
      const { rowKey, column } = detail;

      invariant(database, 'A database must be selected to write a cell');
      invariant(rowKey, 'A cell of an unidentified row cannot be written');
      invariant(column.tableName, 'A cell of no table cannot be written');

      const outcome = await window.sql.updateCell({
        database,
        table: column.tableName,
        column: column.name,
        primaryKey: rowKey,
        newValue,
        originalValue: toBoundValue(originalValue),
        isJsonColumn: column.detail ? isJsonColumn(column.detail) : false,
        force,
      });

      if (outcome.status === 'updated') {
        onValueUpdated?.(detail.rowIndex, column.name, outcome.value);
      }

      return outcome;
    },
    [database, onValueUpdated]
  );

  const columns = useMemo(() => {
    const columnHelper = createColumnHelper<typeof features, Row>();

    return columnHelper.columns(
      (fields ?? []).map((field, index) =>
        columnHelper.accessor(
          (row: Row) =>
            rowsAsArray
              ? (row as unknown as Array<unknown>)[index]
              : row[field.name],
          {
            // raw SQL results can contain duplicated column names: suffix with
            // the index to keep ids unique (browsing mode keeps plain names so
            // that column pinning can match primary key names)
            id: rowsAsArray ? `${index}:${field.name}` : field.name,
            header: field.name,
            size: DEFAULT_COLUMN_WIDTH,
          }
        )
      )
    );
  }, [fields, rowsAsArray]);

  // pin primary key columns to the left, like the previous `fixed: 'left'`
  const columnPinning = useMemo(
    () => ({ start: primaryKeys ?? [], end: [] }),
    [primaryKeys]
  );

  const table = useTable(
    {
      features,
      columns,
      data: result ?? (EMPTY_DATA as Row[]),
      state: { columnPinning },
      onColumnPinningChange: () => undefined,
      ...(primaryKeys && primaryKeys.length > 0
        ? {
            getRowId: (row: Row) =>
              primaryKeys.map((pk) => String(row[pk])).join('-'),
          }
        : {}),
    },
    (state) => state
  );

  // everything the body needs to render a cell, resolved once per column
  // (foreign keys, pinning offsets, widths) instead of once per cell
  const columnsMeta: Array<ColumnMeta> = useMemo(
    () =>
      table.getAllLeafColumns().map((column, index) => {
        const field = (fields ?? [])[index];
        const isPinned = column.getIsPinned();
        const foreignKey = field
          ? foreignKeys.getForeignKey(field.table ?? '', field.name)
          : null;

        return {
          id: column.id,
          fieldIndex: index,
          name: field?.name ?? column.id,
          tableName: field?.table,
          type: field?.type,
          width: column.getSize(),
          pinnedLeft: isPinned === 'start' ? column.getStart('start') : null,
          isLastPinned: isPinned === 'start' && column.getIsLastColumn('start'),
          numeric: isNumericType(field?.type),
          hasForeignKey: foreignKey !== null,
          // the schema of the column, resolved here rather than in the modal so
          // that no context lookup happens per mounted cell
          detail: field
            ? allColumns.getColumn(field.table ?? '', field.name)
            : undefined,
        };
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- table is stable, columns/columnPinning drive its column state
    [table, columns, columnPinning, fields, foreignKeys, allColumns]
  );

  return (
    <Wrapper>
      <ScrollContainer ref={setScrollElement}>
        <StyledTable>
          <StyledThead>
            {table.getHeaderGroups().map((headerGroup) => (
              <HeaderRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  const isPinned = header.column.getIsPinned();

                  return (
                    <HeaderCell
                      key={header.id}
                      data-last-pinned={
                        (isPinned === 'start' &&
                          header.column.getIsLastColumn('start')) ||
                        undefined
                      }
                      style={{
                        width: header.getSize(),
                        left:
                          isPinned === 'start'
                            ? header.column.getStart('start')
                            : undefined,
                        position: isPinned ? 'sticky' : undefined,
                        zIndex: isPinned ? 3 : undefined,
                      }}
                    >
                      <table.FlexRender header={header} />
                    </HeaderCell>
                  );
                })}
              </HeaderRow>
            ))}
          </StyledThead>

          <TableBody
            table={table}
            columnsMeta={columnsMeta}
            rowsAsArray={rowsAsArray}
            primaryKeys={primaryKeys}
            scrollElement={scrollElement}
            onShowCellDetail={setCellDetail}
            onCellContextMenu={onCellContextMenu}
          />
        </StyledTable>

        {result && result.length === 0 && (
          <EmptyWrapper>
            <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} />
          </EmptyWrapper>
        )}
      </ScrollContainer>

      <CellDetailModal
        detail={cellDetail}
        onSave={saveCell}
        onClose={() => {
          setCellDetail(null);
        }}
      />

      {onFilterChange && (
        <CellContextMenu
          target={filterTarget}
          onFilterChange={onFilterChange}
          onClose={() => {
            setFilterTarget(null);
          }}
        />
      )}
    </Wrapper>
  );
}

export interface ColumnMeta {
  id: string;
  fieldIndex: number;
  name: string;
  tableName: string | undefined;
  type: number | undefined;
  width: number;
  pinnedLeft: number | null;
  isLastPinned: boolean;
  /** numbers are set flush right, as in a ledger */
  numeric: boolean;
  // resolved once per column so that non-FK cells (the vast majority) don't
  // mount a ForeignKeyLink that would render null
  hasForeignKey: boolean;
  /**
   * What INFORMATION_SCHEMA says about the column: nullability, the whole type
   * declaration, whether the server computes it. Undefined for a column that
   * belongs to no table of the current database — a computed column of a raw
   * query, or a table of another schema.
   */
  detail: ColumnDetail | undefined;
}

interface TableBodyProps<Row extends RowDataPacket> {
  table: ReactTable<typeof features, Row>;
  columnsMeta: Array<ColumnMeta>;
  rowsAsArray: boolean;
  primaryKeys: Array<string> | undefined;
  scrollElement: HTMLDivElement | null;
  onShowCellDetail: (detail: CellDetail) => void;
  onCellContextMenu: ((target: CellFilterTarget) => void) | undefined;
}

// keep the virtualizer in the lowest component possible: it re-renders on
// every scroll event, so only the body must be affected
function TableBody<Row extends RowDataPacket>({
  table,
  columnsMeta,
  rowsAsArray,
  primaryKeys,
  scrollElement,
  onShowCellDetail,
  onCellContextMenu,
}: TableBodyProps<Row>): ReactElement {
  const { rows } = table.getRowModel();

  const rowVirtualizer = useVirtualizer<HTMLDivElement, HTMLTableRowElement>({
    count: rows.length,
    estimateSize: () => ROW_HEIGHT,
    getScrollElement: () => scrollElement,
    overscan: 10,
  });

  return (
    <StyledTbody style={{ height: rowVirtualizer.getTotalSize() }}>
      {rowVirtualizer.getVirtualItems().map((virtualRow) => {
        const row = rows[virtualRow.index];

        return (
          <BodyRow
            key={row.id}
            row={row}
            start={virtualRow.start}
            columnsMeta={columnsMeta}
            rowsAsArray={rowsAsArray}
            primaryKeys={primaryKeys}
            onShowCellDetail={onShowCellDetail}
            onCellContextMenu={onCellContextMenu}
          />
        );
      })}
    </StyledTbody>
  );
}

interface BodyRowProps<Row extends RowDataPacket> {
  row: TanstackRow<typeof features, Row>;
  start: number;
  columnsMeta: Array<ColumnMeta>;
  rowsAsArray: boolean;
  primaryKeys: Array<string> | undefined;
  onShowCellDetail: (detail: CellDetail) => void;
  onCellContextMenu: ((target: CellFilterTarget) => void) | undefined;
}

function BodyRowInner<Row extends RowDataPacket>({
  row,
  start,
  columnsMeta,
  rowsAsArray,
  primaryKeys,
  onShowCellDetail,
  onCellContextMenu,
}: BodyRowProps<Row>): ReactElement {
  const original = row.original;

  return (
    <tr className="tg-row" style={{ transform: `translateY(${start}px)` }}>
      {columnsMeta.map((column) => {
        const value = rowsAsArray
          ? (original as unknown as Array<unknown>)[column.fieldIndex]
          : original[column.name];
        const pinned = column.pinnedLeft !== null;
        const className = [
          'tg-cell',
          pinned && 'tg-pinned',
          column.numeric && 'tg-num',
        ]
          .filter(Boolean)
          .join(' ');

        return (
          <td
            key={column.id}
            className={className}
            data-last-pinned={column.isLastPinned || undefined}
            style={{
              width: column.width,
              left: column.pinnedLeft ?? undefined,
            }}
            onDoubleClick={() => {
              onShowCellDetail({
                column,
                value,
                // a raw query result is a list of values, with no column to read a key from
                // TODO later: handle raw query with possible primary key columns (e.g. `SELECT id, name FROM table`) and use them to identify the row
                rowKey: rowsAsArray ? null : buildRowKey(original, primaryKeys),
                rowIndex: row.index,
              });
            }}
            onContextMenu={
              onCellContextMenu &&
              ((event) => {
                event.preventDefault();
                onCellContextMenu({
                  column,
                  value,
                  x: event.clientX,
                  y: event.clientY,
                });
              })
            }
          >
            <GridCell column={column} value={value} />
          </td>
        );
      })}
    </tr>
  );
}

// rows never change position in the virtual space while scrolling, so a row
// only re-renders when it mounts or when its data changes
const BodyRow = memo(
  BodyRowInner,
  (prevProps, nextProps) =>
    prevProps.row === nextProps.row &&
    prevProps.start === nextProps.start &&
    prevProps.columnsMeta === nextProps.columnsMeta &&
    prevProps.rowsAsArray === nextProps.rowsAsArray &&
    prevProps.primaryKeys === nextProps.primaryKeys &&
    prevProps.onShowCellDetail === nextProps.onShowCellDetail &&
    prevProps.onCellContextMenu === nextProps.onCellContextMenu
) as typeof BodyRowInner;

// one React component per cell (measured free, 2026-08-18 benchmark): hosts
// the per-type rendering (Cell) and the future inline cell editor. Rule of
// thumb for cell content: React components are fine, per-cell antd
// components are not (antd Flex alone cost ~+120% per row mount)
const GridCell = memo(function GridCell({
  column,
  value,
}: {
  column: ColumnMeta;
  value: unknown;
}): ReactElement {
  return (
    <Cell
      type={column.type}
      value={value}
      link={
        column.hasForeignKey ? (
          <ForeignKeyLink
            tableName={column.tableName ?? ''}
            columnName={column.name}
            value={value}
          />
        ) : undefined
      }
    />
  );
});

// DESIGN.md: the grid sits flush at the region edge, with no frame of its own.
// Column heads are 11px caps over a base03 rule, rows are 26px, cells and rows
// are divided by base02 hairlines, and hover is the selection fill at low
// opacity so that it never reads as selected.
type StyledProps = Parameters<typeof selection>[0];

const hoverBackground = (props: StyledProps): string =>
  `color-mix(in srgb, ${selection(props)} 40%, transparent)`;

const Wrapper = styled.div`
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
  background: ${background};
`;

// the .tg-* classes below style the virtualized body cells: they are plain
// DOM elements on purpose (see the performance note on TableGrid)
const ScrollContainer = styled.div`
  flex: 1;
  min-height: 0;
  overflow: auto;
  position: relative;
  scrollbar-width: thin;
  scrollbar-color: ${selection} ${background};
  font-variant-numeric: tabular-nums;

  .tg-row {
    display: flex;
    position: absolute;
    width: 100%;
    height: ${ROW_HEIGHT}px;
  }

  .tg-row:hover .tg-cell {
    background: ${hoverBackground};
  }

  .tg-cell {
    display: flex;
    align-items: center;
    overflow: hidden;
    flex-shrink: 0;
    box-sizing: border-box;
    padding: 0 ${space.md};
    font-size: 13px;
    background: ${background};
    border-bottom: 1px solid ${selection};
    border-inline-end: 1px solid ${selection};
  }

  .tg-cell:last-child {
    border-inline-end: none;
  }

  .tg-num {
    justify-content: flex-end;
    text-align: right;
  }

  .tg-pinned {
    position: sticky;
    z-index: 1;
  }

  .tg-cell[data-last-pinned] {
    border-inline-end-color: ${commentForeground};
  }

  /* foreign key links (ForeignKeyLink) rendered next to the cell value */
  .tg-cell > a {
    margin-left: ${space.xs};
    flex-shrink: 0;
  }
`;

const StyledTable = styled.table`
  display: grid;
  min-width: 100%;
  border-collapse: collapse;
`;

const StyledThead = styled.thead`
  display: grid;
  position: sticky;
  top: 0;
  z-index: 2;
`;

// the rule under the column heads runs the whole width of the region, not
// only under the columns
const HeaderRow = styled.tr`
  display: flex;
  box-sizing: border-box;
  height: ${ROW_HEIGHT}px;
  background: ${background};
  border-bottom: 1px solid ${commentForeground};
`;

const HeaderCell = styled.th`
  display: flex;
  align-items: center;
  overflow: hidden;
  flex-shrink: 0;
  box-sizing: border-box;
  padding: 0 ${space.md};
  font-size: 11px;
  font-weight: normal;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  text-align: left;
  white-space: nowrap;
  color: ${commentForeground};
  background: ${background};

  &[data-last-pinned] {
    border-inline-end: 1px solid ${commentForeground};
  }
`;

const StyledTbody = styled.tbody`
  display: grid;
  position: relative;
`;

const EmptyWrapper = styled.div`
  padding: ${space.xl};
`;

export default TableGrid;
