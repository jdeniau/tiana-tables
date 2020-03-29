import * as React from 'react';
import { Connection, FieldInfo } from 'mysql';
import styled from 'styled-components';
import { useParams } from 'react-router-dom';
import { ConnectionContext, DatabaseContext } from '../Contexts';
import TableGrid from './TableGrid';
import WhereFilter from './Query/WhereFilter';

interface TableNameProps {
  tableName: string;
  connection: Connection;
  database: string;
}

const DEFAULT_LIMIT = 10;

function TableLayout({
  tableName,
  connection,
  database,
}: TableNameProps): React.ReactElement {
  const [result, setResult] = React.useState<null | object[]>(null);
  const [fields, setFields] = React.useState<null | FieldInfo[]>(null);
  const [error, setError] = React.useState<null | Error>(null);
  const [currentOffset, setCurrentOffset] = React.useState<number>(0);
  const [where, setWhere] = React.useState<string>('');

  const fetchTableData = React.useCallback(
    (offset) => {
      const query = `SELECT * FROM ${database}.${tableName} ${
        where ? ` WHERE ${where}` : ''
      } LIMIT ${DEFAULT_LIMIT} OFFSET ${offset};`;

      console.log(query);

      connection.query(query, (err, result, fields) => {
        if (err) {
          setError(err);
          return;
        }

        setCurrentOffset(offset);
        setFields(fields || null);
        setResult((prev) =>
          offset > 0 && prev ? prev.concat(result) : result
        );
      });
    },
    [connection, tableName, database, where]
  );

  React.useEffect(() => {
    fetchTableData(currentOffset);
  }, [fetchTableData, currentOffset]);

  if (error) {
    return <div>{error.message}</div>;
  }

  return (
    <div>
      <h3>{tableName}</h3>

      <WhereFilter
        defaultValue={where}
        onSubmit={(where) => {
          setCurrentOffset(0);
          setWhere(where);
        }}
      />

      <TableGrid fields={fields} result={result} />

      <button onClick={() => fetchTableData(currentOffset + DEFAULT_LIMIT)}>
        Load more
      </button>
    </div>
  );
}

function TableGridWithConnection() {
  const { currentConnection } = React.useContext(ConnectionContext);
  const { database } = React.useContext(DatabaseContext);
  const { tableName } = useParams();

  if (!currentConnection || !database || !tableName) {
    return null;
  }

  return (
    <TableLayout
      key={`${currentConnection.threadId}|${database}|${tableName}`}
      tableName={tableName}
      connection={currentConnection}
      database={database}
    />
  );
}

export default TableGridWithConnection;
