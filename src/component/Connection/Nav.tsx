import { Link } from 'react-router-dom';
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
        <Link
          key={i}
          className={cn({
            'nav-link': true,
            active: connection === currentConnectionName,
          })}
          onClick={() => {
            setCurrentConnectionName(connection);
          }}
          to="/tables"
          style={connection === currentConnectionName ? { color: '#fff' } : {}}
        >
          {/* {connection.config.host &&
            connection.config.host.substr(0, 1).toUpperCase()} */}

          {connection}
        </Link>
      ))}
      <Link className="nav-link" to="/connect">
        +
      </Link>
    </nav>
  );
}
