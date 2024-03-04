import { ReactElement, useState } from 'react';
import { Button, Space } from 'antd';
import { styled } from 'styled-components';
import { useTranslation } from '../../../i18n';

const WhereArea = styled.textarea`
  width: 100%;
  padding: 5px;
  border-radius: 3px;
`;

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
        <WhereArea
          rows={1}
          value={where}
          onChange={(e) => setWhere(e.target.value)}
        />

        <Button htmlType="submit" type="primary">
          {t('filter')}
        </Button>
      </Space.Compact>
    </form>
  );
}

export default WhereFilter;
