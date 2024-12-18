import { LoaderFunctionArgs, Outlet, Params, redirect } from 'react-router';
import invariant from 'tiny-invariant';

interface RouteParams extends LoaderFunctionArgs {
  params: Params<'connectionSlug' | 'databaseName'>;
}

export async function loader({ params, request }: RouteParams) {
  const { connectionSlug, databaseName } = params;

  invariant(connectionSlug, 'Connection slug is required');
  invariant(databaseName, 'Database name is required');

  window.sql.connectionNameChanged(connectionSlug, databaseName);

  const configuration = await window.config.getConfiguration();

  window.config.setActiveDatabase(connectionSlug, databaseName);

  const { configByDatabase } =
    configuration.connections[connectionSlug]?.appState || {};

  const openedTable = configByDatabase?.[databaseName]?.activeTable;

  // redirect to the current database if we are not on a "database" root page
  if (openedTable) {
    const currentUrl = new URL(request.url).pathname;

    const needsRedirect = currentUrl?.match(
      new RegExp('^/connections/([^/]+)/([^/]+)$')
    );

    if (needsRedirect) {
      const expectedUrl = `/connections/${connectionSlug}/${databaseName}/tables/${openedTable}`;

      return redirect(expectedUrl);
    }
  }

  return {};
}

export default function DatabaseDetailPage() {
  return <Outlet />;
}
