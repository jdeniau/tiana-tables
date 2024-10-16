import { ReactElement, ReactNode } from 'react';
import { Table } from 'antd';
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

  return (
    <div style={{ overflow: 'auto', flex: '1' }} ref={resizeRef}>
      <Table
        title={title}
        bordered
        // the header, contains the column names
        columns={fields?.map((field, i) => ({
          title: field.name,
          dataIndex: rowsAsArray ? i : field.name,
          key: field.name,

          // add "…" to the end of the cell if the content is too long
          ellipsis: true,

          // if the field is a primary key, fix the column to the left when scrolling
          fixed: primaryKeys?.includes(field.name) ? 'left' : undefined,

          // how to render a data cell in this column
          render: (value) => (
            <>
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
            </>
          ),
        }))}
        // the list of sql rows
        dataSource={result ?? []}
        rowKey={(record) => {
          if (!primaryKeys) {
            // undefined is a valid react key
            return undefined as unknown as string;
          }

          return primaryKeys.map((pk) => record[pk]).join('-');
        }}
        pagination={false}
        scroll={{ x: true, y: yTableScroll }}
      />
    </div>
  );
}

export default TableGrid;
