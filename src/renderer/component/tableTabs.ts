export type TableTab = {
  name: string;

  /** a temporary tab, replaced by the next table opened with a single click */
  preview: boolean;
};

/** The strip: the memorised tables in their order, then the temporary one last. */
export function buildTableTabs(
  openTables: ReadonlyArray<string>,
  previewTable: string | undefined
): Array<TableTab> {
  const tabs = openTables.map((name) => ({ name, preview: false }));

  if (previewTable && !openTables.includes(previewTable)) {
    tabs.push({ name: previewTable, preview: true });
  }

  return tabs;
}

/** The table to open once `closed` is gone: the one before it, or the one after it when it was the first. */
export function tableAfterClose(
  tabs: ReadonlyArray<TableTab>,
  closed: string
): string | undefined {
  const index = tabs.findIndex((tab) => tab.name === closed);

  if (index === -1) {
    return undefined;
  }

  const rest = tabs.filter((_, position) => position !== index);

  // removing an item shifts the right side left by one, so `rest[index]` is the tab that followed
  return (rest[index - 1] ?? rest[index])?.name;
}

/** Drops the tables the database no longer has: a dropped one would keep a tab that answers an error. */
export function pruneOpenTables(
  openTables: ReadonlyArray<string>,
  tableNames: ReadonlyArray<string>
): Array<string> {
  const existing = new Set(tableNames);

  return openTables.filter((name) => existing.has(name));
}
