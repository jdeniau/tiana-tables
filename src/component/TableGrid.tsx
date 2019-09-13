import * as React from 'react';
import { Types, Connection, FieldsPacket, RowDataPacket } from 'mysql';
import { ConnectionContext } from '../Contexts';
import styled from 'styled-components';

const Table = styled.table`
  border: 3px solid black;
  width: 100%;
  border-collapse: collapse;
`;

const Td = styled.td`
  border: 1px solid black;
  padding: 5px 4px;
`;

const Th = styled.th`
  border: 1px solid black;
  padding: 5px 4px;
`;

const Thead = styled.thead`
  background: #cfcfcf;
  border-bottom: 3px solid black;
`;

interface TableNameProps {
  tableName: string;
  connection: Connection;
}

interface TableNameState {
  result: null | RowDataPacket[];
  fields: null | FieldsPacket[];
}

class TableGrid extends React.PureComponent<TableNameProps> {
  state: TableNameState;

  constructor(props: Readonly<TableNameProps>) {
    super(props);

    this.state = {
      result: null,
      fields: null,
    };

    this.fetchTableData = this.fetchTableData.bind(this);
  }

  componentDidMount() {
    this.fetchTableData();
  }

  componentDidUpdate(prevProps: Readonly<TableNameProps>) {
    if (prevProps.tableName !== this.props.tableName) {
      this.fetchTableData();
    }
  }

  fetchTableData() {
    const { connection, tableName } = this.props;

    connection.query(
      `SELECT * FROM ${tableName} LIMIT 10;`,
      (err, result, fields) => {
        this.setState({
          result,
          fields,
        });
      }
    );
  }

  render() {
    const { tableName } = this.props;
    const { fields, result } = this.state;

    return (
      <div>
        <h3>{tableName}</h3>
        <Table>
          {fields && (
            <Thead>
              <tr>
                {fields.map(field => (
                  <Th>{field.name}</Th>
                ))}
              </tr>
            </Thead>
          )}
          {result && fields && (
            <tbody>
              {result.map((row: object) => (
                <tr>
                  {fields.map(field => (
                    <Td>
                      {Types.DATETIME === field.type
                        ? 'ceci est une date'
                        : row[field.name]}
                    </Td>
                  ))}
                </tr>
              ))}
            </tbody>
          )}
        </Table>
      </div>
    );
  }
}

interface TableNameWithRouterProps {
  match: { params: { tableName: string } };
}

const TableGridWithRouter = ({
  match: {
    params: { tableName },
  },
  ...rest
}: TableNameWithRouterProps) => <TableGrid tableName={tableName} {...rest} />;

function TableGridWithConnection(props: object) {
  const connectionConsumer = React.useContext(ConnectionContext);

  if (!connectionConsumer) {
    return null;
  }

  return <TableGridWithRouter connection={connectionConsumer} {...props} />;
}

export default TableGridWithConnection;
