import { EncryptedConnectionObject } from '../../../configuration/type';

/** The saved connections as the home page lists them. */
export interface ConnectionGroups {
  /** the connections with no group, in saved order */
  ungrouped: Array<EncryptedConnectionObject>;
  /** one entry per group, sorted by name, its connections in saved order */
  groups: Array<{
    name: string;
    connections: Array<EncryptedConnectionObject>;
  }>;
}

export function groupConnections(
  connections: Array<EncryptedConnectionObject>
): ConnectionGroups {
  return {
    ungrouped: connections.filter(({ group }) => !group),
    groups: groupNames(connections).map((name) => ({
      name,
      connections: connections.filter(({ group }) => group === name),
    })),
  };
}

/** The group names in use, sorted, each once. */
export function groupNames(
  connections: Array<EncryptedConnectionObject>
): Array<string> {
  const names = connections.flatMap(({ group }) => (group ? [group] : []));

  return [...new Set(names)].sort((a, b) => a.localeCompare(b));
}
