import * as React from 'react';
import { Connection, FieldInfo } from 'mysql';
import styled from 'styled-components';
import { ConnectionContext, DatabaseContext } from '../Contexts';
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
  database: string;
}

interface TableNameState {
  result: null | object[];
  fields: null | FieldInfo[];
  error: null | Error;
  currentOffset: number;
}

class TableGrid extends React.PureComponent<TableNameProps> {
  state: TableNameState;

  constructor(props: Readonly<TableNameProps>) {
    super(props);

    this.state = {
      result: null,
      fields: null,
      error: null,
      currentOffset: 0,
    };

    this.fetchTableData = this.fetchTableData.bind(this);
    this.handleLoadMoreClick = this.handleLoadMoreClick.bind(this);
  }

  componentDidMount() {
    this.fetchTableData();
  }

  componentDidUpdate(prevProps: Readonly<TableNameProps>) {
    if (prevProps.tableName !== this.props.tableName) {
      this.setState({
        result: null,
        fields: null,
      });
      this.fetchTableData();
    }
  }

  fetchTableData(offset = 0, limit = 10) {
    const { connection, tableName, database } = this.props;

    connection.query(
      `SELECT * FROM ${database}.${tableName} LIMIT ${limit} OFFSET ${offset};`,
      (err, result, fields) => {
        if (err) {
          this.setState({ error: err });
          return;
        }

        this.setState((prevState: TableNameState) => ({
          result: prevState.result ? prevState.result.concat(result) : result,
          fields,
          currentOffset: offset,
        }));
      }
    );
  }

  handleLoadMoreClick() {
    const { currentOffset } = this.state;
    this.fetchTableData(currentOffset + 10);
  }

  render() {
    const { tableName } = this.props;
    const { error, fields, result } = this.state;

    if (error) {
      return <div>{error.message}</div>;
    }

    return (
      <div>
        <h3>{tableName}</h3>
        <Table>
          {fields && (
            <Thead>
              <tr>
                {fields.map(field => (
                  <Th key={field.name}>{field.name}</Th>
                ))}
              </tr>
            </Thead>
          )}
          {result && fields && (
            <tbody>
              {/* eslint-disable react/jsx-key */}
              {/* TODO : use the table primary key to make a real key */}
              {result.map((row: object) => (
                <tr>
                  {fields.map(field => (
                    <Td>
                      <Cell type={field.type} value={row[field.name]} />
                    </Td>
                  ))}
                </tr>
              ))}
              {/* eslint-enable react/jsx-key */}
            </tbody>
          )}
        </Table>

        <button onClick={this.handleLoadMoreClick}>Load more</button>
      </div>
    );
  }
}

interface TableNameWithRouterProps {
  match: { params: { tableName: string } };
  connection: Connection;
  database: string;
}

const TableGridWithRouter = ({
  match: {
    params: { tableName },
  },
  connection,
  database,
}: TableNameWithRouterProps) => (
  <TableGrid
    tableName={tableName}
    connection={connection}
    database={database}
  />
);

interface TableNameWithRouterProps {
  match: { params: { tableName: string } };
}
function TableGridWithConnection({ match }: TableNameWithRouterProps) {
  const { currentConnection } = React.useContext(ConnectionContext);
  const { database } = React.useContext(DatabaseContext);

  if (!currentConnection || !database) {
    return null;
  }

  return (
    <TableGridWithRouter
      key={currentConnection.threadId || undefined}
      connection={currentConnection}
      database={database}
      match={match}
    />
  );
}

export default TableGridWithConnection;
