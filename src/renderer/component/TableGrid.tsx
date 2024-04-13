import {
  FocusEvent,
  KeyboardEvent,
  ReactElement,
  ReactNode,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { Input, InputRef, Table } from 'antd';
import type { FieldPacket, RowDataPacket } from 'mysql2/promise';
import { usePendingEditContext } from '../../contexts/PendingEditContext';
import Cell from './Cell';
import ForeignKeyLink from './ForeignKeyLink';
import { useTableHeight } from './TableLayout/useTableHeight';

interface TableGridProps<R extends RowDataPacket> {
  result: null | R[];
  fields: null | FieldPacket[];
  primaryKeys?: Array<string>;
  title?: () => ReactNode;
  editable?: boolean;
}

type EditableTableProps = Parameters<typeof Table>[0];
type ColumnTypes = Exclude<EditableTableProps['columns'], undefined>;

function TableGrid<Row extends RowDataPacket>({
  fields,
  result,
  primaryKeys,
  title,
  editable = false,
}: TableGridProps<Row>): ReactElement {
  const [yTableScroll, resizeRef] = useTableHeight();

  return (
    <div style={{ overflow: 'auto', flex: '1' }} ref={resizeRef}>
      <Table
        title={title}
        bordered
        // the header, contains the column names
        columns={fields?.map((field): ColumnTypes[number] => ({
          title: field.name,
          dataIndex: field.name,
          key: field.name,

          // add "…" to the end of the cell if the content is too long
          ellipsis: true,

          // if the field is a primary key, fix the column to the left when scrolling
          fixed: primaryKeys?.includes(field.name) ? 'left' : undefined,

          // Add props to the cell
          onCell: (value) => ({
            value,
            editable,
            // editable: col.editable,
            dataIndex: field.name,
            title: field.name,
            tableName: field.table,
            // handleSave,
            primaryKeys,
          }),

          // how to render a data cell in this column
          render: (value, record) => (
            <CellWithPendingValue field={field} value={value} record={record} />
          ),
        }))}
        components={{
          body: {
            cell: EditableCell,
          },
        }}
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

function CellWithPendingValue({
  value,
  field,
  record,
}: {
  value: any;
  field: FieldPacket;
  record: RowDataPacket;
}) {
  const { pendingEdits } = usePendingEditContext();

  const pendingEdit = pendingEdits.findLast(
    (edit) =>
      edit.tableName === field.table &&
      field.name in edit.values &&
      Object.entries(edit.primaryKeys).every(
        ([columnName, pkValue]) => record[columnName] === pkValue
      )
  );

  const pendingEditValue = pendingEdit?.values[field.name];
  const futureValue = pendingEditValue ?? value;

  return (
    <div style={pendingEditValue ? { background: 'orange' } : undefined}>
      <Cell
        type={field.type}
        value={futureValue}
        link={useMemo(
          () => (
            <ForeignKeyLink
              tableName={field.table}
              columnName={field.name}
              value={futureValue}
            />
          ),
          [field.table, field.name, futureValue]
        )}
      />
    </div>
  );
}

type CellProps = {
  children: ReactNode;
  dataIndex: string;
  title: string;
  tableName: string;
  value: RowDataPacket;
  primaryKeys: Array<string>;
  editable: boolean;
};

function EditableCell({
  children,
  dataIndex,
  title,
  tableName,
  value,
  primaryKeys,
  editable,
  ...rest
}: CellProps) {
  // console.log(rest);

  const inputRef = useRef<InputRef>(null);
  const [editing, setEditing] = useState(false);
  const { addPendingEdit } = usePendingEditContext();

  useEffect(() => {
    if (editing) {
      inputRef.current?.focus();
    }
  }, [editing]);

  const toggleEdit = () => {
    setEditing(!editing);
  };

  const save = async (
    e: KeyboardEvent<HTMLInputElement> | FocusEvent<HTMLInputElement>
  ) => {
    const { value: newValue } = e.currentTarget;

    if (value[dataIndex] === newValue) {
      // data did not change, do not save anything
      toggleEdit();
      return;
    }

    try {
      toggleEdit();
      addPendingEdit({
        tableName,
        primaryKeys: Object.fromEntries(
          primaryKeys.map((pk) => [pk, value[pk]])
        ),
        values: { [dataIndex]: newValue },
      });
    } catch (errInfo) {
      console.log('Save failed:', errInfo);
    }
  };

  const childNode = editing ? (
    <Input
      ref={inputRef}
      defaultValue={value[dataIndex]}
      onPressEnter={save}
      onBlur={save}
    />
  ) : (
    <div
      className="editable-cell-value-wrap"
      style={{ paddingRight: 24 }}
      onClick={editable && primaryKeys ? toggleEdit : undefined}
    >
      {children}
    </div>
  );

  return <td {...rest}>{childNode}</td>;
}

export default TableGrid;
