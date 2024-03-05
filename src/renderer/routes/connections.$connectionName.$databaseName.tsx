import { Outlet, Params } from 'react-router';
import invariant from 'tiny-invariant';

interface RouteParams {
  params: Params<'connectionName' | 'databaseName'>;
}

export async function loader({ params }: RouteParams) {
  const { connectionName, databaseName } = params;

  invariant(connectionName, 'Connection name is required');
  invariant(databaseName, 'Database name is required');

  window.config.updateConnectionState(
    connectionName,
    'activeDatabase',
    databaseName
  );

  return {};
}

export default function DatabaseDetailPage() {
  return <Outlet />;
}
