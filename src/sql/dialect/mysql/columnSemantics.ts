import { DataType, readDataType } from './dataType';

/** Types holding bytes, which a text editor would corrupt. */
const BINARY_DATA_TYPES: ReadonlySet<string> = new Set([
  DataType.Binary,
  DataType.VarBinary,
  DataType.TinyBlob,
  DataType.Blob,
  DataType.MediumBlob,
  DataType.LongBlob,
  DataType.Bit,
  DataType.Geometry,
]);

export function isBinary(dataType: string): boolean {
  return BINARY_DATA_TYPES.has(readDataType(dataType));
}

export function isJson(dataType: string): boolean {
  return readDataType(dataType) === DataType.Json;
}

/** A `SET` holds several of its values at once, where an `ENUM` holds one. */
export function isMultiValued(dataType: string): boolean {
  return readDataType(dataType) === DataType.Set;
}

/** `EXTRA` reads `VIRTUAL GENERATED` or `STORED GENERATED` on such a column. */
export function isGenerated(extra: string | null): boolean {
  return /GENERATED/i.test(extra ?? '');
}

export function isNullable(isNullableColumn: string | null): boolean {
  return isNullableColumn?.toUpperCase() === 'YES';
}

/**
 * The values of an `enum('draft','sent')` or `set(…)` declaration,
 * empty for any other type.
 * Parsed rather than split on commas:
 * a value may hold a comma, or a quote written `''` or `\'`.
 */
export function parseEnumValues(columnType: string): Array<string> {
  // a grammar over `COLUMN_TYPE`, not a `DATA_TYPE` value, so it stays a literal pattern
  const declaration = /^(?:enum|set)\s*\((.*)\)$/is.exec(columnType.trim());

  if (!declaration) {
    return [];
  }

  const body = declaration[1];
  const values: Array<string> = [];
  let current = '';
  let inValue = false;

  for (let index = 0; index < body.length; index++) {
    const char = body[index];

    if (!inValue) {
      // between two values: only the opening quote matters
      inValue = char === "'";
      continue;
    }

    if (char === '\\' && index + 1 < body.length) {
      current += body[index + 1];
      index++;
      continue;
    }

    if (char === "'") {
      if (body[index + 1] === "'") {
        current += "'";
        index++;
        continue;
      }

      values.push(current);
      current = '';
      inValue = false;
      continue;
    }

    current += char;
  }

  return values;
}
