import { ReactNode, useCallback, useEffect, useState } from 'react';
import { useMatch, useNavigate } from 'react-router';
import invariant from 'tiny-invariant';
import { ConnectionContext } from '../../../contexts/ConnectionContext';
import { DatabaseContext } from '../../../contexts/DatabaseContext';
import type { ConnectionObject } from '../../../sql/types';

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

  const handleSetDatabase = useCallback(
    (database: string) => {
      invariant(currentConnectionName, 'Connection name is required');

      navigate(`/connections/${currentConnectionName}/${database}`);
    },
    [currentConnectionName, navigate]
  );

  return (
    <ConnectionContext.Provider
      value={{
        connectionNameList,
        currentConnectionName: currentConnectionName ?? null,
        connectTo: handleConnectTo,
      }}
    >
      <DatabaseContext.Provider
        value={{
          database: databaseName ?? null,
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
