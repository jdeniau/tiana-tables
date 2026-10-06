import { ReactNode, useEffect, useEffectEvent, useState } from 'react';
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
import { databaseUrl } from '../databaseUrl';
import { closeConnectionTarget } from './closeConnectionTarget';
import { cycleConnectionTarget } from './cycleConnectionTarget';

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
  const addConnectionToList = async (connectionSlug: string) => {
    setConnectionNameList((prev) =>
      Array.from(new Set([...prev, connectionSlug]))
    );
  };

  const closeConnection = (connectionSlug: string) => {
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
  };

  const cycleConnection = useEffectEvent((offset: number) => {
    const target = cycleConnectionTarget(
      connectionSlugList,
      currentConnectionSlug ?? null,
      offset
    );

    if (target) {
      navigate(target);
    }
  });

  useEffect(
    () =>
      window.navigationListener.onCycleConnection((offset) =>
        cycleConnection(offset)
      ),
    []
  );

  const handleSetDatabase = async (database: string) => {
    invariant(currentConnectionSlug, 'Connection slug is required');

    navigate(
      databaseUrl(
        await window.config.getConfiguration(),
        currentConnectionSlug,
        database
      )
    );
  };

  const connectionContextValue: ConnexionContextProps = {
    connectionSlugList,
    currentConnectionSlug: currentConnectionSlug ?? null,
    addConnectionToList,
    closeConnection,
  };

  const databateContextValue: DatabaseContextProps = {
    database: databaseName ?? null,
    setDatabase: handleSetDatabase,
  };

  return (
    <ConnectionContext value={connectionContextValue}>
      <DatabaseContext value={databateContextValue}>{children}</DatabaseContext>
    </ConnectionContext>
  );
}

export default ConnectionStack;
