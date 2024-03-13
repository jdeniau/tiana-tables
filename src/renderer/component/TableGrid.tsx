import { ReactElement, ReactNode } from 'react';
import { Table } from 'antd';
import type { FieldPacket, RowDataPacket } from 'mysql2/promise';
import Cell from './Cell';
import { useTableHeight } from './TableLayout/useTableHeight';

interface TableGridProps<R extends RowDataPacket> {
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
}: TableGridProps<Row>): ReactElement {
  const [yTableScroll, resizeRef] = useTableHeight();

  return (
    <div style={{ overflow: 'auto', flex: '1' }} ref={resizeRef}>
      <Table
        title={title}
        bordered
        dataSource={
          result?.map((r) => {
            if (!primaryKeys) {
              return r;
            }

            const key = primaryKeys.map((pk) => r[pk]).join('-');

            return { ...r, key };
          }) ?? []
        }
        columns={fields?.map((field) => ({
          title: field.name,
          dataIndex: field.name,
          //  TODO field name is an object. Need a better type ?
          key: field.name,
          ellipsis: true,
          render: (value: Row) => <Cell type={field.type} value={value} />,
        }))}
        pagination={false}
        scroll={{ x: true, y: yTableScroll }}
      />
    </div>
  );
}

export default TableGrid;
