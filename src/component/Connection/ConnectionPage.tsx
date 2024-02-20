import { Link, Navigate } from 'react-router-dom';
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
            <a
              href={`${connection.name}`}
              onClick={(e) => {
                e.preventDefault();

                connectTo(connection);
              }}
            >
              {connection.name}
            </a>
          </div>
        )
      )}
      <Link to="/connect/create">New connection</Link>
    </div>
  );
}

export default ConnectionPage;
