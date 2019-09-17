import * as React from 'react';
import { Connection, FieldInfo } from 'mysql';
import styled from 'styled-components';
import { ConnectionContext } from '../Contexts';
import Cell from './Cell';
import { getSetting } from '../theme';

const Table = styled.table`
  border: 3px solid ${props => getSetting(props.theme, 'caret')};
  width: 100%;
  border-collapse: collapse;
`;

const Td = styled.td`
  border: 1px solid ${props => getSetting(props.theme, 'caret')};
  padding: 5px 4px;
`;

const Th = styled.th`
  border: 1px solid ${props => getSetting(props.theme, 'caret')};
  padding: 5px 4px;
`;

const Thead = styled.thead`
  border-bottom: 3px solid ${props => getSetting(props.theme, 'caret')};
`;

interface TableNameProps {
  tableName: string;
  connection: Connection;
}

interface TableNameState {
  result: null | object[];
  fields: null | FieldInfo[];
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
      (_err, result, fields) => {
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
                      <Cell type={field.type} value={row[field.name]} />
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
  connection: Connection;
}

const TableGridWithRouter = ({
  match: {
    params: { tableName },
  },
  connection,
}: TableNameWithRouterProps) => (
  <TableGrid tableName={tableName} connection={connection} />
);

interface TableNameWithRouterProps {
  match: { params: { tableName: string } };
}
function TableGridWithConnection({ match }: TableNameWithRouterProps) {
  const { connection } = React.useContext(ConnectionContext);

  if (!connection) {
    return null;
  }

  return <TableGridWithRouter connection={connection} match={match} />;
}

export default TableGridWithConnection;
