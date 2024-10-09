import type { JSX } from 'react';
import { Flex } from 'antd';
import { Navigate } from 'react-router-dom';
import { EncryptedConnectionObject } from '../../../configuration/type';
import { useConfiguration } from '../../../contexts/ConfigurationContext';
import { useTranslation } from '../../../i18n';
import ButtonLink from '../ButtonLink';

function ConnectionPage() {
  const { t } = useTranslation();
  const registeredConnectionList = useConfiguration().configuration.connections;

  const connectionList = Object.values(registeredConnectionList);

  if (Object.keys(registeredConnectionList).length === 0) {
    return <Navigate replace to="/connect/create" />;
  }

  return (
    <div>
      {connectionList.map(
        (connection: EncryptedConnectionObject): JSX.Element => (
          <Flex key={connection.slug} gap="small">
            <ButtonLink to={`/connections/${connection.slug}`} block>
              {connection.name}
            </ButtonLink>
            <ButtonLink to={`/connect/edit/${connection.slug}`}>
              {t('edit')}
            </ButtonLink>
          </Flex>
        )
      )}

      <hr />

      <ButtonLink block to="/connect/create">
        {t('connection.create.button')}
      </ButtonLink>
    </div>
  );
}

export default ConnectionPage;
