import { NavLink } from 'react-router-dom';
import { ReactElement, useContext } from 'react';
import cn from 'classnames';
import { ConnectionContext } from '../../Contexts';

export default function Nav(): ReactElement {
  const {
    connectionNameList,
    setCurrentConnectionName,
    currentConnectionName,
  } = useContext(ConnectionContext);

  return (
    <nav className="nav nav-pills flex-column">
      {connectionNameList.map((connection, i) => (
        <NavLink
          key={i}
          className={({ isActive }) =>
            cn({
              'nav-link': true,
              // active: connection === currentConnectionName,
              active: isActive,
            })
          }
          onClick={() => {
            setCurrentConnectionName(connection);
          }}
          to="/tables"
          style={({ isActive }) => (isActive ? { color: '#fff' } : {})}
        >
          {/* {connection.config.host &&
            connection.config.host.substr(0, 1).toUpperCase()} */}

          {currentConnectionName}
        </NavLink>
      ))}
      <NavLink
        className={({ isActive }) => cn({ 'nav-link': true, active: isActive })}
        to="/connect"
      >
        +
      </NavLink>
    </nav>
  );
}
