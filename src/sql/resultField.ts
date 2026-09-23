/**
 * What a column holds, as far as the app needs to know.
 *
 * The renderer decides from a kind — the alignment, the editor, which axis a
 * chart offers — so no protocol number of an engine reaches it. `String` and
 * `Text` are two members because the grid colours them differently, not because
 * SQL tells them apart.
 */
export enum FieldKind {
  Number = 'number',
  Date = 'date',
  DateTime = 'datetime',
  Time = 'time',
  Boolean = 'boolean',
  String = 'string',
  Text = 'text',
  Json = 'json',
  Binary = 'binary',
  Array = 'array',
  /** the server named a type the app makes nothing of */
  Unknown = 'unknown',
}

/** One column of a result, as the renderer sees it. */
export interface ResultField {
  name: string;
  /** what it was selected from — the alias when it has one, `null` for an expression */
  table: string | null;
  kind: FieldKind;
}
