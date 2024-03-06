import { useState } from 'react';
import { Button, Form, Input } from 'antd';
import invariant from 'tiny-invariant';
import { useConnectionContext } from '../../contexts/ConnectionContext';
import { useDatabaseContext } from '../../contexts/DatabaseContext';
import { QueryResult } from '../../sql/types';

const { TextArea } = Input;

export default function SqlPage() {
  const [result, setResult] = useState<QueryResult | null>(null);
  const { database } = useDatabaseContext();
  const { currentConnectionName } = useConnectionContext();

  invariant(currentConnectionName, 'Connection name is required');

  return (
    <div>
      <Form
        initialValues={{
          raw: 'SELECT * FROM cart LIMIT 10;',
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
        <Form.Item name="raw">
          <TextArea rows={10} />
        </Form.Item>

        <Button htmlType="submit">Submit</Button>
      </Form>

      <div>
        {result && (
          <div>
            <h2>Result</h2>
            <pre>{JSON.stringify(result, null, 2)}</pre>
          </div>
        )}
      </div>
    </div>
  );
}
