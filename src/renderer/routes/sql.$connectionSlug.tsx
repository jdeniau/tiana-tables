import { Suspense, lazy, useEffect, useRef, useState } from 'react';
import { Form, Splitter } from 'antd';
import { ActionFunctionArgs, useFetcher } from 'react-router-dom';
import invariant from 'tiny-invariant';
import { PANEL } from '../../configuration/panels';
import { useTranslation } from '../../i18n';
import { escapeIdentifier } from '../../sql/escapeIdentifier';
import { hasLimitClause } from '../../sql/hasLimitClause';
import { isSqlError } from '../../sql/isSqlError';
import { RunMode, toRunMode } from '../../sql/runMode';
import { splitStatements, statementAtOffset } from '../../sql/splitStatements';
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
import { usePanelSize } from '../hooks/usePanelSize';

const RawSqlEditor = lazy(() =>
  import('../component/MonacoEditor/RawSqlEditor').then((module) => ({
    default: module.RawSqlEditor,
  }))
);

// const DEFAULT_VALUE = `SELECT *  FROM employees e WHERE e.gender = 'F' LIMIT 10;`;
function useSqlFileStorage(): [string | null, (value: string) => void] {
  const [sqlQuery, setSqlQuery] = useState<string | null>(null);

  useEffect(() => {
    window.sqlFileStorage.loadLatest().then((v) => setSqlQuery(v ?? ''));
  }, []);

  const saveValue = (value: string) => {
    window.sqlFileStorage.saveLatest(value);
  };

  return [sqlQuery, saveValue];
}

async function runStatement(sql: string): Promise<StatementOutcome> {
  const started = performance.now();

  try {
    const result = await window.sql.executeQuery(sql, true);

    return {
      sql,
      result,
      hasLimit: hasLimitClause(sql),
      durationMs: Math.round(performance.now() - started),
    };
  } catch (error) {
    if (!isSqlError(error)) {
      throw error;
    }

    return { sql, error };
  }
}

export async function action({
  request,
  params,
}: ActionFunctionArgs): Promise<SqlActionReturnTypes> {
  const { databaseName } = params;

  invariant(databaseName, 'Database name is required');

  const formData = await request.formData();
  const content = formData.get('raw');
  const mode = toRunMode(formData.get('mode'));
  const caretOffset = Number(formData.get('caretOffset'));

  invariant(typeof content === 'string', 'Query as string is required');

  const statements = splitStatements(content);
  const caretStatement = statementAtOffset(statements, caretOffset);
  const toRun =
    mode === RunMode.All ? statements : caretStatement ? [caretStatement] : [];

  if (toRun.length === 0) {
    return { outcomes: [] };
  }

  const useDatabase = `USE ${escapeIdentifier(databaseName)};`;

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
    const outcome = await runStatement(sql);

    outcomes.push(outcome);

    // stop at the first error: what comes after it was written expecting the
    // statement that just failed to have run
    if (outcome.error) {
      break;
    }
  }

  return { outcomes };
}

export default function SqlPage() {
  const { t } = useTranslation();
  const [form] = Form.useForm();
  const fetcher = useFetcher<SqlActionReturnTypes>();
  const [sqlQuery, saveSqlQuery] = useSqlFileStorage();
  const { panelProps, onResizeEnd } = usePanelSize(PANEL.SQL_EDITOR);
  const editorRef = useRef<RawSqlEditorHandle>(null);
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
    <Splitter
      orientation="vertical"
      onResizeEnd={onResizeEnd}
      style={{ height: '100%' }}
    >
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
            <Form
              form={form}
              initialValues={{ raw: sqlQuery }}
              style={{ height: '100%' }}
            >
              <Suspense fallback={<div style={{ height: '100%' }}></div>}>
                {/* `noStyle` renders the control alone: without it antd wraps the
                    editor in a few divs that would not pass the height down */}
                <Form.Item name="raw" valuePropName="defaultValue" noStyle>
                  <RawSqlEditor
                    ref={editorRef}
                    style={{ height: '100%' }}
                    onStatementCountChange={setStatementCount}
                    onSubmit={() => run(RunMode.Current)}
                  />
                </Form.Item>
              </Suspense>
            </Form>
          </RegionBody>
        </Region>
      </Splitter.Panel>

      <Splitter.Panel>
        <RawSqlResult fetcher={fetcher} rowsAsArray />
      </Splitter.Panel>
    </Splitter>
  );
}
