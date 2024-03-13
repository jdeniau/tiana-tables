import { Outlet, Params, redirect } from 'react-router';
import invariant from 'tiny-invariant';

interface RouteParams {
  params: Params<'connectionName' | 'databaseName'>;
  request: Request;
}

export async function loader({ params, request }: RouteParams) {
  const { connectionName, databaseName } = params;

  invariant(connectionName, 'Connection name is required');
  invariant(databaseName, 'Database name is required');

  const configuration = await window.config.getConfiguration();

  window.config.setActiveDatabase(connectionName, databaseName);

  const { activeTableByDatabase } =
    configuration.connections[connectionName]?.appState || {};

  const openedTable = activeTableByDatabase?.[databaseName];

  // redirect to the current database if we are not on a "database" page
  if (openedTable) {
    const expectedUrl = `/connections/${connectionName}/${databaseName}/tables/${openedTable}`;

    if (new URL(request.url).pathname !== expectedUrl) {
      return redirect(expectedUrl);
    }
  }

  return {};
}

export default function DatabaseDetailPage() {
  return <Outlet />;
}
