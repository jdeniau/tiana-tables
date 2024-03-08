import { useTranslation } from '../../i18n';
import ButtonLink from '../component/ButtonLink';

export function Home() {
  const { t } = useTranslation();

  return (
    <div>
      <p>Tiana Tables ! </p>

      <ButtonLink type="primary" to="/connect">
        {t('connect.pleaseConnect')}
      </ButtonLink>
    </div>
  );
}
