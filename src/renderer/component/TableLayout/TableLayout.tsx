import { ReactElement, useCallback, useEffect, useState } from 'react';
import { Button, Flex } from 'antd';
import type { FieldPacket, RowDataPacket } from 'mysql2/promise';
import { useConnectionContext } from '../../../contexts/ConnectionContext';
import { usePendingEditContext } from '../../../contexts/PendingEditContext';
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
  where: defaultWhere,
}: TableNameProps): ReactElement {
  const { t } = useTranslation();
  const { currentConnectionSlug } = useConnectionContext();
  const [result, setResult] = useState<null | RowDataPacket[]>(null);
  const [fields, setFields] = useState<null | FieldPacket[]>(null);
  const [error, setError] = useState<null | Error>(null);
  const [currentOffset, setCurrentOffset] = useState<number>(0);
  const [where, setWhere] = useState<string>(defaultWhere ?? '');
  const { findPendingEdits } = usePendingEditContext();

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

  if (error) {
    return <div>{error.message}</div>;
  }

  const resultWithActiveEdits = result
    ? result.map((row) => {
        const pendingEdits = findPendingEdits(row, tableName);

        return pendingEdits.reduce((acc, pendingEdit) => {
          const { values } = pendingEdit;

          return {
            ...acc,
            ...values,
          };
        }, row);
      })
    : null;

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
        editable
        fields={fields}
        result={resultWithActiveEdits}
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
    </Flex>
  );
}
