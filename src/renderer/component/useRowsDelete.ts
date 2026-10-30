import { useEffect, useState } from 'react';
import type { Table } from '@tanstack/react-table';
import type { ResultRow } from '../../sql/types';
import type { PrimaryKeyPart } from '../../sql/updateCell';
import type { GridFeatures } from './TableGrid';
import { buildRowKey } from './rowId';

interface RowsDelete {
  /** the keys of the selected rows, `null` when there is none or one of them has no key */
  selectedRowKeys: () => Array<Array<PrimaryKeyPart>> | null;
  /** the rows the confirmation asks about, `null` while it is closed */
  pendingRowKeys: Array<Array<PrimaryKeyPart>> | null;
  /** opens the confirmation on these rows */
  askToDelete: (rowKeys: Array<Array<PrimaryKeyPart>>) => void;
  closeConfirmation: () => void;
}

/** Deletes the selected rows of a grid: the context menu or the Delete key on the focused grid open the confirmation. */
export function useRowsDelete<Row extends ResultRow>(
  table: Table<GridFeatures, Row>,
  {
    enabled,
    scrollElement,
    primaryKeys,
  }: {
    /** whether rows can be selected and deleted */
    enabled: boolean;
    scrollElement: HTMLElement | null;
    primaryKeys: Array<string> | undefined;
  }
): RowsDelete {
  const [pendingRowKeys, setPendingRowKeys] = useState<Array<
    Array<PrimaryKeyPart>
  > | null>(null);

  const selectedRowKeys = (): Array<Array<PrimaryKeyPart>> | null => {
    if (!enabled) {
      return null;
    }

    const rowKeys = table
      .getRowModel()
      .rows.filter((row) => row.getIsSelected())
      .map((row) => buildRowKey(row.original, primaryKeys));

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
        event.shiftKey
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
  }, [scrollElement, enabled, selectedRowKeys]);

  return {
    selectedRowKeys,
    pendingRowKeys,
    askToDelete: setPendingRowKeys,
    closeConfirmation: () => setPendingRowKeys(null),
  };
}
