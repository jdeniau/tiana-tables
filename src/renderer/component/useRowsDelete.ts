import { useEffect, useState } from 'react';
import type { Atom } from '@tanstack/react-store';
import type { Table } from '@tanstack/react-table';
import type { ResultRow } from '../../sql/types';
import type { PrimaryKeyPart } from '../../sql/updateCell';
import type { GridFeatures } from './TableGrid';
import type { CellSelection } from './gridSelectionGesture';
import { buildRowKey } from './rowId';
import { rowsOfSelection } from './useGridSelection';

interface RowsDelete {
  /** the keys of the rows of the selection, `null` when there is none or one of them has no key */
  selectedRowKeys: () => Array<Array<PrimaryKeyPart>> | null;
  /** the rows the confirmation asks about, `null` while it is closed */
  pendingRowKeys: Array<Array<PrimaryKeyPart>> | null;
  /** opens the confirmation on these rows */
  askToDelete: (rowKeys: Array<Array<PrimaryKeyPart>>) => void;
  closeConfirmation: () => void;
}

/**
 * Deletes the rows of a grid's selection: the context menu opens the confirmation,
 * and so does the Delete key on the focused grid while rows are selected.
 */
export function useRowsDelete<Row extends ResultRow>(
  table: Table<GridFeatures, Row>,
  {
    enabled,
    scrollElement,
    primaryKeys,
    cellsAtom,
  }: {
    /** whether rows can be selected and deleted */
    enabled: boolean;
    scrollElement: HTMLElement | null;
    primaryKeys: Array<string> | undefined;
    cellsAtom: Atom<CellSelection>;
  }
): RowsDelete {
  const [pendingRowKeys, setPendingRowKeys] = useState<Array<
    Array<PrimaryKeyPart>
  > | null>(null);

  const selectedRowKeys = (): Array<Array<PrimaryKeyPart>> | null => {
    if (!enabled) {
      return null;
    }

    const rowKeys = rowsOfSelection(table, cellsAtom.get()).map((row) =>
      buildRowKey(row.original, primaryKeys)
    );

    const identified = rowKeys.filter((rowKey) => rowKey !== null);

    return identified.length > 0 && identified.length === rowKeys.length
      ? identified
      : null;
  };

  useEffect(() => {
    if (!scrollElement || !enabled) {
      return undefined;
    }

    const onKeyDown = (event: KeyboardEvent): void => {
      if (
        event.key !== 'Delete' ||
        event.ctrlKey ||
        event.metaKey ||
        event.altKey ||
        event.shiftKey ||
        // on selected cells, the key sets them to NULL
        Object.keys(cellsAtom.get()).length > 0
      ) {
        return;
      }

      const rowKeys = selectedRowKeys();

      if (rowKeys) {
        event.preventDefault();
        setPendingRowKeys(rowKeys);
      }
    };

    scrollElement.addEventListener('keydown', onKeyDown);

    return () => scrollElement.removeEventListener('keydown', onKeyDown);
  }, [scrollElement, enabled, selectedRowKeys, cellsAtom]);

  return {
    selectedRowKeys,
    pendingRowKeys,
    askToDelete: setPendingRowKeys,
    closeConfirmation: () => setPendingRowKeys(null),
  };
}
