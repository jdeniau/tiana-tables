import type { ColumnDetail } from '../../../sql/dialect/metadata';
import { FieldKind } from '../../../sql/resultField';

/** Which editor a cell gets. */
export enum EditorKind {
  Enum = 'enum',
  Set = 'set',
  Date = 'date',
  DateTime = 'datetime',
  Number = 'number',
  Json = 'json',
  Text = 'text',
}

/**
 * Pick the editor for a cell.
 *
 * The kind of the field decides, and the value never does: it is the very kind
 * the grid rendered the value with, and typing cannot switch the editor.
 *
 * A closed set comes first: the protocol reports it as a plain string,
 * without the values the editor needs.
 *
 * `text` is the fallback, and a fine one: everything MySQL accepts can be
 * written as a text literal, so an unknown type degrades to a textarea rather
 * than to no editor at all.
 */
export function resolveEditorKind(
  column: ColumnDetail,
  fieldKind: FieldKind
): EditorKind {
  if (column.allowedValues.length > 0) {
    return column.multiValued ? EditorKind.Set : EditorKind.Enum;
  }

  if (fieldKind === FieldKind.Date) {
    return EditorKind.Date;
  }

  if (fieldKind === FieldKind.DateTime) {
    return EditorKind.DateTime;
  }

  if (fieldKind === FieldKind.Number) {
    return EditorKind.Number;
  }

  if (fieldKind === FieldKind.Json) {
    return EditorKind.Json;
  }

  return EditorKind.Text;
}
