import { ReactElement, ReactNode, memo, useMemo, useState } from 'react';
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
import { useForeignKeysContext } from '../../contexts/ForeignKeysContext';
import { background, foreground } from '../theme';
import Cell from './Cell';
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
const ROW_HEIGHT = 40;

const EMPTY_DATA: RowDataPacket[] = [];

interface TableGridProps<R extends RowDataPacket> {
  rowsAsArray?: boolean;
  result: null | R[];
  fields: null | FieldPacket[];
  primaryKeys?: Array<string>;
  title?: () => ReactNode;
}

/**
 * PERFORMANCE NOTE: the virtualized body is the hot path of this component —
 * scrolling vertically MOUNTS new rows continuously (memo only prevents
 * re-renders, not mounts). Row and cell shells are plain DOM elements styled
 * with static .tg-* classes (declared once on ScrollContainer), and per-cell
 * work (FK detection, pinning offsets) is precomputed per column in
 * `columnsMeta`. Inside cells, React components are fine (GridCell/Cell,
 * measured free) but antd components are forbidden (antd Flex alone doubled
 * the mount cost) and per-cell styled-components must stay scarce (~+15%
 * each). See the CLAUDE.md gotcha for the benchmark details.
 */
function TableGrid<Row extends RowDataPacket>({
  fields,
  result,
  primaryKeys,
  title,
  rowsAsArray = false,
}: TableGridProps<Row>): ReactElement {
  // store the scroll element in a state (not a ref): the virtualizer reads it
  // in a layout effect that runs before the parent ref is attached, so a ref
  // would stay null until an unrelated re-render happens
  const [scrollElement, setScrollElement] = useState<HTMLDivElement | null>(
    null
  );

  const foreignKeys = useForeignKeysContext();

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
          hasForeignKey: foreignKey !== null,
        };
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- table is stable, columns/columnPinning drive its column state
    [table, columns, columnPinning, fields, foreignKeys]
  );

  return (
    <Wrapper>
      {title ? <TitleBar>{title()}</TitleBar> : null}

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
            scrollElement={scrollElement}
          />
        </StyledTable>

        {result && result.length === 0 && (
          <EmptyWrapper>
            <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} />
          </EmptyWrapper>
        )}
      </ScrollContainer>
    </Wrapper>
  );
}

interface ColumnMeta {
  id: string;
  fieldIndex: number;
  name: string;
  tableName: string | undefined;
  type: number | undefined;
  width: number;
  pinnedLeft: number | null;
  isLastPinned: boolean;
  // resolved once per column so that non-FK cells (the vast majority) don't
  // mount a ForeignKeyLink that would render null
  hasForeignKey: boolean;
}

interface TableBodyProps<Row extends RowDataPacket> {
  table: ReactTable<typeof features, Row>;
  columnsMeta: Array<ColumnMeta>;
  rowsAsArray: boolean;
  scrollElement: HTMLDivElement | null;
}

// keep the virtualizer in the lowest component possible: it re-renders on
// every scroll event, so only the body must be affected
function TableBody<Row extends RowDataPacket>({
  table,
  columnsMeta,
  rowsAsArray,
  scrollElement,
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
}

function BodyRowInner<Row extends RowDataPacket>({
  row,
  start,
  columnsMeta,
  rowsAsArray,
}: BodyRowProps<Row>): ReactElement {
  const original = row.original;

  return (
    <tr className="tg-row" style={{ transform: `translateY(${start}px)` }}>
      {columnsMeta.map((column) => {
        const value = rowsAsArray
          ? (original as unknown as Array<unknown>)[column.fieldIndex]
          : original[column.name];
        const pinned = column.pinnedLeft !== null;

        return (
          <td
            key={column.id}
            className={pinned ? 'tg-cell tg-pinned' : 'tg-cell'}
            data-last-pinned={column.isLastPinned || undefined}
            style={{
              width: column.width,
              left: column.pinnedLeft ?? undefined,
            }}
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
    prevProps.rowsAsArray === nextProps.rowsAsArray
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

type StyledProps = Parameters<typeof foreground>[0];

// shadcn-inspired look: horizontal separators only, muted header, rounded
// card container, subtle row hover — all derived from the current theme
const borderColor = (props: StyledProps): string =>
  `color-mix(in srgb, ${foreground(props)} 14%, transparent)`;

// vertical separators stay barely visible, horizontal ones do the structure
const subtleBorderColor = (props: StyledProps): string =>
  `color-mix(in srgb, ${foreground(props)} 6%, transparent)`;

const mutedForeground = (props: StyledProps): string =>
  `color-mix(in srgb, ${foreground(props)} 70%, ${background(props)})`;

const headerBackground = (props: StyledProps): string =>
  `color-mix(in srgb, ${foreground(props)} 4%, ${background(props)})`;

const hoverBackground = (props: StyledProps): string =>
  `color-mix(in srgb, ${foreground(props)} 7%, ${background(props)})`;

const Wrapper = styled.div`
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
  background: ${background};
  border: 1px solid ${borderColor};
  border-radius: 8px;
  overflow: hidden;
`;

const TitleBar = styled.div`
  padding: 12px 16px;
  font-size: 14px;
  font-weight: 600;
  color: ${foreground};
  border-bottom: 1px solid ${borderColor};
`;

// the .tg-* classes below style the virtualized body cells: they are plain
// DOM elements on purpose (see the performance note on TableGrid)
const ScrollContainer = styled.div`
  flex: 1;
  min-height: 0;
  overflow: auto;
  position: relative;

  &::-webkit-scrollbar {
    width: 10px;
    height: 10px;
  }

  &::-webkit-scrollbar-thumb {
    background: color-mix(in srgb, ${foreground} 25%, transparent);
    border-radius: 5px;
    border: 2px solid transparent;
    background-clip: padding-box;
  }

  &::-webkit-scrollbar-track {
    background: transparent;
  }

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
    padding: 0 16px;
    font-size: 13px;
    background: ${background};
    border-bottom: 1px solid ${borderColor};
    border-inline-end: 1px solid ${subtleBorderColor};
    transition: background 0.1s ease;
  }

  .tg-cell:last-child {
    border-inline-end: none;
  }

  .tg-pinned {
    position: sticky;
    z-index: 1;
  }

  .tg-cell[data-last-pinned] {
    box-shadow: inset -8px 0 8px -8px ${borderColor};
  }

  /* foreign key links (ForeignKeyLink) rendered next to the cell value */
  .tg-cell > a {
    margin-left: 4px;
    flex-shrink: 0;
  }
`;

const StyledTable = styled.table`
  display: grid;
  border-collapse: collapse;
`;

const StyledThead = styled.thead`
  display: grid;
  position: sticky;
  top: 0;
  z-index: 2;
`;

const HeaderRow = styled.tr`
  display: flex;
  height: ${ROW_HEIGHT}px;
`;

const HeaderCell = styled.th`
  display: flex;
  align-items: center;
  overflow: hidden;
  flex-shrink: 0;
  box-sizing: border-box;
  padding: 0 16px;
  font-size: 12px;
  font-weight: 500;
  text-align: left;
  white-space: nowrap;
  color: ${mutedForeground};
  background: ${headerBackground};
  border-bottom: 1px solid ${borderColor};
  border-inline-end: 1px solid ${subtleBorderColor};

  &:last-child {
    border-inline-end: none;
  }

  &[data-last-pinned] {
    box-shadow: inset -8px 0 8px -8px ${borderColor};
  }
`;

const StyledTbody = styled.tbody`
  display: grid;
  position: relative;
`;

const EmptyWrapper = styled.div`
  padding: 32px;
`;

export default TableGrid;
