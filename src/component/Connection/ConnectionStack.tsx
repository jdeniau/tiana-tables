import { useNavigate } from 'react-router';
import { ConnectionContext, DatabaseContext } from '../../Contexts';
import { ReactNode, useEffect, useState } from 'react';
import { ConnectionObject } from './types';

interface Props {
  children: ReactNode;
}

function ConnectionStack({ children }: Props) {
  const navigate = useNavigate();
  const [currentConnectionName, setCurrentConnectionName] = useState<
    string | null
  >(null);
  const [database, setDatabase] = useState<string | null>(null);
  const [connectionNameList, setConnectionNameList] = useState<string[]>([]);

  useEffect(() => {
    return () => {
      window.sql.closeAllConnections();
      // connectionNameList.forEach((connection) => {
      //   connection.end();
      // });
    };
  }, []);

  const handleSetDatabase = (database: string) => {
    setDatabase(database);

    navigate('/tables');
  };

  const handleConnectTo = async (params: ConnectionObject) => {
    await window.sql.openConnection(params);
    setCurrentConnectionName(params.name);
    setConnectionNameList((prev) => [...prev, params.name]);

    navigate('/tables');
  };

  return (
    <ConnectionContext.Provider
      value={{
        connectionNameList,
        currentConnectionName,
        connectTo: handleConnectTo,
        setCurrentConnectionName,
      }}
    >
      <DatabaseContext.Provider
        value={{
          database,
          setDatabase: handleSetDatabase,
          executeQuery: window.sql.executeQuery,
        }}
      >
        {children}
      </DatabaseContext.Provider>
    </ConnectionContext.Provider>
  );
}

export default ConnectionStack;
