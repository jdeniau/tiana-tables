import type { FieldPacket, RowDataPacket } from 'mysql2/promise';
import Cell from './Cell';
import { ReactElement } from 'react';
import { Table } from 'antd';

interface TableGridProps<R extends object> {
  result: null | R[];
  fields: null | FieldPacket[];
  primaryKeys: Array<string>;
  yTableScroll: number;
}

function TableGrid<Row extends RowDataPacket>({
  fields,
  result,
  primaryKeys,
  yTableScroll,
}: TableGridProps<Row>): ReactElement {
  return (
    <Table
      bordered
      dataSource={
        result?.map((r) => {
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
  );
}

export default TableGrid;
