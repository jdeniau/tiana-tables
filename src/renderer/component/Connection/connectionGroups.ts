import { EncryptedConnectionObject } from '../../../configuration/type';

/** The saved connections as the home page lists them. */
export interface ConnectionGroups {
  /** the connections with no group, in saved order */
  ungrouped: EncryptedConnectionObject[];
  /** one entry per group, sorted by name, its connections in saved order */
  groups: Array<{ name: string; connections: EncryptedConnectionObject[] }>;
}

export function groupConnections(
  connections: EncryptedConnectionObject[]
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
export function groupNames(connections: EncryptedConnectionObject[]): string[] {
  const names = connections.flatMap(({ group }) => (group ? [group] : []));

  return [...new Set(names)].sort((a, b) => a.localeCompare(b));
}
