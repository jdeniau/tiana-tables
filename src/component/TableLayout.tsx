import { ReactElement, useCallback, useEffect, useState } from 'react';
import type { FieldPacket } from 'mysql2/promise';
import { useParams } from 'react-router-dom';
import { useConfiguration } from '../contexts/ConfigurationContext';
import { useDatabaseContext } from '../contexts/DatabaseContext';
import { useConnectionContext } from '../contexts/ConnectionContext';
import TableGrid from './TableGrid';
import WhereFilter from './Query/WhereFilter';
import { useTranslation } from '../i18n';
import invariant from 'tiny-invariant';
import { Button, Flex } from 'antd';

interface TableNameProps {
  tableName: string;
  database: string;
}

const DEFAULT_LIMIT = 100;

function TableLayout({ tableName, database }: TableNameProps): ReactElement {
  const { t } = useTranslation();
  const { executeQuery } = useDatabaseContext();
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

      executeQuery(query)
        // @ts-expect-error -- TODO handle types here
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
    [database, tableName, where, executeQuery]
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

      <Flex justify="center" align="center" style={{ marginTop: '20px' }}>
        <Button
          onClick={() => fetchTableData(currentOffset + DEFAULT_LIMIT)}
          type="primary"
        >
          {t('table.rows.loadMore')}
        </Button>
      </Flex>
    </div>
  );
}

function TableGridWithConnection() {
  const { currentConnectionName } = useConnectionContext();
  const { database } = useDatabaseContext();
  const { tableName } = useParams();
  const { updateConnectionState } = useConfiguration();

  useEffect(() => {
    invariant(currentConnectionName, 'Connection name is required');
    invariant(tableName, 'Table name is required');

    updateConnectionState(currentConnectionName, 'openedTable', tableName);
  }, [currentConnectionName, tableName, updateConnectionState]);

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
