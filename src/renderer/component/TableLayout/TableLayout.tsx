import { ReactElement, useCallback, useEffect, useState } from 'react';
import { Button, Flex } from 'antd';
import type { FieldPacket, RowDataPacket } from 'mysql2/promise';
import { useConnectionContext } from '../../../contexts/ConnectionContext';
import { useTranslation } from '../../../i18n';
import ButtonLink from '../ButtonLink';
import WhereFilter from '../Query/WhereFilter';
import TableGrid from '../TableGrid';

interface TableNameProps {
  tableName: string;
  database: string;
  primaryKeys: Array<string>;
  where?: string;
}
const DEFAULT_LIMIT = 100;

export function TableLayout({
  tableName,
  database,
  primaryKeys,
  where,
}: TableNameProps): ReactElement {
  const { t } = useTranslation();
  const { currentConnectionSlug } = useConnectionContext();
  const [result, setResult] = useState<null | RowDataPacket[]>(null);
  const [fields, setFields] = useState<null | FieldPacket[]>(null);
  const [error, setError] = useState<null | Error>(null);
  const [currentOffset, setCurrentOffset] = useState<number>(0);

  const fetchTableData = useCallback(
    (offset: number) => {
      const query = `SELECT * FROM ${database}.${tableName} ${
        where ? ` WHERE ${where}` : ''
      } LIMIT ${DEFAULT_LIMIT} OFFSET ${offset};`;

      window.sql
        .executeQuery<RowDataPacket[]>(query)
        .then(([result, fields]) => {
          setCurrentOffset(offset);
          setFields(fields.map((field) => ({ ...field, table: tableName })));
          setResult((prev) =>
            offset > 0 && prev ? prev.concat(result) : result
          );
        })
        .catch((err) => {
          setError(err);
        });
    },
    [database, tableName, where]
  );

  useEffect(() => {
    fetchTableData(currentOffset);
  }, [fetchTableData, currentOffset]);

  return (
    <Flex vertical gap="small" style={{ height: '100%' }}>
      <div>
        <h3>{t('table.filters.title')}</h3>
        <WhereFilter defaultValue={where ?? ''} />
      </div>

      {error ? (
        error.message
      ) : (
        <>
          <TableGrid
            fields={fields}
            result={result}
            primaryKeys={primaryKeys}
            title={() => (
              <>
                {tableName}
                <ButtonLink
                  style={{ marginLeft: '1em' }}
                  to={`/connections/${currentConnectionSlug}/${database}/tables/${tableName}/structure`}
                >
                  STRUCTURE
                </ButtonLink>
              </>
            )}
          />

          <Flex justify="center" align="center">
            <Button
              onClick={() => fetchTableData(currentOffset + DEFAULT_LIMIT)}
              type="primary"
            >
              {t('table.rows.loadMore')}
            </Button>
          </Flex>
        </>
      )}
    </Flex>
  );
}
