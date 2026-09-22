import type { ColumnDetail } from './dialect/metadata';

/** Why a cell cannot be written. Doubles as the ICU selector of its message. */
export enum NotEditableReason {
  /** no row in the schema: a computed column of a raw query, a view… */
  UnknownColumn = 'unknownColumn',
  /** raw bytes, which a text editor would corrupt rather than edit */
  Binary = 'binary',
  /** computed by the server, which refuses to be told what it holds */
  Generated = 'generated',
  /** nothing identifies the row, so no UPDATE can target it */
  NoPrimaryKey = 'noPrimaryKey',
}

export type CellEditability =
  | { editable: true }
  | { editable: false; reason: NotEditableReason };

const EDITABLE: CellEditability = { editable: true };

export function getCellEditability(
  column: ColumnDetail | undefined,
  hasPrimaryKey: boolean
): CellEditability {
  if (!hasPrimaryKey) {
    return { editable: false, reason: NotEditableReason.NoPrimaryKey };
  }

  if (!column) {
    return { editable: false, reason: NotEditableReason.UnknownColumn };
  }

  if (column.generated) {
    return { editable: false, reason: NotEditableReason.Generated };
  }

  if (column.binary) {
    return { editable: false, reason: NotEditableReason.Binary };
  }

  return EDITABLE;
}
