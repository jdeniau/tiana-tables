import { LoaderFunctionArgs, Params, redirect } from 'react-router';
import invariant from 'tiny-invariant';
import { lastTableUrl } from '../component/databaseUrl';

interface RouteParams extends LoaderFunctionArgs {
  params: Params<'connectionSlug' | 'databaseName'>;
}

/** A URL naming no table resumes the last one; with none, the page stays empty. */
export async function loader({
  params,
}: RouteParams): Promise<Response | null> {
  const { connectionSlug, databaseName } = params;

  invariant(connectionSlug, 'Connection slug is required');
  invariant(databaseName, 'Database name is required');

  const url = lastTableUrl(
    await window.config.getConfiguration(),
    connectionSlug,
    databaseName
  );

  return url ? redirect(url) : null;
}
