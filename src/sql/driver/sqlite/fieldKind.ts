import { FieldKind } from '../../resultField';

/** The declared types that say more than their affinity, which is numeric. */
enum TypeName {
  Date = 'DATE',
  DateTime = 'DATETIME',
  Timestamp = 'TIMESTAMP',
  Time = 'TIME',
  Json = 'JSON',
}

const KIND_BY_NAME: ReadonlyMap<string, FieldKind> = new Map([
  [TypeName.Date, FieldKind.Date],
  [TypeName.DateTime, FieldKind.DateTime],
  [TypeName.Timestamp, FieldKind.DateTime],
  [TypeName.Time, FieldKind.Time],
  [TypeName.Json, FieldKind.Json],
]);

/** SQLite's affinity rules, in its order: the first of these a declared type contains decides. */
const KIND_BY_AFFINITY_MARK: ReadonlyArray<[string, FieldKind]> = [
  ['INT', FieldKind.Number],
  ['CHAR', FieldKind.String],
  ['CLOB', FieldKind.Text],
  ['TEXT', FieldKind.Text],
  ['BLOB', FieldKind.Binary],
];

/**
 * The kind of a column from the type it was declared with, `null` for an expression or a column declared with none.
 * A value may still be of another type: SQLite stores what it cannot convert as it was given.
 */
export function toFieldKind(declaredType: string | null): FieldKind {
  if (!declaredType) {
    return FieldKind.Unknown;
  }

  const type = declaredType.toUpperCase();
  const [name = ''] = type.split(/[\s(]/, 1);
  const known = KIND_BY_NAME.get(name);

  if (known) {
    return known;
  }

  const affinity = KIND_BY_AFFINITY_MARK.find(([mark]) => type.includes(mark));

  // `REAL`, `FLOAT`, `DOUBLE`, and every other name, of numeric affinity: `DECIMAL(10,2)`, `BOOLEAN`
  return affinity ? affinity[1] : FieldKind.Number;
}
