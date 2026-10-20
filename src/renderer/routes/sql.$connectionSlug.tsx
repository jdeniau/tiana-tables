import { Suspense, lazy, useEffect, useRef, useState } from 'react';
import {
  QueryClient,
  queryOptions,
  skipToken,
  useQuery,
} from '@tanstack/react-query';
import { Form, Splitter } from 'antd';
import { ActionFunctionArgs, useFetcher, useParams } from 'react-router-dom';
import { styled } from 'styled-components';
import invariant from 'tiny-invariant';
import { PANEL } from '../../configuration/panels';
import { useTranslation } from '../../i18n';
import type { DatabaseEngine } from '../../sql/engine';
import { hasLimitClause } from '../../sql/hasLimitClause';
import { RunMode, toRunMode } from '../../sql/runMode';
import { splitStatements, statementAtOffset } from '../../sql/splitStatements';
import { isSqlError } from '../../sql/sqlError';
import type { RawSqlEditorHandle } from '../component/MonacoEditor/RawSqlEditor';
import RawSqlResult, {
  SqlActionReturnTypes,
  StatementOutcome,
} from '../component/Query/RawSqlResult/RowDataPacketResult';
import { RunQueryButton } from '../component/Query/RunQueryButton';
import {
  Region,
  RegionBody,
  RegionGroup,
  RegionHeader,
  RegionMeta,
  RegionName,
} from '../component/Style/Region';
import { fill } from '../component/Style/fill';
import { loadDialect, useDialect } from '../hooks/useDialect';
import { usePanelSize } from '../hooks/usePanelSize';
import { queryKeys } from '../queryKeys';

// antd's Form is a block between the region body and the editor
const FillForm = styled(Form)`
  ${fill}
`;

const RawSqlEditor = lazy(() =>
  import('../component/MonacoEditor/RawSqlEditor').then((module) => ({
    default: module.RawSqlEditor,
  }))
);

// const DEFAULT_VALUE = `SELECT *  FROM employees e WHERE e.gender = 'F' LIMIT 10;`;
function useSqlFileStorage(
  connectionSlug: string
): [string | null, (value: string) => void] {
  const [sqlQuery, setSqlQuery] = useState<string | null>(null);

  useEffect(() => {
    window.sqlFileStorage
      .loadLatest(connectionSlug)
      .then((v) => setSqlQuery(v ?? ''));
  }, [connectionSlug]);

  const saveValue = (value: string) => {
    window.sqlFileStorage.saveLatest(connectionSlug, value);
  };

  return [sqlQuery, saveValue];
}

async function runStatement(
  sql: string,
  engine: DatabaseEngine
): Promise<StatementOutcome> {
  const started = performance.now();

  try {
    const result = await window.sql.executeQuery(sql, true);

    return {
      sql,
      result,
      hasLimit: hasLimitClause(sql, engine),
      durationMs: Math.round(performance.now() - started),
    };
  } catch (error) {
    if (!isSqlError(error)) {
      throw error;
    }

    return { sql, error };
  }
}

/** the last run of the page: written by the action, never fetched, kept until the connection closes */
function sqlResultQuery(connectionSlug: string, databaseName: string) {
  return queryOptions<SqlActionReturnTypes>({
    queryKey: queryKeys.sqlResult(connectionSlug, databaseName),
    queryFn: skipToken,
    gcTime: Infinity,
  });
}

/** runs the editor's statements, and keeps what they answered for the next visit of the page */
export const action =
  (queryClient: QueryClient) =>
  async ({
    request,
    params,
  }: ActionFunctionArgs): Promise<SqlActionReturnTypes> => {
    const { connectionSlug, databaseName } = params;

    invariant(connectionSlug, 'Connection slug is required');
    invariant(databaseName, 'Database name is required');

    const result = await runEditor(request, connectionSlug, databaseName);

    queryClient.setQueryData(
      sqlResultQuery(connectionSlug, databaseName).queryKey,
      result
    );

    return result;
  };

