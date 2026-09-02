import { ReactElement } from 'react';
import { Empty, Spin, Tooltip } from 'antd';
import { Fetcher } from 'react-router';
import { styled } from 'styled-components';
import invariant from 'tiny-invariant';
import { useTranslation } from '../../../../i18n';
import { SqlError } from '../../../../sql/errorSerializer';
import {
  isResultSetHeader,
  isRowDataPacketArray,
} from '../../../../sql/type-guard';
import { QueryResult } from '../../../../sql/types';
import { variableForeground } from '../../../theme';
import ChartPanel from '../../Chart/ChartPanel';
import { chartUnavailableReason } from '../../Chart/chartConfig';
import TableGrid from '../../TableGrid';
import SqlErrorComponent from '../SqlErrorComponent';
import { FullHeightTabs } from './FullHeightTabs';

/** What one statement of the editor answered with. */
export type StatementOutcome =
  | {
      sql: string;
      result: Awaited<QueryResult>;
      /**
       * Whether the statement carries a `LIMIT`. Read where the query text is,
       * so the result panel can tell a complete result set from a truncated
       * one without having to hold on to the SQL.
       */
      hasLimit: boolean;
      error?: undefined;
    }
  | {
      sql: string;
      error: SqlError;
      result?: undefined;
      hasLimit?: undefined;
    };

export type SqlActionReturnTypes = { outcomes: StatementOutcome[] };

type Props = {
  rowsAsArray: boolean;
  fetcher: Fetcher<SqlActionReturnTypes>;
};

/** how much of a statement a tab label shows before eliding it */
const LABEL_LENGTH = 24;

const FailedLabel = styled.span`
  color: ${variableForeground};
`;

/** the statement on one line, short enough to sit in a tab */
function statementSummary(sql: string): string {
  const oneLine = sql.replace(/\s+/g, ' ').trim();

  return oneLine.length > LABEL_LENGTH
    ? `${oneLine.slice(0, LABEL_LENGTH)}…`
    : oneLine;
}

function StatementOutcomePanel({
  outcome,
  rowsAsArray,
}: {
  outcome: StatementOutcome;
  rowsAsArray: boolean;
}): ReactElement {
  const { t } = useTranslation();
  const { result, error, hasLimit } = outcome;

  if (error) {
    return <SqlErrorComponent error={error} />;
  }

  const rows = isRowDataPacketArray(result[0]) ? result[0] : null;
  const fields = result[1] ?? [];

  const unavailable = chartUnavailableReason({
    isTabular: rows !== null,
    hasLimit,
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

              {isResultSetHeader(result[0]) && (
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

  const { outcomes } = data;
  const [only] = outcomes;

  if (!only) {
    return <Empty description={t('rawSql.result.noStatement')} />;
  }

  if (outcomes.length === 1) {
    return <StatementOutcomePanel outcome={only} rowsAsArray={rowsAsArray} />;
  }

  // A run stops at the first error, so a failed statement is always the last
  // one — and the one worth reading first.
  const failedIndex = outcomes.findIndex(({ error }) => error);

  return (
    <FullHeightTabs
      // the active tab is held in a state: a new run, with a different number
      // of statements, must not keep pointing at a tab that no longer exists
      key={outcomes.length}
      defaultActiveKey={String(failedIndex === -1 ? 0 : failedIndex)}
      items={outcomes.map((outcome, index) => {
        const label = t('rawSql.result.statement', {
          number: index + 1,
          sql: statementSummary(outcome.sql),
        });

        return {
          key: String(index),
          label: (
            <Tooltip title={outcome.sql}>
              {outcome.error ? (
                <FailedLabel>{label}</FailedLabel>
              ) : (
                <span>{label}</span>
              )}
            </Tooltip>
          ),
          children: (
            <StatementOutcomePanel
              outcome={outcome}
              rowsAsArray={rowsAsArray}
            />
          ),
        };
      })}
    />
  );
}
