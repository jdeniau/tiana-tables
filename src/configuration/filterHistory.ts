/** How many filters a table remembers. */
export const MAX_FILTER_HISTORY = 20;

/**
 * The filters a table was given, most recent first: a clause already in the
 * list moves back to the head rather than being duplicated, and an empty one
 * — the filter the user just cleared — is a state, not a filter.
 *
 * Two clauses are the same filter when their texts are, the blank the editor
 * leaves at either end aside; a clause reindented is a new entry.
 */
export function pushFilter(
  history: Array<string> | undefined,
  filter: string
): Array<string> {
  const current = history ?? [];

  if (!filter.trim()) {
    return current;
  }

  const others = current.filter((entry) => entry.trim() !== filter.trim());

  return [filter, ...others].slice(0, MAX_FILTER_HISTORY);
}
