import { Link } from 'react-router-dom';
import { ReactElement, useContext } from 'react';
import { Button } from 'antd';
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
        <Button
          block
          type={connection === currentConnectionName ? 'primary' : 'link'}
        >
          <Link
            key={i}
            // className={cn({
            //   'nav-link': true,
            //   active: connection === currentConnectionName,
            // })}
            onClick={() => {
              setCurrentConnectionName(connection);
            }}
            to="/tables"
          >
            {/* {connection.config.host &&
            connection.config.host.substr(0, 1).toUpperCase()} */}

            {connection}
          </Link>
        </Button>
      ))}
      <Button type="link" block>
        <Link to="/connect">new…</Link>
      </Button>
    </nav>
  );
}
