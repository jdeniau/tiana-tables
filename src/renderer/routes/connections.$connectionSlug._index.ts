import { LoaderFunctionArgs, Params, redirect } from 'react-router';
import invariant from 'tiny-invariant';
import { getConnectionAppState } from '../../configuration/appState';
import { databaseUrl } from '../component/databaseUrl';

interface RouteParams extends LoaderFunctionArgs {
  params: Params<'connectionSlug'>;
}

/** A URL naming no database resumes the last one, or opens the first. */
export async function loader({ params }: RouteParams): Promise<Response> {
  const { connectionSlug } = params;

  invariant(connectionSlug, 'Connection slug is required');

  const configuration = await window.config.getConfiguration();

  let databaseName = getConnectionAppState(
    configuration,
    connectionSlug
  )?.activeDatabase;

  if (!databaseName) {
    // Whichever lazy module loads first, the list is this connection's.
    // Not above: on the connection on screen, no loader after this one announces its database.
    window.sql.connectionNameChanged(connectionSlug, undefined);

    databaseName = (await window.sql.listDatabases())[0];
  }

  if (!databaseName) {
    // TODO handle the case where there is no database on the server
    throw new Error('No database found. Case not handled for now.');
  }

  return redirect(databaseUrl(configuration, connectionSlug, databaseName));
}
