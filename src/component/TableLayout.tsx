import type { FieldPacket } from 'mysql2/promise';
import { useParams } from 'react-router-dom';
import { ConnectionContext, DatabaseContext } from '../Contexts';
import TableGrid from './TableGrid';
import WhereFilter from './Query/WhereFilter';
import {
  ReactElement,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react';

interface TableNameProps {
  tableName: string;
  database: string;
}

const DEFAULT_LIMIT = 10;

function TableLayout({ tableName, database }: TableNameProps): ReactElement {
  const [result, setResult] = useState<null | object[]>(null);
  const [fields, setFields] = useState<null | FieldPacket[]>(null);
  const [error, setError] = useState<null | Error>(null);
  const [currentOffset, setCurrentOffset] = useState<number>(0);
  const [where, setWhere] = useState<string>('');

  const fetchTableData = useCallback(
    (offset: number) => {
      const query = `SELECT * FROM ${database}.${tableName} ${
        where ? ` WHERE ${where}` : ''
      } LIMIT ${DEFAULT_LIMIT} OFFSET ${offset};`;

      window.sql
        .query(query)
        .then(([result, fields]) => {
          setCurrentOffset(offset);
          setFields(fields || null);
          setResult((prev) =>
            offset > 0 && prev ? prev.concat(result) : result
          );
        })
        .catch((err) => {
          setError(err);
        });
    },
    [tableName, database, where]
  );

  useEffect(() => {
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
  const { currentConnectionName } = useContext(ConnectionContext);
  const { database } = useContext(DatabaseContext);
  const { tableName } = useParams();

  if (!currentConnectionName || !database || !tableName) {
    return null;
  }

  return (
    <TableLayout
      key={`${currentConnectionName}|${database}|${tableName}`}
      tableName={tableName}
      database={database}
    />
  );
}

export default TableGridWithConnection;
