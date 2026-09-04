import { ReactElement, useEffect, useState } from 'react';
import { Empty, Segmented, Spin } from 'antd';
import { Fetcher } from 'react-router';
import { styled } from 'styled-components';
import { useTranslation } from '../../../../i18n';
import { SqlError } from '../../../../sql/errorSerializer';
import {
  isResultSetHeader,
  isRowDataPacketArray,
} from '../../../../sql/type-guard';
import { QueryResult } from '../../../../sql/types';
import { selection, space } from '../../../theme';
import ChartPanel from '../../Chart/ChartPanel';
import { chartUnavailableReason } from '../../Chart/chartConfig';
import {
  Region,
  RegionBody,
  RegionGroup,
  RegionHeader,
  RegionMeta,
  RegionName,
} from '../../Style/Region';
import { Strip, StripItem } from '../../Style/Strip';
import TableGrid from '../../TableGrid';
import SqlErrorComponent from '../SqlErrorComponent';

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
      /** how long the server took to answer */
      durationMs: number;
      error?: undefined;
    }
  | {
      sql: string;
      error: SqlError;
      result?: undefined;
      hasLimit?: undefined;
      durationMs?: undefined;
    };

export type SqlActionReturnTypes = { outcomes: StatementOutcome[] };

type Props = {
  rowsAsArray: boolean;
  fetcher: Fetcher<SqlActionReturnTypes>;
};

enum View {
  Data = 'data',
  Chart = 'chart',
}

const NO_OUTCOMES: StatementOutcome[] = [];

/** how much of a statement a tab label shows before eliding it */
const LABEL_LENGTH = 40;

/** the statement on one line, short enough to sit in a tab */
function statementSummary(sql: string): string {
  const oneLine = sql.replace(/\s+/g, ' ').trim();

  return oneLine.length > LABEL_LENGTH
    ? `${oneLine.slice(0, LABEL_LENGTH)}…`
    : oneLine;
}

/** the tabular part of an outcome, when it has one */
function rowsOf(outcome: StatementOutcome) {
  const first = outcome.result?.[0];

  return first && isRowDataPacketArray(first) ? first : null;
}

const Centered = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  padding: ${space.xl};
`;

/**
 * Every pane stays mounted, so `TableGrid`'s virtualization state and the
 * chart's axis selection survive switching statements or views; only the
 * active one is displayed.
 */
const Pane = styled.div<{ $active: boolean }>`
  display: ${({ $active }) => ($active ? 'flex' : 'none')};
  flex-direction: column;
  height: 100%;
  min-height: 0;
`;

const Written = styled.div`
  padding: ${space.md};
`;

/**
 * The Data / Chart switch: a 20px segmented control in a base02 frame. The
 * control itself is styled through its antd tokens, in `ThemeContext`.
 */
const ViewSwitch = styled.div`
  display: inline-flex;
  border: 1px solid ${selection};
  letter-spacing: 0.06em;
  text-transform: uppercase;
