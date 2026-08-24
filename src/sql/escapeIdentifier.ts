import invariant from 'tiny-invariant';

/**
 * Quote an identifier the way MySQL does: a backtick inside a name is doubled.
 *
 * Identifiers cannot be bound to a placeholder, so they are the one part of a
 * query that is interpolated — hence the escaping. Written here rather than
 * taken from `mysql2.escapeId` on purpose: this module is imported by the main
 * process at startup, where mysql2 stays lazily loaded until a connection is
 * actually opened, and by the renderer, where mysql2 cannot be imported at all.
 */
export function escapeIdentifier(identifier: string): string {
  invariant(identifier.length > 0, 'An empty identifier cannot be escaped');

  return `\`${identifier.replaceAll('`', '``')}\``;
}
