import * as React from 'react';
import { NavLink } from 'react-router-dom';
import { ConnectionContext } from '../../Contexts';

export default function Nav() {
  const {
    connectionList,
    setCurrentConnection,
    currentConnection,
  } = React.useContext(ConnectionContext);
  return (
    <nav className="nav nav-pills flex-column">
      {connectionList.map((connection, i) => (
        <div
          key={i}
          className={`nav-link${
            connection === currentConnection ? ' active' : ''
          }`}
        >
          <NavLink
            onClick={() => {
              setCurrentConnection(connection);
            }}
            to="/"
            isActive={() => connection === currentConnection}
            activeStyle={{ color: '#fff' }}
          >
            {connection.config.host &&
              connection.config.host.substr(0, 1).toUpperCase()}
          </NavLink>
        </div>
      ))}
      <NavLink className="nav-link" activeClassName="active" to="/connect">
        +
      </NavLink>
    </nav>
  );
}
