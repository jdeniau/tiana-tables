import type { FieldPacket } from 'mysql2/promise';
import Cell from './Cell';
import { ReactElement } from 'react';
import { Table } from 'antd';

interface TableGridProps<R extends object> {
  result: null | R[];
  fields: null | FieldPacket[];
}

function TableGrid<Row extends object>({
  fields,
  result,
}: TableGridProps<Row>): ReactElement {
  return (
    <Table
      //  TODO : use the table primary key to make a real key
      dataSource={result ?? []}
      columns={fields?.map((field) => ({
        title: field.name,
        dataIndex: field.name,
        //  TODO field name is an object. Need a better type ?
        key: field.name,
        render: (value: Row) => <Cell type={field.type} value={value} />,
      }))}
      pagination={false}
    />
  );
}

export default TableGrid;
