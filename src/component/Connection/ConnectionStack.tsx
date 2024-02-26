import { useMatch, useNavigate } from 'react-router';
import { DatabaseContext } from '../../contexts/DatabaseContext';
import { ConnectionContext } from '../../contexts/ConnectionContext';
import { ReactNode, useCallback, useEffect, useState } from 'react';
import { ConnectionObject } from './types';

interface Props {
  children: ReactNode;
}

function ConnectionStack({ children }: Props) {
  const navigate = useNavigate();
  const currentConnectionName = useMatch('connections/:connectionName/*')
    ?.params.connectionName;
  const databaseName = useMatch('connections/:connectionName/:databaseName/*')
    ?.params.databaseName;

  const [connectionNameList, setConnectionNameList] = useState<string[]>([]);

  useEffect(() => {
    return () => {
      window.sql.closeAllConnections();
      // connectionNameList.forEach((connection) => {
      //   connection.end();
      // });
    };
  }, []);

  const handleConnectTo = useCallback(
    async (params: ConnectionObject) => {
      await window.sql.openConnection(params);
      setConnectionNameList((prev) => [...prev, params.name]);

      navigate(`/connections/${params.name}`);
    },
    [navigate, setConnectionNameList]
  );

  const handleSetConnection = useCallback(
    (connectionName: string) => {
      navigate(`/connections/${connectionName}`);
    },
    [navigate]
  );

  const handleSetDatabase = useCallback(
    (database: string) => {
      navigate(`/connections/${currentConnectionName}/${database}`);
    },
    [currentConnectionName, navigate]
  );

  return (
    <ConnectionContext.Provider
      value={{
        connectionNameList,
        currentConnectionName,
        connectTo: handleConnectTo,
        setCurrentConnectionName: handleSetConnection,
      }}
    >
      <DatabaseContext.Provider
        value={{
          database: databaseName,
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
