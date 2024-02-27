import type { FieldPacket, RowDataPacket } from 'mysql2/promise';
import Cell from './Cell';
import { ReactElement } from 'react';
import { Table } from 'antd';

interface TableGridProps<R extends object> {
  result: null | R[];
  fields: null | FieldPacket[];
  primaryKeys: Array<string>;
}

function TableGrid<Row extends RowDataPacket>({
  fields,
  result,
  primaryKeys,
}: TableGridProps<Row>): ReactElement {
  return (
    <Table
      //  TODO : use the table primary key to make a real key
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
        render: (value: Row) => <Cell type={field.type} value={value} />,
      }))}
      pagination={false}
    />
  );
}

export default TableGrid;
