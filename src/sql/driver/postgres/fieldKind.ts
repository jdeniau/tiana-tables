import pg from 'pg';
import { FieldKind } from '../../resultField';

type BuiltinType = keyof typeof pg.types.builtins;

/**
 * What the app makes of every built-in type PostgreSQL announces a column with.
 *
 * Keyed by `pg`'s own names, and held to its list by `fieldKind.test.ts`:
 * a type missing from the table would read as `Unknown` in silence.
 * Arrays, enums and domains have no fixed OID, so they are not here.
 */
const KIND_BY_TYPE: Readonly<Record<BuiltinType, FieldKind>> = {
  INT2: FieldKind.Number,
  INT4: FieldKind.Number,
  // answered as a string, like a `NUMERIC`: a JavaScript number would round it
  INT8: FieldKind.Number,
  FLOAT4: FieldKind.Number,
  FLOAT8: FieldKind.Number,
  NUMERIC: FieldKind.Number,
  OID: FieldKind.Number,

  BOOL: FieldKind.Boolean,

  DATE: FieldKind.Date,
  TIMESTAMP: FieldKind.DateTime,
  TIMESTAMPTZ: FieldKind.DateTime,
  TIME: FieldKind.Time,
  TIMETZ: FieldKind.Time,

  // the short strings, coloured like MySQL's `VARCHAR`
  VARCHAR: FieldKind.String,
  BPCHAR: FieldKind.String,
  CHAR: FieldKind.String,
  UUID: FieldKind.String,
  INET: FieldKind.String,
  CIDR: FieldKind.String,
  MACADDR: FieldKind.String,
  MACADDR8: FieldKind.String,
  // `010`, the bits spelt out
  BIT: FieldKind.String,
  VARBIT: FieldKind.String,

  // unbounded text, coloured like MySQL's `TEXT`
  TEXT: FieldKind.Text,
  XML: FieldKind.Text,
  MONEY: FieldKind.Text,
  // `1 day 02:00:00`: kept as the server spells it (see the driver)
  INTERVAL: FieldKind.Text,
  TSVECTOR: FieldKind.Text,
  TSQUERY: FieldKind.Text,

  JSON: FieldKind.Json,
  JSONB: FieldKind.Json,

  BYTEA: FieldKind.Binary,

  // the catalog's own vocabulary, and geometry answered as objects
  REGPROC: FieldKind.Unknown,
  REGPROCEDURE: FieldKind.Unknown,
  REGOPER: FieldKind.Unknown,
  REGOPERATOR: FieldKind.Unknown,
  REGCLASS: FieldKind.Unknown,
  REGTYPE: FieldKind.Unknown,
  REGCONFIG: FieldKind.Unknown,
  REGDICTIONARY: FieldKind.Unknown,
  REGNAMESPACE: FieldKind.Unknown,
  REGROLE: FieldKind.Unknown,
  TID: FieldKind.Unknown,
  XID: FieldKind.Unknown,
  CID: FieldKind.Unknown,
  PG_NODE_TREE: FieldKind.Unknown,
  SMGR: FieldKind.Unknown,
  PATH: FieldKind.Unknown,
  POLYGON: FieldKind.Unknown,
  CIRCLE: FieldKind.Unknown,
  ABSTIME: FieldKind.Unknown,
  RELTIME: FieldKind.Unknown,
  TINTERVAL: FieldKind.Unknown,
  ACLITEM: FieldKind.Unknown,
  REFCURSOR: FieldKind.Unknown,
  TXID_SNAPSHOT: FieldKind.Unknown,
  PG_LSN: FieldKind.Unknown,
  PG_NDISTINCT: FieldKind.Unknown,
  PG_DEPENDENCIES: FieldKind.Unknown,
  GTSVECTOR: FieldKind.Unknown,
};

const KIND_BY_OID: ReadonlyMap<number, FieldKind> = new Map(
  Object.entries(KIND_BY_TYPE).map(([name, kind]) => [
    pg.types.builtins[name as BuiltinType],
    kind,
  ])
);

/** The kind of a column, `Unknown` for a type that is not built in. */
export function toFieldKind(dataTypeID: number): FieldKind {
  return KIND_BY_OID.get(dataTypeID) ?? FieldKind.Unknown;
}

export const testables = {
  KIND_BY_TYPE,
};
