import {
  ReactElement,
  ReactNode,
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import { Form, GetRef, Input, InputRef, Table } from 'antd';
import type { FieldPacket, RowDataPacket } from 'mysql2/promise';
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
            // handleSave,
            primaryKeys,
          }),

          // how to render a data cell in this column
          render: (value) => (
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
          ),
        }))}
        components={{
          body: {
            cell: EditableCell,
            row: EditableRow,
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

type FormInstance<T> = GetRef<typeof Form<T>>;

const EditableContext = createContext<FormInstance<any> | null>(null);

interface EditableRowProps {
  index: number;
}

function EditableRow({ index, ...props }: EditableRowProps) {
  const [form] = Form.useForm();

  return (
    <Form form={form} component={false}>
      <EditableContext.Provider value={form}>
        <tr {...props} />
      </EditableContext.Provider>
    </Form>
  );
}

type CellProps = {
  children: ReactNode;
  dataIndex: string;
  title: string;
  value: RowDataPacket;
  primaryKeys: Array<string>;
  editable: boolean;
};

function EditableCell({
  children,
  dataIndex,
  title,
  value,
  primaryKeys,
  editable,
  ...rest
}: CellProps) {
  // console.log(rest);

  const form = useContext(EditableContext)!;
  const inputRef = useRef<InputRef>(null);
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    if (editing) {
      inputRef.current?.focus();
    }
  }, [editing]);

  const toggleEdit = () => {
    setEditing(!editing);
    form.setFieldsValue({ [dataIndex]: value[dataIndex] });
  };

  const save = async (e) => {
    // console.log(e);
    try {
      const values = await form.validateFields();

      toggleEdit();
      console.log(
        Object.fromEntries(primaryKeys.map((pk) => [pk, value[pk]])),
        { ...values }
      );
      // handleSave({ ...record, ...values });
    } catch (errInfo) {
      console.log('Save failed:', errInfo);
    }
  };

  const childNode = editing ? (
    <Form.Item
      style={{ margin: 0 }}
      name={dataIndex}
      rules={[
        {
          required: true,
          message: `${title} is required.`,
        },
      ]}
    >
      <Input ref={inputRef} onPressEnter={save} onBlur={save} />
    </Form.Item>
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
