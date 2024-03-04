import { Link } from 'react-router-dom';
import { Button } from 'antd';
import { useTranslation } from '../../i18n';

export function Home() {
  const { t } = useTranslation();
  return (
    <div>
      <p>Tiana Tables ! </p>

      <Button type="primary">
        <Link to="/connect">{t('connect.pleaseConnect')}</Link>
      </Button>
    </div>
  );
}
