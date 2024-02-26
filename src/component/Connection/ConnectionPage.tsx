import { Link, Navigate } from 'react-router-dom';
import { Button, Flex } from 'antd';
import { ConnectionObject } from './types';
import { useConfiguration } from '../../contexts/ConfigurationContext';
import { useConnectionContext } from '../../contexts/ConnectionContext';

function ConnectionPage() {
  const registeredConnectionList = useConfiguration().configuration.connections;
  const { connectTo } = useConnectionContext();

  if (registeredConnectionList === null) {
    return <div>Reading configuration...</div>;
  }

  const connectionList: Array<ConnectionObject> = Object.values(
    registeredConnectionList
  );

  if (Object.keys(registeredConnectionList).length === 0) {
    return <Navigate replace to="/connect/create" />;
  }

  return (
    <div>
      {connectionList.map(
        (connection: ConnectionObject): JSX.Element => (
          <Flex key={connection.name} gap="small">
            <Button block>
              <Link
                to={connection.name}
                onClick={(e) => {
                  // TODO move this in the page component
                  e.preventDefault();
                  connectTo(connection);
                }}
              >
                {connection.name}
              </Link>
            </Button>
            <Button>
              <Link to={`/connect/edit/${connection.name}`}>edit </Link>
            </Button>
          </Flex>
        )
      )}

      <hr />

      <Button block>
        <Link to="/connect/create">Create connection…</Link>
      </Button>
    </div>
  );
}

export default ConnectionPage;
