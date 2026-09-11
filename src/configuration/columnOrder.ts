/** The column each column is displayed after, by column name. */
export type DisplayAfterByColumn = Record<string, string>;

/**
 * The columns in the order the user asked for, from the order the database gives.
 * Anchors are names rather than positions, so what the schema no longer honours — an unknown column, an unknown anchor, a cycle — is ignored.
 */
export function applyColumnOrder(
  columns: ReadonlyArray<string>,
  displayAfterByColumn: DisplayAfterByColumn | undefined
): Array<string> {
  if (!displayAfterByColumn) {
    return [...columns];
  }

  const known = new Set(columns);
  // filled in database order, which two columns sharing an anchor fall back to
  const anchors = new Map<string, string>();

  for (const column of columns) {
    const anchor = displayAfterByColumn[column];

    if (anchor && anchor !== column && known.has(anchor)) {
      anchors.set(column, anchor);
    }
  }

  breakCycles(columns, anchors);

  const followers = new Map<string, Array<string>>();

  for (const [column, anchor] of anchors) {
    const list = followers.get(anchor);

    if (list) {
      list.push(column);
    } else {
      followers.set(anchor, [column]);
    }
  }

  const ordered: Array<string> = [];

  function emit(column: string): void {
    ordered.push(column);

    for (const follower of followers.get(column) ?? []) {
      emit(follower);
    }
  }

  // a column that follows another is emitted by that one
  for (const column of columns) {
    if (!anchors.has(column)) {
      emit(column);
    }
  }

  return ordered;
}

/** Without this, no column of a cycle would ever be emitted. */
function breakCycles(
  columns: ReadonlyArray<string>,
  anchors: Map<string, string>
): void {
  for (const column of columns) {
    const seen = new Set([column]);
    // drop the link of the column pointing back into the chain, not the one we started from: a column can lead into a cycle without being part of it
    let previous = column;
    let current = anchors.get(column);

    while (current) {
      if (seen.has(current)) {
        anchors.delete(previous);
        break;
      }

      seen.add(current);
      previous = current;
      current = anchors.get(current);
    }
  }
}
