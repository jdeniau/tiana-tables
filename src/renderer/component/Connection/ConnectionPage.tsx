import { Button, Flex } from 'antd';
import { Link, Navigate } from 'react-router-dom';
import { EncryptedConnectionObject } from '../../../configuration/type';
import { useConfiguration } from '../../../contexts/ConfigurationContext';
import { useTranslation } from '../../../i18n';

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
          <Flex key={connection.name} gap="small">
            <Button block>
              <Link to={`/connections/${connection.name}`}>
                {connection.name}
              </Link>
            </Button>
            <Button>
              <Link to={`/connect/edit/${connection.name}`}>{t('edit')}</Link>
            </Button>
          </Flex>
        )
      )}

      <hr />

      <Button block>
        <Link to="/connect/create">{t('connection.create.button')}</Link>
      </Button>
    </div>
  );
}

export default ConnectionPage;
