import invariant from 'tiny-invariant';
import { Configuration } from '../../configuration/type';
import { getDialect } from '../../sql/dialect';
import type { Dialect } from '../../sql/dialect/types';
import { useCurrentConnection } from './useCurrentConnection';

/**
 * The SQL text of the connection the app is on.
 *
 * The slug comes from the committed location, so during a pending navigation it
 * still names the connection whose data is on screen.
 */
export function useDialect(): Dialect {
  const connection = useCurrentConnection();

  invariant(connection, 'A dialect needs a connection');

  return getDialect(connection.engine);
}

/**
 * The same, for the code paths with no hook to read it from: a route action.
 */
export async function loadDialect(connectionSlug: string): Promise<Dialect> {
  const configuration = await window.config.getConfiguration();

  return getDialectForConnection(configuration, connectionSlug);
}

function getDialectForConnection(
  configuration: Configuration,
  connectionSlug: string
): Dialect {
  invariant(connectionSlug, 'A dialect needs a connection');

  const connection = configuration.connections[connectionSlug];

  invariant(connection, `Connection "${connectionSlug}" not found`);

  return getDialect(connection.engine);
}
