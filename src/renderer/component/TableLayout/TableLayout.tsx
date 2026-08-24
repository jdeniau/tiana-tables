import { ReactElement, useCallback, useEffect, useState } from 'react';
import { Button, Flex, Splitter } from 'antd';
import type { FieldPacket, RowDataPacket } from 'mysql2/promise';
import { styled } from 'styled-components';
import { PANEL } from '../../../configuration/panels';
import { useConnectionContext } from '../../../contexts/ConnectionContext';
import { useTranslation } from '../../../i18n';
import { usePanelSize } from '../../hooks/usePanelSize';
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

const Pane = styled(Flex)`
  height: 100%;
  min-height: 0;
  overflow: auto;
`;

export function TableLayout({
  tableName,
  database,
  primaryKeys,
  where,
}: TableNameProps): ReactElement {
  const { t } = useTranslation();
  const { currentConnectionSlug } = useConnectionContext();
  const { panelProps, onResizeEnd } = usePanelSize(PANEL.TABLE_FILTERS);
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

  // a written cell is patched in place rather than re-fetched: the value comes
  // from the server (see `updateCell`), so the row is as fresh as a reload
  // would make it — without losing the rows already loaded, nor the scroll
  const handleValueUpdated = useCallback(
    (rowIndex: number, columnName: string, value: unknown) => {
      setResult((previous) => {
        const row = previous?.[rowIndex];

        if (!previous || !row) {
          return previous;
        }

        const next = [...previous];
        next[rowIndex] = { ...row, [columnName]: value };

        return next;
      });
    },
    []
  );

  return (
    <Splitter
      orientation="vertical"
      onResizeEnd={onResizeEnd}
      style={{ height: '100%' }}
    >
      <Splitter.Panel {...panelProps}>
        <Pane vertical gap="small">
          <h3 style={{ margin: 0 }}>{t('table.filters.title')}</h3>
          <WhereFilter defaultValue={where ?? ''} />
        </Pane>
      </Splitter.Panel>

      <Splitter.Panel>
        <Pane vertical gap="small">
          {error ? (
            error.message
          ) : (
            <>
              <TableGrid
                fields={fields}
                result={result}
                primaryKeys={primaryKeys}
                onValueUpdated={handleValueUpdated}
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
                  color="primary"
                  variant="solid"
                >
                  {t('table.rows.loadMore')}
                </Button>
              </Flex>
            </>
          )}
        </Pane>
      </Splitter.Panel>
    </Splitter>
  );
}
