import { LoaderFunctionArgs, Outlet, Params, redirect } from 'react-router';
import invariant from 'tiny-invariant';

interface RouteParams extends LoaderFunctionArgs {
  params: Params<'connectionName' | 'databaseName'>;
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

  // redirect to the current database if we are not on a "database" root page
  if (openedTable) {
    const currentUrl = new URL(request.url).pathname;

    const needsRedirect = currentUrl?.match(
      new RegExp('^/connections/([^/]+)/([^/]+)$')
    );

    if (needsRedirect) {
      const expectedUrl = `/connections/${connectionName}/${databaseName}/tables/${openedTable}`;

      return redirect(expectedUrl);
    }
  }

  return {};
}

export default function DatabaseDetailPage() {
  return <Outlet />;
}
