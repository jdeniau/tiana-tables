import { ReactElement, ReactNode, useCallback } from 'react';
import { Table } from 'antd';
import type { FieldPacket, RowDataPacket } from 'mysql2/promise';
import { Link } from 'react-router-dom';
import { KeyColumnUsageRow } from '../../sql/types';
import Cell from './Cell';
import { useTableHeight } from './TableLayout/useTableHeight';

interface TableGridProps<R extends RowDataPacket> {
  result: null | R[];
  fields: null | FieldPacket[];
  primaryKeys?: Array<string>;
  foreignKeys?: KeyColumnUsageRow[];
  title?: () => ReactNode;
}

function TableGrid<Row extends RowDataPacket>({
  fields,
  result,
  primaryKeys,
  foreignKeys,
  title,
}: TableGridProps<Row>): ReactElement {
  const [yTableScroll, resizeRef] = useTableHeight();

  // TODO This is a POC, do clean this nearly drunken code
  const foreignKeyLink = useCallback(
    (columnName: string, value: Row): string | undefined => {
      const foreignKey = foreignKeys?.find(
        (fk) =>
          fk.COLUMN_NAME === columnName && fk.REFERENCED_TABLE_NAME !== null
      );

      if (foreignKey) {
        return `${foreignKey.REFERENCED_TABLE_NAME}?where=${encodeURIComponent(`${foreignKey.REFERENCED_COLUMN_NAME}=${value}`)}`;
      }
    },
    [foreignKeys]
  );

  return (
    <div style={{ overflow: 'auto', flex: '1' }} ref={resizeRef}>
      <Table
        title={title}
        bordered
        // the header, contains the column names
        columns={fields?.map((field) => ({
          title: field.name,
          dataIndex: field.name,
          key: field.name,

          // add "…" to the end of the cell if the content is too long
          ellipsis: true,

          // if the field is a primary key, fix the column to the left when scrolling
          fixed: primaryKeys?.includes(field.name) ? 'left' : undefined,

          // how to render a data cell in this column
          render: (value: Row) => (
            <>
              <Cell
                type={field.type}
                value={value}
                link={
                  foreignKeyLink(field.name, value) && (
                    <Link
                      to={`/connections/dev/ticketing/tables/${foreignKeyLink(field.name, value)}`}
                    >
                      ↗️
                    </Link>
                  )
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
