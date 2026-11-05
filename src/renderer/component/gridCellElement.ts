/** The `<td>` of a mounted row, by the row's id and the column's position in the grid; `null` when the row is not mounted. */
export function findCellElement(
  scrollElement: ParentNode,
  rowId: string,
  columnIndex: number
): HTMLElement | null {
  const row = scrollElement.querySelector(
    `tr[data-row-id="${CSS.escape(rowId)}"]`
  );
  const cell = row?.children[columnIndex];

  return cell instanceof HTMLElement ? cell : null;
}
