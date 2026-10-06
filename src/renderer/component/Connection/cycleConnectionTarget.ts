/** Where Next or Previous Connection leads: the tab `offset` steps away, wrapping around, or `null` with no other tab to go to. */
export function cycleConnectionTarget(
  connectionSlugList: Array<string>,
  currentSlug: string | null,
  offset: number
): string | null {
  const { length } = connectionSlugList;
  const currentIndex = currentSlug
    ? connectionSlugList.indexOf(currentSlug)
    : -1;

  if (length < 2 || currentIndex === -1) {
    return null;
  }

  const targetIndex = (((currentIndex + offset) % length) + length) % length;

  return `/connections/${connectionSlugList[targetIndex]}`;
}
