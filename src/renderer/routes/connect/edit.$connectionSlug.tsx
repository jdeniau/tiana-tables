import { useParams } from 'react-router';
import invariant from 'tiny-invariant';
import { useConfiguration } from '../../../contexts/ConfigurationContext';
import { useTranslation } from '../../../i18n';
import ConnectionForm from '../../component/Connection/ConnectionForm';
import ModalLike from '../../component/Style/ModalLike';

export default function Edit() {
  const { t } = useTranslation();
  const { configuration } = useConfiguration();
  const { connectionSlug } = useParams();

  invariant(connectionSlug, 'Connection slug is required');

  const connection = configuration.connections[connectionSlug];

  if (!connection) {
    // TODO migrate this in a route loader and trigger a 404 ?
    return <div>{t('error.connection.notFound')}</div>;
  }

  return (
    <ModalLike>
      <ConnectionForm connection={connection} />
    </ModalLike>
  );
}