async function runEditor(
  request: Request,
  connectionSlug: string,
  databaseName: string
): Promise<SqlActionReturnTypes> {
  const formData = await request.formData();
  const content = formData.get('raw');
  const mode = toRunMode(formData.get('mode'));
  const caretOffset = Number(formData.get('caretOffset'));

  invariant(typeof content === 'string', 'Query as string is required');

  const dialect = await loadDialect(connectionSlug);
  const statements = splitStatements(content, dialect.engine);
  const caretStatement = statementAtOffset(statements, caretOffset);
  const toRun =
    mode === RunMode.All ? statements : caretStatement ? [caretStatement] : [];

  if (toRun.length === 0) {
    return { outcomes: [] };
  }

  const useDatabase = dialect.useDatabase(databaseName);

  try {
    await window.sql.executeQuery(useDatabase);
  } catch (error) {
    if (!isSqlError(error)) {
      throw error;
    }

    return { outcomes: [{ sql: useDatabase, error }] };
  }

  const outcomes: StatementOutcome[] = [];

  for (const { sql } of toRun) {
    const outcome = await runStatement(sql, dialect.engine);

    outcomes.push(outcome);

    // stop at the first error: what comes after it was written expecting the
    // statement that just failed to have run
    if (outcome.error) {
      break;
    }
  }

  return { outcomes };
}

/** a page per connection: the form of another one starts from its own query */
export default function SqlPage() {
  const { connectionSlug } = useParams();

  return <ConnectionSqlPage key={connectionSlug} />;
}

function ConnectionSqlPage() {
  const { t } = useTranslation();
  const [form] = Form.useForm();
  const { connectionSlug, databaseName } = useParams();

  invariant(connectionSlug, 'Connection slug is required');
  invariant(databaseName, 'Database name is required');

  const fetcher = useFetcher<SqlActionReturnTypes>();
  const { data } = useQuery(sqlResultQuery(connectionSlug, databaseName));
  const [sqlQuery, saveSqlQuery] = useSqlFileStorage(connectionSlug);
  const { panelProps, onResizeEnd } = usePanelSize(PANEL.SQL_EDITOR);
  const editorRef = useRef<RawSqlEditorHandle>(null);
  const { engine } = useDialect();
  const [statementCount, setStatementCount] = useState(0);

  const { state } = fetcher;

  // Which statement to run is decided from the caret, which only the editor
  // knows about, so the whole content and the caret travel to the action.
  const run = (mode: RunMode): void => {
    const content: string = form.getFieldValue('raw') ?? '';

    saveSqlQuery(content);
    fetcher.submit(
      {
        raw: content,
        mode,
        caretOffset: String(editorRef.current?.getCaretOffset() ?? 0),
      },
      { method: 'post' }
    );
  };

  if (sqlQuery === null) {
    return null;
  }

  // the two regions share nothing but the bar of the splitter, which is the
  // rule between them
  return (
    <Splitter orientation="vertical" onResizeEnd={onResizeEnd}>
      <Splitter.Panel {...panelProps}>
        <Region>
          <RegionHeader>
            <RegionGroup>
              <RegionName>{t('rawSql.query.title')}</RegionName>
              {statementCount > 0 && (
                <RegionMeta>
                  {t('rawSql.query.statementCount', { count: statementCount })}
                </RegionMeta>
              )}
            </RegionGroup>

            <RunQueryButton
              disabled={state === 'submitting'}
              statementCount={statementCount}
              onRun={run}
            />
          </RegionHeader>

          <RegionBody>
            <FillForm form={form} initialValues={{ raw: sqlQuery }}>
              <Suspense fallback={<div />}>
                {/* `noStyle` renders the control alone: without it antd wraps the
                    editor in a few divs that would not pass the height down */}
                <Form.Item name="raw" valuePropName="defaultValue" noStyle>
                  <RawSqlEditor
                    autoFocus
                    engine={engine}
                    ref={editorRef}
                    style={{ height: '100%' }}
                    onStatementCountChange={setStatementCount}
                    onSubmit={() => run(RunMode.Current)}
                  />
                </Form.Item>
              </Suspense>
            </FillForm>
          </RegionBody>
        </Region>
      </Splitter.Panel>

      <Splitter.Panel>
        <RawSqlResult
          data={data}
          submitting={state === 'submitting'}
          rowsAsArray
        />
      </Splitter.Panel>
    </Splitter>
  );
}
