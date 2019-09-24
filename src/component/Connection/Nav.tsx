import * as React from 'react';
import { NavLink } from 'react-router-dom';
import { ConnectionContext } from '../../Contexts';

export default function Nav() {
  const { connection } = React.useContext(ConnectionContext);
  return (
    <div>
      <ul className="nav nav-tabs">
        {connection && (
          <li className="nav-item">
            <NavLink className="nav-link" activeClassName="active" to="/">
              Active
            </NavLink>
          </li>
        )}
        <li className="nav-item">
          <NavLink className="nav-link" activeClassName="active" to="/connect">
            Connect to…
          </NavLink>
        </li>
      </ul>
    </div>
  );
}
