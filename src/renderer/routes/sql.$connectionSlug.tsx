import { useEffect, useState } from 'react';
import { Button, Flex, Form } from 'antd';
import { ActionFunctionArgs, useFetcher } from 'react-router-dom';
import invariant from 'tiny-invariant';
import { useTranslation } from '../../i18n';
import { SqlError } from '../../sql/errorSerializer';
import { isSqlError } from '../../sql/isSqlError';
import { QueryResult } from '../../sql/types';
import { RawSqlEditor } from '../component/MonacoEditor/RawSqlEditor';
import RawSqlResult from '../component/Query/RawSqlResult/RowDataPacketResult';

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

type SqlActionReturnTypes =
  | {
      result: Awaited<QueryResult>;
    }
  | {
      error: SqlError;
    };

export async function action({
  request,
  params,
}: ActionFunctionArgs): Promise<SqlActionReturnTypes> {
  const { databaseName } = params;

  invariant(databaseName, 'Database name is required');

  const formData = await request.formData();
  const query = formData.get('raw');

  invariant(typeof query === 'string', 'Query as string is required');

  try {
    await window.sql.executeQuery(`USE ${databaseName};`);
    const result = await window.sql.executeQuery(query, true);

    return { result };
  } catch (error) {
    if (isSqlError(error)) {
      return { error };
    }

    throw error;
  }
}

// TODO : create an element for the `yScroll` (actually need to be wrapped in a Flex height 100 and overflow, etc.)
export default function SqlPage() {
  const { t } = useTranslation();
  const [form] = Form.useForm();
  const fetcher = useFetcher<SqlActionReturnTypes>();
  const [sqlQuery, saveSqlQuery] = useSqlFileStorage();

  const { state } = fetcher;

  if (sqlQuery === null) {
    return null;
  }

  return (
    <Flex vertical gap="small" style={{ height: '100%' }}>
      <Form
        form={form}
        initialValues={{ raw: sqlQuery }}
        onFinish={(values) => {
          saveSqlQuery(values.raw);
          fetcher.submit(values, {
            method: 'post',
          });
        }}
      >
        <Form.Item name="raw" valuePropName="defaultValue">
          <RawSqlEditor
            style={{ height: '35vh' }}
            onSubmit={() => {
              // trigger the form "onFinish" event
              form.submit();
            }}
          />
        </Form.Item>

        <Button
          htmlType="submit"
          disabled={state === 'submitting'}
          type="primary"
        >
          {t('rawSql.submit')}
        </Button>
      </Form>

      <RawSqlResult fetcher={fetcher} rowsAsArray />
    </Flex>
  );
}
