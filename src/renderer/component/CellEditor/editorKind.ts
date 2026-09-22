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
 * A closed set comes first: the protocol reports it as a plain string,
 * without the values the editor needs.
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

  return looksLikeJson(text) ? EditorKind.Json : EditorKind.Text;
}
