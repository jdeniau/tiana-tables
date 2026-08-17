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
            cell: (info) => (
              <CellRender value={info.getValue()} field={field} />
            ),
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
                        isPinned === 'start' &&
                        header.column.getIsLastColumn('start')
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

          <TableBody table={table} scrollElement={scrollElement} />
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

interface TableBodyProps<Row extends RowDataPacket> {
  table: ReactTable<typeof features, Row>;
  scrollElement: HTMLDivElement | null;
}

// keep the virtualizer in the lowest component possible: it re-renders on
// every scroll event, so only the body must be affected
function TableBody<Row extends RowDataPacket>({
  table,
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
            table={table}
            row={row}
            start={virtualRow.start}
          />
        );
      })}
    </StyledTbody>
  );
}

interface BodyRowProps<Row extends RowDataPacket> {
  table: ReactTable<typeof features, Row>;
  row: TanstackRow<typeof features, Row>;
  start: number;
}

function BodyRowInner<Row extends RowDataPacket>({
  table,
  row,
  start,
}: BodyRowProps<Row>): ReactElement {
  return (
    <BodyTr style={{ transform: `translateY(${start}px)` }}>
      {row.getAllCells().map((cell) => {
        const isPinned = cell.column.getIsPinned();

        return (
          <BodyCell
            key={cell.id}
            data-last-pinned={
              isPinned === 'start' && cell.column.getIsLastColumn('start')
            }
            style={{
              width: cell.column.getSize(),
              left:
                isPinned === 'start'
                  ? cell.column.getStart('start')
                  : undefined,
              position: isPinned ? 'sticky' : undefined,
              zIndex: isPinned ? 1 : undefined,
            }}
          >
            <table.FlexRender cell={cell} />
          </BodyCell>
        );
      })}
    </BodyTr>
  );
}

// rows never change position in the virtual space while scrolling, so a row
// only re-renders when it mounts or when its data changes
const BodyRow = memo(
  BodyRowInner,
  (prevProps, nextProps) =>
    prevProps.row === nextProps.row && prevProps.start === nextProps.start
) as typeof BodyRowInner;

type CellRenderProps = {
  value: any; // eslint-disable-line @typescript-eslint/no-explicit-any
  field: FieldPacket;
};

const CellRender = memo(
  function CellRender({ value, field }: CellRenderProps): ReactElement {
    return (
      <Cell
        type={field.type}
        value={value}
        link={
          <ForeignKeyLink
            tableName={field.table}
            columnName={field.name}
            value={value}
          />
        }
      />
    );
  },
  (prevProps, nextProps) => {
    return (
      prevProps.value === nextProps.value &&
      prevProps.field.type === nextProps.field.type &&
      prevProps.field.name === nextProps.field.name &&
      prevProps.field.table === nextProps.field.table
    );
  }
);

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

  &[data-last-pinned='true'] {
    box-shadow: inset -8px 0 8px -8px ${borderColor};
  }
`;

const StyledTbody = styled.tbody`
  display: grid;
  position: relative;
`;

const BodyTr = styled.tr`
  display: flex;
  position: absolute;
  width: 100%;
  height: ${ROW_HEIGHT}px;

  &:hover td {
    background: ${hoverBackground};
  }
`;

const BodyCell = styled.td`
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

  &:last-child {
    border-inline-end: none;
  }

  &[data-last-pinned='true'] {
    box-shadow: inset -8px 0 8px -8px ${borderColor};
  }
`;

const EmptyWrapper = styled.div`
  padding: 32px;
`;

export default TableGrid;
