import { useEffect } from 'react';
import {
  LoaderFunctionArgs,
  Outlet,
  Params,
  useLoaderData,
} from 'react-router-dom';
import invariant from 'tiny-invariant';
import { useConnectionContext } from '../../contexts/ConnectionContext';
import { DatabaseListContextProvider } from '../../contexts/DatabaseListContext';
import { DateDisplayContextProvider } from '../../contexts/DateDisplayContext';
import type { ServerTimeZoneName } from '../../sql/dialect/metadata';

interface RouteParams extends LoaderFunctionArgs {
  /** `databaseName` when the URL goes on to a database */
  params: Params<'connectionSlug'> & Partial<Params<'databaseName'>>;
}

interface ConnectionLoaderData {
  connectionSlug: string;
  databaseList: Array<string>;
  serverTimeZone: ServerTimeZoneName;
}

export async function loader({
  params,
}: RouteParams): Promise<ConnectionLoaderData> {
  const { connectionSlug, databaseName } = params;

  invariant(connectionSlug, 'Connection slug is required');

  // The same database as the child loader announces: whichever lazy module
  // loads first, the main process ends on the database of the URL.
  window.sql.connectionNameChanged(connectionSlug, databaseName);

  const databaseList = await window.sql.listDatabases();

  if (!databaseList || !databaseList[0]) {
    // TODO handle the case where there is no database on the server
    throw new Error('No database found. Case not handled for now.');
  }

  const serverTimeZone = await window.sql.getServerTimeZone();

  return { connectionSlug, databaseList, serverTimeZone };
}

export default function ConnectionPage() {
  const { connectionSlug, databaseList, serverTimeZone } =
    useLoaderData() as ConnectionLoaderData;
  const { addConnectionToList } = useConnectionContext();

  useEffect(() => {
    addConnectionToList(connectionSlug);
  }, [addConnectionToList, connectionSlug]);

  return (
    <DatabaseListContextProvider databaseList={databaseList}>
      <DateDisplayContextProvider serverTimeZone={serverTimeZone}>
        <Outlet />
      </DateDisplayContextProvider>
    </DatabaseListContextProvider>
  );
}
