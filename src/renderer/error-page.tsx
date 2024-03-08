import { Link, useRouteError } from 'react-router-dom';
import { useTranslation } from '../i18n';
import Debug from './component/Debug';

export default function ErrorPage() {
  const error = useRouteError();
  const { t } = useTranslation();
  console.error(error);

  return (
    <div id="error-page">
      <Debug />
      <h1>{t('errorPage.title')}</h1>
      <p>{t('errorPage.sorry')}</p>
      <p>
        {/* @ts-expect-error error might have one of tjose */}
        <i>{error.statusText || error.message}</i>
      </p>

      <Link to="/">{t('errorPage.goHome')}</Link>
    </div>
  );
}
