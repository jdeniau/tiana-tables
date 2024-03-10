import { ReactElement, useState } from 'react';
import { Button, Space } from 'antd';
import { useTranslation } from '../../../i18n';
import { RawSqlEditor } from '../MonacoEditor/RawSqlEditor';

interface Props {
  onSubmit: (where: string) => void;
  defaultValue: string;
}

function WhereFilter({ defaultValue, onSubmit }: Props): ReactElement {
  const { t } = useTranslation();
  const [where, setWhere] = useState<string>(defaultValue);

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit(where);
      }}
    >
      <Space.Compact style={{ width: '100%', marginBottom: '0.5em' }}>
        <RawSqlEditor
          defaultValue={where}
          onChange={setWhere}
          style={{
            height: '32px',
            // If this line is not set, then the width will be 100% of the window size,
            // And then push the button outside of the viewport
            minWidth: '0',
            flex: 1,
          }}
          monacoOptions={{
            lineNumbers: 'off',
          }}
        />

        <Button htmlType="submit" type="primary">
          {t('filter')}
        </Button>
      </Space.Compact>
    </form>
  );
}

export default WhereFilter;
