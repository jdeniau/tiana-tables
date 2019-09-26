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
    <div>
      <ul className="nav nav-tabs">
        {connectionList.map((connection, i) => (
          <li className="nav-item" key={i}>
            <a
              className={`nav-link ${
                connection === currentConnection ? ' active' : ''
              }`}
              onClick={e => {
                e.preventDefault();
                setCurrentConnection(connection);
              }}
              href="#"
            >
              {connection.config.host}
            </a>
          </li>
        ))}
        <li className="nav-item">
          <NavLink className="nav-link" activeClassName="active" to="/connect">
            Connect to…
          </NavLink>
        </li>
      </ul>
    </div>
  );
}
