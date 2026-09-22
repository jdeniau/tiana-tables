/**
 * The `DATA_TYPE` of `INFORMATION_SCHEMA.COLUMNS`.
 *
 * A vocabulary of its own, and not the one the driver exports as `Types`:
 * those are the field types of the wire protocol, which collapse distinctions
 * that matter here — `TEXT` and `BLOB` share a single protocol type, and an
 * `ENUM` column is announced as a plain string. Where the protocol can answer,
 * read `Types`; where only the schema can, read this.
 *
 * The list covers the types MySQL 8 declares. A server may still answer
 * something absent from it — MariaDB adds `inet4`, `inet6` and `uuid` — so a
 * value read from the database stays a `string`, compared against these
 * members rather than narrowed to them.
 *
 * @public
 */
export enum DataType {
  // Numeric
  Bit = 'bit',
  TinyInt = 'tinyint',
  SmallInt = 'smallint',
  MediumInt = 'mediumint',
  Int = 'int',
  Integer = 'integer',
  BigInt = 'bigint',
  Decimal = 'decimal',
  Numeric = 'numeric',
  Float = 'float',
  Double = 'double',
  Real = 'real',

  // Date and time
  Date = 'date',
  DateTime = 'datetime',
  Timestamp = 'timestamp',
  Time = 'time',
  Year = 'year',

  // Text
  Char = 'char',
  VarChar = 'varchar',
  TinyText = 'tinytext',
  Text = 'text',
  MediumText = 'mediumtext',
  LongText = 'longtext',

  // Bytes
  Binary = 'binary',
  VarBinary = 'varbinary',
  TinyBlob = 'tinyblob',
  Blob = 'blob',
  MediumBlob = 'mediumblob',
  LongBlob = 'longblob',

  // Closed sets of values, whose members live in `COLUMN_TYPE`
  Enum = 'enum',
  Set = 'set',

  Json = 'json',

  // Spatial
  Geometry = 'geometry',
  Point = 'point',
  LineString = 'linestring',
  Polygon = 'polygon',
  MultiPoint = 'multipoint',
  MultiLineString = 'multilinestring',
  MultiPolygon = 'multipolygon',
  GeometryCollection = 'geometrycollection',
}

/**
 * The `DATA_TYPE` of a column, lower-cased.
 *
 * MySQL answers in lower case already, but the case is not guaranteed across
 * servers, and every comparison in the code is against a lower-case member.
 */
export function readDataType(dataType: string | undefined): string {
  return dataType?.toLowerCase() ?? '';
}
