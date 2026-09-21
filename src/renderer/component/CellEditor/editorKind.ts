import { DataType, readDataType } from '../../../sql/dataType';
import { FieldKind } from '../../../sql/resultField';
import type { ColumnDetail } from '../../../sql/types';

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
 * Whether a text is worth handing to the JSON editor.
 *
 * The same heuristic as the read-only view (`cellValueToText`): JSON stored in
 * a text column is common, the column type never says so, and a bare scalar
 * gains nothing from a structured editor.
 */
export function looksLikeJson(text: string): boolean {
  const trimmed = text.trim();

  if (!trimmed.startsWith('{') && !trimmed.startsWith('[')) {
    return false;
  }

  try {
    JSON.parse(trimmed);

    return true;
  } catch {
    return false;
  }
}

/**
 * Pick the editor for a cell.
 *
 * The kind of the field decides whenever it can — the very kind the grid
 * rendered the value with, so an editor never disagrees with what was shown.
 *
 * `ENUM` and `SET` are the exception: the protocol reports such a column as a
 * plain string, and while its flags do name the two, they do not carry the
 * accepted values — which is what an editor for a closed set needs, and what
 * INFORMATION_SCHEMA is asked for anyway.
 *
 * `text` is the fallback, and a fine one: everything MySQL accepts can be
 * written as a text literal, so an unknown type degrades to a textarea rather
 * than to no editor at all.
 */
export function resolveEditorKind(
  column: ColumnDetail,
  fieldKind: FieldKind,
  text: string
): EditorKind {
  const dataType = readDataType(column.DataType);

  if (dataType === DataType.Enum) {
    return EditorKind.Enum;
  }

  if (dataType === DataType.Set) {
    return EditorKind.Set;
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

  return looksLikeJson(text) ? EditorKind.Json : EditorKind.Text;
}
