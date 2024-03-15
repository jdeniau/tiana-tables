import { ReactNode, useCallback, useEffect, useMemo, useState } from 'react';
import { useMatch, useNavigate } from 'react-router';
import invariant from 'tiny-invariant';
import {
  ConnectionContext,
  ConnexionContextProps,
} from '../../../contexts/ConnectionContext';
import {
  DatabaseContext,
  DatabaseContextProps,
} from '../../../contexts/DatabaseContext';

interface Props {
  children: ReactNode;
}

function ConnectionStack({ children }: Props) {
  const navigate = useNavigate();
  const currentConnectionName = useMatch('connections/:connectionName/*')
    ?.params.connectionName;
  const databaseName = useMatch('connections/:connectionName/:databaseName/*')
    ?.params.databaseName;

  const [connectionNameList, setConnectionNameList] = useState<Array<string>>(
    []
  );

  useEffect(() => {
    return () => {
      window.sql.closeAllConnections();
      // connectionNameList.forEach((connection) => {
      //   connection.end();
      // });
    };
  }, []);

  // inform the main process that the connection name has changed
  useEffect(() => {
    window.sql.connectionNameChanged(currentConnectionName, databaseName);
  }, [currentConnectionName, databaseName]);

  // TODO we might need to change that into the proper route as reload will not work
  const addConnectionToList = useCallback(async (connectionName: string) => {
    setConnectionNameList((prev) =>
      Array.from(new Set([...prev, connectionName]))
    );
  }, []);

  const handleSetDatabase = useCallback(
    (database: string) => {
      invariant(currentConnectionName, 'Connection name is required');

      navigate(`/connections/${currentConnectionName}/${database}`);
    },
    [currentConnectionName, navigate]
  );

  const connectionContextValue = useMemo(
    (): ConnexionContextProps => ({
      connectionNameList,
      currentConnectionName: currentConnectionName ?? null,
      addConnectionToList,
    }),
    [connectionNameList, currentConnectionName, addConnectionToList]
  );

  const databateContextValue = useMemo(
    (): DatabaseContextProps => ({
      database: databaseName ?? null,
      setDatabase: handleSetDatabase,
      executeQuery: (query) => {
        invariant(
          currentConnectionName,
          'Connection name is required to execute a query'
        );

        return window.sql.executeQuery(currentConnectionName, query);
      },
    }),
    [currentConnectionName, databaseName, handleSetDatabase]
  );

  return (
    <ConnectionContext.Provider value={connectionContextValue}>
      <DatabaseContext.Provider value={databateContextValue}>
        {children}
      </DatabaseContext.Provider>
    </ConnectionContext.Provider>
  );
}

export default ConnectionStack;
