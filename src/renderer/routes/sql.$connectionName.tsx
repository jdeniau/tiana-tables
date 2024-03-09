import { useState } from 'react';
import { Button, Flex, Form } from 'antd';
import invariant from 'tiny-invariant';
import { useConnectionContext } from '../../contexts/ConnectionContext';
import { useDatabaseContext } from '../../contexts/DatabaseContext';
import { useTranslation } from '../../i18n';
import { isResultSetHeader, isRowDataPacketArray } from '../../sql/type-guard';
import { QueryResult } from '../../sql/types';
import { RawSqlEditor } from '../component/MonacoEditor/RawSqlEditor';
import TableGrid from '../component/TableGrid';
import { useTableHeight } from '../component/TableLayout/useTableHeight';

const DEFAULT_VALUE = `SELECT * 
FROM cart c
WHERE  c.id > 5
LIMIT 10;`;

// TODO : create an element for the `yScroll` (actually need to be wrapped in a Flex height 100 and overflow, etc.)
export default function SqlPage() {
  const { t } = useTranslation();
  const [result, setResult] = useState<Awaited<QueryResult> | null>(null);
  const { database } = useDatabaseContext();
  const { currentConnectionName } = useConnectionContext();

  invariant(currentConnectionName, 'Connection name is required');

  const [yTableScroll, resizeRef] = useTableHeight();

  return (
    <Flex vertical gap="small" style={{ height: '100%' }}>
      <Form
        initialValues={{
          raw: DEFAULT_VALUE,
        }}
        onFinish={async (values) => {
          const query = values.raw;

          if (database) {
            await window.sql.executeQuery(
              currentConnectionName,
              `USE ${database};`
            );
          }

          const result = await window.sql.executeQuery(
            currentConnectionName,
            query
          );

          setResult(result);
        }}
      >
        <Form.Item name="raw" valuePropName="defaultValue">
          <RawSqlEditor />
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
