import { ReactElement, useCallback, useEffect, useState } from 'react';
import { Button, Flex } from 'antd';
import type { FieldPacket, RowDataPacket } from 'mysql2/promise';
import { useDatabaseContext } from '../../../contexts/DatabaseContext';
import { useTranslation } from '../../../i18n';
import WhereFilter from '../Query/WhereFilter';
import TableGrid from '../TableGrid';

interface TableNameProps {
  tableName: string;
  database: string;
  primaryKeys: Array<string>;
}
const DEFAULT_LIMIT = 100;

export function TableLayout({
  tableName,
  database,
  primaryKeys,
}: TableNameProps): ReactElement {
  const { t } = useTranslation();
  const { executeQuery } = useDatabaseContext();
  const [result, setResult] = useState<null | RowDataPacket[]>(null);
  const [fields, setFields] = useState<null | FieldPacket[]>(null);
  const [error, setError] = useState<null | Error>(null);
  const [currentOffset, setCurrentOffset] = useState<number>(0);
  const [where, setWhere] = useState<string>('');

  const fetchTableData = useCallback(
    (offset: number) => {
      const query = `SELECT * FROM ${database}.${tableName} ${
        where ? ` WHERE ${where}` : ''
      } LIMIT ${DEFAULT_LIMIT} OFFSET ${offset};`;

      executeQuery<RowDataPacket[]>(query)
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
    <Flex vertical gap="small" style={{ height: '100%' }}>
      <div>
        <h3>{t('table.filters.title')}</h3>
        <WhereFilter
          defaultValue={where}
          onSubmit={(where) => {
            setCurrentOffset(0);
            setWhere(where);
          }}
        />
      </div>

      <TableGrid
        fields={fields}
        result={result}
        primaryKeys={primaryKeys}
        title={() => tableName}
      />

      <Flex justify="center" align="center">
        <Button
          onClick={() => fetchTableData(currentOffset + DEFAULT_LIMIT)}
          type="primary"
        >
          {t('table.rows.loadMore')}
        </Button>
      </Flex>
    </Flex>
  );
}
