import { Link, Navigate } from 'react-router-dom';
import { Button } from 'antd';
import { ConnectionObject } from './types';
import { ConnectionContext, useConfiguration } from '../../Contexts';
import { useContext } from 'react';

function ConnectionPage() {
  const registeredConnectionList = useConfiguration().connections;
  const { connectTo } = useContext(ConnectionContext);

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
          <div key={connection.name}>
            <Button block>
              <Link
                to={connection.name}
                onClick={(e) => {
                  e.preventDefault();
                  connectTo(connection);
                }}
              >
                {connection.name}
              </Link>
            </Button>
          </div>
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
