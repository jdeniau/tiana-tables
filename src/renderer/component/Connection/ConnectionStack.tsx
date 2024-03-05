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
import type { ConnectionObject } from '../../../sql/types';
import { getErrorMessage } from '../../utils/error';

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

  // TODO we might need to change that into the proper route as reload will not work
  const handleConnectTo = useCallback(
    async (params: ConnectionObject) => {
      try {
        await window.sql.openConnection(params);
        setConnectionNameList((prev) => [...prev, params.name]);
      } catch (error: unknown) {
        console.error(getErrorMessage(error));
      }

      navigate(`/connections/${params.name}`);
    },
    [navigate]
  );

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
      connectTo: handleConnectTo,
    }),
    [connectionNameList, currentConnectionName, handleConnectTo]
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
