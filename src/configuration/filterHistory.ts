/** How many filters a table remembers. */
export const MAX_FILTER_HISTORY = 20;

/**
 * The filters a table was given, most recent first: a clause already in the
 * list moves back to the head rather than being duplicated, and an empty one
 * — the filter the user just cleared — is a state, not a filter.
 *
 * An entry is the clause without the blank the editor leaves around it, so
 * two filters are the same when their texts are; a clause reindented inside
 * is a new entry.
 */
export function pushFilter(
  history: Array<string> | undefined,
  filter: string
): Array<string> {
  const current = history ?? [];
  const entry = filter.trim();

  if (!entry) {
    return current;
  }

  const others = current.filter((other) => other !== entry);

  return [entry, ...others].slice(0, MAX_FILTER_HISTORY);
}