`;

function OutcomePane({
  outcome,
  view,
  rowsAsArray,
}: {
  outcome: StatementOutcome;
  view: View;
  rowsAsArray: boolean;
}): ReactElement {
  const { t } = useTranslation();
  const { result, error } = outcome;

  if (error) {
    return <SqlErrorComponent error={error} />;
  }

  const rows = rowsOf(outcome);
  const fields = result[1] ?? [];

  if (rows) {
    return (
      <>
        <Pane $active={view === View.Data}>
          <TableGrid result={rows} fields={fields} rowsAsArray={rowsAsArray} />
        </Pane>
        <Pane $active={view === View.Chart}>
          <ChartPanel result={rows} fields={fields} rowsAsArray={rowsAsArray} />
        </Pane>
      </>
    );
  }

  if (isResultSetHeader(result[0])) {
    return (
      <Written>
        <div>
          {t('rawSql.result.affectedRows')} {result[0].affectedRows}
        </div>
        <div>
          {t('rawSql.result.insertId')} {result[0].insertId}
        </div>
      </Written>
    );
  }

  // TODO handle all other types of query result
  return <></>;
}

/**
 * The result region of the SQL page: one header row holding the name, the
 * statements of the last run as a strip, what the active one answered in
 * numbers, and the Data / Chart switch. The body shows the active statement.
 */
export default function RawSqlResult({ fetcher, rowsAsArray = false }: Props) {
  const { t } = useTranslation();
  const { data, state } = fetcher;
  const outcomes = data?.outcomes ?? NO_OUTCOMES;

  // `null` until the user picks one: a new run, with other statements, must
  // not keep pointing at a tab that no longer exists
  const [chosen, setChosen] = useState<number | null>(null);
  const [view, setView] = useState<View>(View.Data);

  useEffect(() => {
    setChosen(null);
  }, [outcomes]);

  // A run stops at the first error, so a failed statement is always the last
  // one — and the one worth reading first.
  const failedIndex = outcomes.findIndex(({ error }) => error);
  const active = chosen ?? Math.max(failedIndex, 0);
  const outcome = outcomes[active];
  const rows = outcome ? rowsOf(outcome) : null;

  const unavailable = outcome
    ? chartUnavailableReason({
        isTabular: rows !== null,
        hasLimit: outcome.hasLimit ?? false,
        rowCount: rows?.length ?? 0,
        fields: outcome.result?.[1] ?? [],
      })
    : null;
  const shownView = unavailable === null ? view : View.Data;

  const meta =
    outcome && outcome.durationMs !== undefined
      ? rows
        ? t('rawSql.result.meta.rows', {
            count: rows.length,
            ms: outcome.durationMs,
          })
        : t('rawSql.result.meta.duration', { ms: outcome.durationMs })
      : null;

  let body: ReactElement | null = null;

  if (state === 'submitting') {
    body = (
      <Centered>
        <Spin />
      </Centered>
    );
  } else if (data && outcomes.length === 0) {
    body = (
      <Centered>
        <Empty description={t('rawSql.result.noStatement')} />
      </Centered>
    );
  } else if (data) {
    body = (
      <>
        {outcomes.map((one, index) => (
          <Pane key={index} $active={index === active}>
            <OutcomePane
              outcome={one}
              view={shownView}
              rowsAsArray={rowsAsArray}
            />
          </Pane>
        ))}
      </>
    );
  }

  return (
    <Region>
      <RegionHeader>
        <RegionGroup>
          <RegionName>{t('rawSql.result.title')}</RegionName>
          {outcomes.length > 1 && (
            <Strip>
              {outcomes.map((one, index) => (
                <StripItem
                  key={index}
                  active={index === active}
                  failed={one.error !== undefined}
                  title={one.sql}
                  onClick={() => setChosen(index)}
                >
                  {statementSummary(one.sql)}
                </StripItem>
              ))}
            </Strip>
          )}
        </RegionGroup>

        {outcome && !outcome.error && (
          <RegionGroup style={{ gap: space.md }}>
            {meta && <RegionMeta>{meta}</RegionMeta>}
            {rows && (
              <ViewSwitch>
                <Segmented<View>
                  size="small"
                  value={shownView}
                  onChange={setView}
                  options={[
                    { label: t('chart.tab.data'), value: View.Data },
                    {
                      label: t('chart.tab.chart'),
                      value: View.Chart,
                      // The option stays in place when it cannot be used: an
                      // absent option is a mystery, a greyed one that says why
                      // on hover is not.
                      disabled: unavailable !== null,
                      tooltip: unavailable
                        ? t('chart.unavailable', { reason: unavailable })
                        : undefined,
                    },
                  ]}
                />
              </ViewSwitch>
            )}
          </RegionGroup>
        )}
      </RegionHeader>

      <RegionBody>{body}</RegionBody>
    </Region>
  );
}
