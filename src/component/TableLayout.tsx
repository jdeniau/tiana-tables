import {
  ReactElement,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import type { FieldPacket, RowDataPacket } from 'mysql2/promise';
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
  primaryKeys: Array<string>;
}

const DEFAULT_LIMIT = 100;

function useTableHeight(): [number, React.RefObject<HTMLDivElement>] {
  const [yTableScroll, setYTableScroll] = useState<number>(0);
  const resizeRef = useRef<HTMLDivElement | null>(null);

  const resizeObserver = useMemo(
    () =>
      new ResizeObserver((entries) => {
        const entry = entries[0];
        const divHeight = entry.borderBoxSize[0].blockSize;

        const tableHeader =
          resizeRef.current?.querySelector('.ant-table-header');

        const tableHeaderHeight =
          tableHeader?.getBoundingClientRect().height ?? 0;

        // I don't know why we need to subtract 1 from the height, but if not, the div will have a scrollbar
        setYTableScroll(divHeight - tableHeaderHeight - 1);
      }),
    []
  );

  useEffect(() => {
    const resizeRefCurrent = resizeRef.current;

    if (resizeRefCurrent) {
      resizeObserver.observe(resizeRefCurrent);
    }

    return () => {
      if (resizeRefCurrent) {
        resizeObserver.unobserve(resizeRefCurrent);
      }
    };
  }, [resizeObserver]);

  return [yTableScroll, resizeRef];
}

function TableLayout({
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

  const [yTableScroll, resizeRef] = useTableHeight();

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
        <h3>{tableName}</h3>

        <WhereFilter
          defaultValue={where}
          onSubmit={(where) => {
            setCurrentOffset(0);
            setWhere(where);
          }}
        />
      </div>

      <div style={{ overflow: 'auto', flex: '1' }} ref={resizeRef}>
        <TableGrid
          fields={fields}
          result={result}
          primaryKeys={primaryKeys}
          yTableScroll={yTableScroll}
        />
      </div>

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

type Props = { primaryKeys: Array<string> };

function TableGridWithConnection({ primaryKeys }: Props) {
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
      primaryKeys={primaryKeys}
    />
  );
}

export default TableGridWithConnection;
