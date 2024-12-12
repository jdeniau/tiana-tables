import { ReactElement, useRef, useState } from 'react';
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
  const ref = useRef<HTMLFormElement>(null);

  return (
    <form
      ref={ref}
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
            // If this line is not set, then the width will be 100% of the window size,
            // And then push the button outside of the viewport
            minWidth: '0',
            minHeight: '2lh',
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

        <Button htmlType="submit" type="primary">
          {t('filter')}
        </Button>
      </Space.Compact>
    </form>
  );
}

export default WhereFilter;
