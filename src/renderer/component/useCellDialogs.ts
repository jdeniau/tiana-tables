import {
  type Dispatch,
  type SetStateAction,
  useCallback,
  useState,
} from 'react';
import invariant from 'tiny-invariant';
import { useDatabaseContext } from '../../contexts/DatabaseContext';
import { UpdateCellStatus } from '../../sql/updateCell';
import type { CellMenuTarget } from './CellContextMenu';
import type { CellDetail } from './CellDetailModal';
import { toBoundValue } from './CellEditor/editableValue';
import type { SaveCell, SaveCellParams } from './CellWrite';
import { useWrittenCellFlash } from './useWrittenCellFlash';

/** opens the detail modal on a cell, from the `<td>` that was double-clicked */
export type ShowCellDetail = (
  detail: CellDetail,
  cell: HTMLTableCellElement
) => void;

/** opens the context menu on a cell, from the `<td>` that was secondary-clicked */
export type OpenCellMenu = (
  target: CellMenuTarget,
  cell: HTMLTableCellElement
) => void;

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
export function useCellDialogs(
  onValueUpdated:
    | ((rowIndex: number, columnName: string, value: unknown) => void)
    | undefined
): CellDialogs {
  // the value shown by the detail modal, `null` when it is closed
  const [cellDetail, setCellDetail] = useState<CellDetail | null>(null);
  const { rememberCell, flashCell } = useWrittenCellFlash();

  const showCellDetail = useCallback<ShowCellDetail>(
    (detail, cell) => {
      rememberCell(cell);
      setCellDetail(detail);
    },
    [rememberCell]
  );

  // the cell the context menu is open on, `null` when it is closed
  const [menuTarget, setMenuTarget] = useState<CellMenuTarget | null>(null);

  const openCellMenu = useCallback<OpenCellMenu>(
    (target, cell) => {
      // the menu can write the cell too, which then flashes like any write
      rememberCell(cell);
      setMenuTarget(target);
    },
    [rememberCell]
  );

  const { database } = useDatabaseContext();

  const saveCell = useCallback(
    async ({ detail, newValue, originalValue, force }: SaveCellParams) => {
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
        isJsonColumn: column.detail?.json ?? false,
        force,
      });

      if (outcome.status === UpdateCellStatus.Updated) {
        flashCell();
        onValueUpdated?.(detail.rowIndex, column.name, outcome.value);
      }

      return outcome;
    },
    [database, flashCell, onValueUpdated]
  );

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
