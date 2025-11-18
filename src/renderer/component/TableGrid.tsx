import { ReactElement, ReactNode, memo, useCallback, useMemo } from 'react';
import { Table } from 'antd';
import { ColumnsType } from 'antd/es/table';
import type { FieldPacket, RowDataPacket } from 'mysql2/promise';
import Cell from './Cell';
import ForeignKeyLink from './ForeignKeyLink';
import { useTableHeight } from './TableLayout/useTableHeight';

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
  const [yTableScroll, resizeRef] = useTableHeight();

  const rowKey = useCallback(
    (record: Row) => {
      if (!primaryKeys) {
        // undefined is a valid react key
        return undefined as unknown as string;
      }

      return primaryKeys.map((pk) => record[pk]).join('-');
    },
    [primaryKeys]
  );

  const columns = useMemo(
    () =>
      fields?.map((field, i): ColumnsType<Row>[number] => ({
        title: field.name,
        dataIndex: rowsAsArray ? i : field.name,
        key: field.name,

        // add "…" to the end of the cell if the content is too long
        ellipsis: true,

        // if the field is a primary key, fix the column to the left when scrolling
        fixed: primaryKeys?.includes(field.name) ? 'left' : undefined,

        // how to render a data cell in this column
        render: (value) => <CellRender value={value} field={field} />,
      })),
    [fields, primaryKeys, rowsAsArray]
  );

  return (
    <div style={{ overflow: 'auto', flex: '1' }} ref={resizeRef}>
      <Table
        title={title}
        bordered
        // the header, contains the column names
        columns={columns}
        // the list of sql rows
        dataSource={result ?? []}
        rowKey={rowKey}
        pagination={false}
        virtual // used to optimize performance and avoid re-rendering as render needs to know the field.type to be memoized
        scroll={{ x: 150 * (fields?.length ?? 0), y: yTableScroll }}
      />
    </div>
  );
}

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

export default TableGrid;
