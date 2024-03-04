import { Link, Navigate } from 'react-router-dom';
import { Button, Flex } from 'antd';
import { useConfiguration } from '../../../contexts/ConfigurationContext';
import { useConnectionContext } from '../../../contexts/ConnectionContext';
import { useTranslation } from '../../../i18n';
import { EncryptedConnectionObject } from '../../../configuration/type';

function ConnectionPage() {
  const { t } = useTranslation();
  const registeredConnectionList = useConfiguration().configuration.connections;
  const { connectTo } = useConnectionContext();

  if (registeredConnectionList === null) {
    return <div>Reading configuration...</div>;
  }

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
              <Link
                to={connection.name}
                onClick={(e) => {
                  // TODO move this in the page component
                  e.preventDefault();

                  // remove unwanted properties
                  const { appState: _, ...rest } = connection;

                  connectTo(rest);
                }}
              >
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
