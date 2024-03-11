import { Button, Flex, Form } from 'antd';
import { ActionFunctionArgs, useFetcher } from 'react-router-dom';
import invariant from 'tiny-invariant';
import { useTranslation } from '../../i18n';
import { isResultSetHeader, isRowDataPacketArray } from '../../sql/type-guard';
import { RawSqlEditor } from '../component/MonacoEditor/RawSqlEditor';
import TableGrid from '../component/TableGrid';
import { useTableHeight } from '../component/TableLayout/useTableHeight';

const DEFAULT_VALUE = `SELECT *  FROM employees e WHERE e.gender = 'F' LIMIT 10;`;

export async function action({ request, params }: ActionFunctionArgs) {
  const { databaseName, connectionName } = params;

  invariant(connectionName, 'Connection name is required');
  invariant(databaseName, 'Database name is required');

  const formData = await request.formData();
  const query = formData.get('raw');

  invariant(typeof query === 'string', 'Query as string is required');

  await window.sql.executeQuery(connectionName, `USE ${databaseName};`);
  const result = await window.sql.executeQuery(connectionName, query);

  return result;
}

// TODO : create an element for the `yScroll` (actually need to be wrapped in a Flex height 100 and overflow, etc.)
export default function SqlPage() {
  const { t } = useTranslation();
  const [form] = Form.useForm();
  const fetcher = useFetcher();

  const result = fetcher.data;

  const [yTableScroll, resizeRef] = useTableHeight();

  return (
    <Flex vertical gap="small" style={{ height: '100%' }}>
      <Form
        form={form}
        initialValues={{ raw: DEFAULT_VALUE }}
        onFinish={(values) => {
          fetcher.submit(values, {
            method: 'post',
          });
        }}
      >
        <Form.Item name="raw" valuePropName="defaultValue">
          <RawSqlEditor
            style={{ width: '100vw', height: '35vh' }}
            onSubmit={() => {
              // trigger the form "onFinish" event
              form.submit();
            }}
          />
        </Form.Item>

        <Button htmlType="submit">{t('rawSql.submit')}</Button>
      </Form>

      {result && <h2>{t('rawSql.result.title')}</h2>}
      <div style={{ overflow: 'auto', flex: '1' }} ref={resizeRef}>
        {result && isRowDataPacketArray(result[0]) && (
          <TableGrid
            result={result[0]}
            fields={result[1]}
            yTableScroll={yTableScroll}
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
      </div>
    </Flex>
  );
}
