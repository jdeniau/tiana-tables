import { ReactElement, useRef, useState } from 'react';
import { Button, Space } from 'antd';
import { Form } from 'react-router-dom';
import { useTranslation } from '../../../i18n';
import { escapeIdentifier } from '../../../sql/escapeIdentifier';
import { RawSqlEditor } from '../MonacoEditor/RawSqlEditor';

interface Props {
  defaultValue: string;
  tableName: string;
}

function WhereFilter({ defaultValue, tableName }: Props): ReactElement {
  const { t } = useTranslation();
  const [where, setWhere] = useState<string>(defaultValue);
  const ref = useRef<HTMLFormElement>(null);

  // the editor only holds the body of the clause; the query it is a fragment
  // of is what makes `salary > 1000` valid SQL, and what gives completion the
  // columns of this very table
  const queryPrefix = `SELECT * FROM ${escapeIdentifier(tableName)} WHERE `;

  return (
    <Form ref={ref} style={{ flex: 1, minHeight: 0, display: 'flex' }}>
      <input type="hidden" name="where" value={where} />

      <Space.Compact style={{ width: '100%', alignItems: 'stretch' }}>
        <RawSqlEditor
          defaultValue={where}
          onChange={setWhere}
          queryPrefix={queryPrefix}
          style={{
            // If this line is not set, then the width will be 100% of the window size,
            // And then push the button outside of the viewport
            minWidth: '0',
            // the height follows the resizable pane the filter lives in
            minHeight: '2lh',
            height: '100%',
            flex: 1,
          }}
          monacoOptions={{
            lineNumbers: 'off',
          }}
          onSubmit={() => {
            // submit the form
            ref.current?.dispatchEvent(new Event('submit', { bubbles: true }));
          }}
        />

        <Button htmlType="submit" color="primary" variant="solid">
          {t('filter')}
        </Button>
      </Space.Compact>
    </Form>
  );
}

export default WhereFilter;
