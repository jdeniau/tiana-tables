import { ReactElement, useCallback, useEffect, useState } from 'react';
import { Button, Splitter } from 'antd';
import type { FieldPacket, RowDataPacket } from 'mysql2/promise';
import { useNavigate } from 'react-router-dom';
import { PANEL } from '../../../configuration/panels';
import { useConnectionContext } from '../../../contexts/ConnectionContext';
import { useTranslation } from '../../../i18n';
import { escapeIdentifier } from '../../../sql/escapeIdentifier';
import { usePanelSize } from '../../hooks/usePanelSize';
import ButtonLink from '../ButtonLink';
import WhereFilter from '../Query/WhereFilter';
import {
  Region,
  RegionBody,
  RegionFoot,
  RegionGroup,
  RegionHeader,
  RegionMeta,
  RegionName,
} from '../Style/Region';
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
  const navigate = useNavigate();
  const { currentConnectionSlug } = useConnectionContext();
  const { panelProps, onResizeEnd } = usePanelSize(PANEL.TABLE_FILTERS);
  const [result, setResult] = useState<null | RowDataPacket[]>(null);
  const [fields, setFields] = useState<null | FieldPacket[]>(null);
  const [error, setError] = useState<null | Error>(null);
  const [currentOffset, setCurrentOffset] = useState<number>(0);

  const fetchTableData = useCallback(
    (offset: number) => {
      // the identifiers are escaped, the filter is not: `where` is SQL the
      // user wrote, and is sent as written
      const query = `SELECT * FROM ${escapeIdentifier(
        database
      )}.${escapeIdentifier(tableName)} ${
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

  // the filter built by the grid's context menu replaces the current one, and
  // takes the same route as the filter form: the loader reads `?where`, saves it
  // and remounts this layout, so the editor reopens on the clause
  const handleFilterChange = useCallback(
    (where: string) => {
      navigate(`?where=${encodeURIComponent(where)}`);
    },
    [navigate]
  );

  // the same two-region split as the SQL page, so the two screens read as
  // siblings: filters on top, data below
  return (
    <Splitter
      orientation="vertical"
      onResizeEnd={onResizeEnd}
      style={{ height: '100%' }}
    >
      <Splitter.Panel {...panelProps}>
        <WhereFilter defaultValue={where ?? ''} tableName={tableName} />
      </Splitter.Panel>

      <Splitter.Panel>
        <Region>
          <RegionHeader>
            <RegionGroup>
              <RegionName>{tableName}</RegionName>
              {result && (
                <RegionMeta>
                  {t('table.rows.count', { count: result.length })}
                </RegionMeta>
              )}
            </RegionGroup>

            <ButtonLink
              size="small"
              variant="link"
              color="default"
              to={`/connections/${currentConnectionSlug}/${database}/tables/${tableName}/structure`}
            >
              {t('table.structure.link')}
            </ButtonLink>
          </RegionHeader>

          <RegionBody>
            {error ? (
              error.message
            ) : (
              <TableGrid
                fields={fields}
                result={result}
                primaryKeys={primaryKeys}
                onValueUpdated={handleValueUpdated}
                onFilterChange={handleFilterChange}
              />
            )}
          </RegionBody>

          {!error && (
            <RegionFoot>
              <Button
                type="text"
                size="small"
                onClick={() => fetchTableData(currentOffset + DEFAULT_LIMIT)}
              >
                {t('table.rows.loadMore')}
              </Button>
            </RegionFoot>
          )}
        </Region>
      </Splitter.Panel>
    </Splitter>
  );
}
