import { Spin, Tooltip } from 'antd';
import { Fetcher } from 'react-router';
import invariant from 'tiny-invariant';
import { useTranslation } from '../../../../i18n';
import { SqlError } from '../../../../sql/errorSerializer';
import {
  isResultSetHeader,
  isRowDataPacketArray,
} from '../../../../sql/type-guard';
import { QueryResult } from '../../../../sql/types';
import ChartPanel from '../../Chart/ChartPanel';
import { chartUnavailableReason } from '../../Chart/chartConfig';
import TableGrid from '../../TableGrid';
import SqlErrorComponent from '../SqlErrorComponent';
import { FullHeightTabs } from './FullHeightTabs';

type Props = {
  rowsAsArray: boolean;
  fetcher: Fetcher<
    | {
        result: Awaited<QueryResult>;
        hasLimit: boolean;
        error?: undefined;
      }
    | {
        error: SqlError;
        result?: undefined;
        hasLimit?: undefined;
      }
  >;
};

export default function RawSqlResult({ fetcher, rowsAsArray = false }: Props) {
  const { t } = useTranslation();
  const { data, state } = fetcher;

  if (state === 'idle' && !data) {
    return null;
  }

  if (state === 'submitting') {
    return <Spin />;
  }

  invariant(data, 'Data is required');

  const { result, error, hasLimit } = data;

  if (error) {
    return <SqlErrorComponent error={error} />;
  }

  const rows = result && isRowDataPacketArray(result[0]) ? result[0] : null;
  const fields = result?.[1] ?? [];

  const unavailable = chartUnavailableReason({
    isTabular: rows !== null,
    hasLimit: hasLimit ?? false,
    rowCount: rows?.length ?? 0,
    fields,
  });

  return (
    <FullHeightTabs
      defaultActiveKey="data"
      items={[
        {
          key: 'data',
          label: t('chart.tab.data'),
          children: (
            <>
              {rows && (
                // TOOD maybe fetch foreign keys of queried table to activate navlinks
                <TableGrid
                  result={rows}
                  fields={fields}
                  rowsAsArray={rowsAsArray}
                  title={() => t('rawSql.result.title')}
                />
              )}

              {result && isResultSetHeader(result[0]) && (
                <div>
                  <div>
                    {t('rawSql.result.affectedRows')} {result[0].affectedRows}
                  </div>
                  <div>
                    {t('rawSql.result.insertId')} {result[0].insertId}
                  </div>
                </div>
              )}
              {/* TODO handle all other types of query result ? if we do handle multiple calls */}
            </>
          ),
        },
        {
          key: 'chart',
          // The tab stays in place when it cannot be used: an absent tab is a
          // mystery, a greyed one that says why on hover is not. The tooltip
          // wraps the label rather than the tab, so it still receives the
          // pointer once antd marks the tab disabled.
          label: (
            <Tooltip
              title={
                unavailable
                  ? t('chart.unavailable', { reason: unavailable })
                  : undefined
              }
            >
              <span>{t('chart.tab.chart')}</span>
            </Tooltip>
          ),
          disabled: unavailable !== null,
          children: rows && (
            <ChartPanel
              result={rows}
              fields={fields}
              rowsAsArray={rowsAsArray}
            />
          ),
        },
      ]}
    />
  );
}
