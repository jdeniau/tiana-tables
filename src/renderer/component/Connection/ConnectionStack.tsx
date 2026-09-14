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
import { closeConnectionTarget } from './closeConnectionTarget';

interface Props {
  children: ReactNode;
}

function ConnectionStack({ children }: Props) {
  const navigate = useNavigate();
  const currentConnectionSlug = useMatch('connections/:connectionSlug/*')
    ?.params.connectionSlug;
  const databaseName = useMatch('connections/:connectionSlug/:databaseName/*')
    ?.params.databaseName;

  const [connectionSlugList, setConnectionNameList] = useState<Array<string>>(
    []
  );

  useEffect(() => {
    return () => {
      window.sql.closeAllConnections();
      // connectionSlugList.forEach((connection) => {
      //   connection.end();
      // });
    };
  }, []);

  // TODO we might need to change that into the proper route as reload will not work
  const addConnectionToList = useCallback(async (connectionSlug: string) => {
    setConnectionNameList((prev) =>
      Array.from(new Set([...prev, connectionSlug]))
    );
  }, []);

  const closeConnection = useCallback(
    (connectionSlug: string) => {
      const target = closeConnectionTarget(
        connectionSlugList,
        connectionSlug,
        currentConnectionSlug ?? null
      );

      if (target) {
        // Leave the route of the closed connection: the page effect would put the slug straight back.
        navigate(target);

        if (target === '/connect') {
          // No loader announces the connection list, and the menu would keep reopening the connection we just closed.
          window.sql.connectionNameChanged(undefined, undefined);
        }
      }

      setConnectionNameList((prev) =>
        prev.filter((slug) => slug !== connectionSlug)
      );

      window.sql.closeConnection(connectionSlug);
    },
    [connectionSlugList, currentConnectionSlug, navigate]
  );

  const handleSetDatabase = useCallback(
    (database: string) => {
      invariant(currentConnectionSlug, 'Connection slug is required');

      navigate(`/connections/${currentConnectionSlug}/${database}`);
    },
    [currentConnectionSlug, navigate]
  );

  const connectionContextValue = useMemo(
    (): ConnexionContextProps => ({
      connectionSlugList,
      currentConnectionSlug: currentConnectionSlug ?? null,
      addConnectionToList,
      closeConnection,
    }),
    [
      connectionSlugList,
      currentConnectionSlug,
      addConnectionToList,
      closeConnection,
    ]
  );

  const databateContextValue = useMemo(
    (): DatabaseContextProps => ({
      database: databaseName ?? null,
      setDatabase: handleSetDatabase,
    }),
    [databaseName, handleSetDatabase]
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
