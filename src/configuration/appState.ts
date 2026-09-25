import { Configuration, DatabaseConfig } from './type';

/** What a connection has saved from its last session, if anything. */
export function getConnectionAppState(
  configuration: Configuration,
  connectionSlug: string
) {
  return configuration.connections[connectionSlug]?.appState;
}

/** What a connection has saved for one of its databases, if anything. */
export function getDatabaseAppState(
  configuration: Configuration,
  connectionSlug: string,
  databaseName: string
): DatabaseConfig | undefined {
  const appState = getConnectionAppState(configuration, connectionSlug);

  return appState?.configByDatabase?.[databaseName];
}
