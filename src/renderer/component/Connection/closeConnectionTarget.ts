/** Where to go when a connection is closed: the neighbouring tab, the connection list, or `null` to stay put. */
export function closeConnectionTarget(
  connectionSlugList: Array<string>,
  closedSlug: string,
  currentSlug: string | null
): string | null {
  if (closedSlug !== currentSlug) {
    return null;
  }

  const remaining = connectionSlugList.filter((slug) => slug !== closedSlug);

  if (remaining.length === 0) {
    return '/connect';
  }

  const closedIndex = connectionSlugList.indexOf(closedSlug);
  const neighbour =
    closedIndex > 0 ? connectionSlugList[closedIndex - 1] : remaining[0];

  return `/connections/${neighbour}`;
}
