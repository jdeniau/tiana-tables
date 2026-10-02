/** Where Select All belongs to the focus: text, the SQL editor, a dialog. */
const SELECTS_ITS_OWN =
  'input, textarea, select, [contenteditable], .monaco-editor, [role="dialog"]';

interface RowsTarget {
  element: HTMLElement;
  selectRows: () => void;
}

const rowsTargets = new Set<RowsTarget>();

/** Offers the rows of a grid to Select All, whatever has the focus; returns the unregistering function. */
export function registerSelectAllRows(
  element: HTMLElement,
  selectRows: () => void
): () => void {
  const target = { element, selectRows };
  rowsTargets.add(target);

  return () => {
    rowsTargets.delete(target);
  };
}

/** Selects the rows of the grid on screen, unless the focus selects its own content; tells whether it did. */
function selectRowsOnScreen(): boolean {
  if (document.activeElement?.closest(SELECTS_ITS_OWN)) {
    return false;
  }

  const target = [...rowsTargets].find(({ element }) =>
    element.checkVisibility()
  );
  target?.selectRows();

  return target !== undefined;
}

/** The Edit menu's Select All: the rows on screen, or the native selection. */
export function selectAllFromMenu(): void {
  if (!selectRowsOnScreen()) {
    document.execCommand('selectAll');
  }
}

/** Ctrl/Cmd+A on the page: the rows on screen, or the key's native selection. */
export function handleSelectAllKey(event: KeyboardEvent): void {
  if (
    (event.ctrlKey || event.metaKey) &&
    !event.altKey &&
    !event.shiftKey &&
    event.key.toLowerCase() === 'a' &&
    !event.defaultPrevented &&
    selectRowsOnScreen()
  ) {
    event.preventDefault();
  }
}
