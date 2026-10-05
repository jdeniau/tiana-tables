import { LoaderFunctionArgs, Params, redirect } from 'react-router';
import invariant from 'tiny-invariant';
import { getConnectionAppState } from '../../configuration/appState';
import { lastTableUrl } from './lastTableUrl';

interface RouteParams extends LoaderFunctionArgs {
  params: Params<'connectionSlug'>;
}

/** A URL naming no database resumes the last one, or opens the first. */
export async function loader({ params }: RouteParams): Promise<Response> {
  const { connectionSlug } = params;

  invariant(connectionSlug, 'Connection slug is required');

  // the parent loader announces the same: whichever lazy module loads first, the list is this connection's
  window.sql.connectionNameChanged(connectionSlug, undefined);

  const configuration = await window.config.getConfiguration();

  const databaseName =
    getConnectionAppState(configuration, connectionSlug)?.activeDatabase ||
    (await window.sql.listDatabases())[0];

  if (!databaseName) {
    // TODO handle the case where there is no database on the server
    throw new Error('No database found. Case not handled for now.');
  }

  // straight to the table: a stop on the database would load it twice
  return redirect(
    lastTableUrl(configuration, connectionSlug, databaseName) ??
      `/connections/${connectionSlug}/${databaseName}`
  );
}
