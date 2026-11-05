import { type Dispatch, type SetStateAction, useState } from 'react';
import invariant from 'tiny-invariant';
import { useDatabaseContext } from '../../contexts/DatabaseContext';
import { UpdateCellStatus } from '../../sql/updateCell';
import type { CellMenuTarget } from './CellContextMenu';
import type { CellDetail } from './CellDetailModal';
import { toBoundValue } from './CellEditor/editableValue';
import type { SaveCell, SaveCellParams } from './CellWrite';
import type { ColumnMeta } from './TableGrid';
import { findCellElement } from './gridCellElement';
import { flashCell } from './writtenCellFlash';

/** opens the detail modal on a cell */
export type ShowCellDetail = (detail: CellDetail) => void;

/** opens the context menu on a cell */
export type OpenCellMenu = (target: CellMenuTarget) => void;

interface CellDialogs {
  cellDetail: CellDetail | null;
  setCellDetail: Dispatch<SetStateAction<CellDetail | null>>;
  menuTarget: CellMenuTarget | null;
  setMenuTarget: Dispatch<SetStateAction<CellMenuTarget | null>>;
  /** stable, so that the `memo` of `BodyRow` still holds */
  showCellDetail: ShowCellDetail;
  /** stable, so that the `memo` of `BodyRow` still holds */
  openCellMenu: OpenCellMenu;
  saveCell: SaveCell;
}

/** the cell the detail modal and the context menu are open on, and the write either of them sends */
export function useCellDialogs({
  onValueUpdated,
  scrollElement,
  columnsMeta,
}: {
  onValueUpdated:
    | ((rowIndex: number, columnName: string, value: unknown) => void)
    | undefined;
  scrollElement: HTMLElement | null;
  columnsMeta: ReadonlyArray<ColumnMeta>;
}): CellDialogs {
  // the value shown by the detail modal, `null` when it is closed
  const [cellDetail, setCellDetail] = useState<CellDetail | null>(null);

  const showCellDetail: ShowCellDetail = (detail) => {
    setCellDetail(detail);
  };

  // the cell the context menu is open on, `null` when it is closed
  const [menuTarget, setMenuTarget] = useState<CellMenuTarget | null>(null);

  const openCellMenu: OpenCellMenu = (target) => {
    setMenuTarget(target);
  };

  const { database } = useDatabaseContext();

  const saveCell = async ({
    detail,
    newValue,
    originalValue,
    force,
  }: SaveCellParams) => {
    const { rowKey, column } = detail;

    invariant(database, 'A database must be selected to write a cell');
    invariant(rowKey, 'A cell of an unidentified row cannot be written');
    invariant(column.tableName, 'A cell of no table cannot be written');

    const outcome = await window.sql.updateCell({
      database,
      table: column.tableName,
      column: column.name,
      primaryKey: rowKey,
      newValue,
      originalValue: toBoundValue(originalValue),
      hasJsonType: column.detail?.hasJsonType ?? false,
      force,
    });

    if (outcome.status === UpdateCellStatus.Updated) {
      const cell =
        scrollElement &&
        findCellElement(
          scrollElement,
          detail.rowId,
          columnsMeta.findIndex(({ id }) => id === column.id)
        );

      if (cell) {
        flashCell(cell);
      }

      onValueUpdated?.(detail.rowIndex, column.name, outcome.value);
    }

    return outcome;
  };

  return {
    cellDetail,
    setCellDetail,
    menuTarget,
    setMenuTarget,
    showCellDetail,
    openCellMenu,
    saveCell,
  };
}
