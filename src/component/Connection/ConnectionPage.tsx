import * as React from 'react';
import { Link, Redirect } from 'react-router-dom';
import storage from './SavedConnections';
import { ConnectionObject } from '.';
import { ConnectionContext } from '../../Contexts';

function getRegisteredConnectionList(): ConnectionObject[] {
  return Object.values(storage.store) || [];
}

function ConnectionPage() {
  const registeredConnectionList = getRegisteredConnectionList();
  const { connectTo } = React.useContext(ConnectionContext);

  if (registeredConnectionList.length === 0) {
    return <Redirect to="/connect/create" />;
  }

  return (
    <div>
      {registeredConnectionList.map((connection) => (
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
      ))}
      <Link to="/connect/create">New connection</Link>
    </div>
  );
}

export default ConnectionPage;
