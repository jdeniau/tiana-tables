import log from 'electron-log';
import pg from 'pg';
import invariant from 'tiny-invariant';
import type { Driver } from '..';
import type { ResultField } from '../../resultField';
import { asSqlError } from '../../sqlError';
import { SslMode } from '../../sslMode';
import type { QueryReturnType, ResultRow, SqlBoundValue } from '../../types';
import { toFieldKind } from './fieldKind';
import { toPositional } from './namedPlaceholders';
import { relationNames } from './relationNames';

/** The three fields read of a `pg` column, of the seven it ships. */
type PostgresField = Pick<pg.FieldDef, 'name' | 'tableID' | 'dataTypeID'>;

/**
 * What `pg` answered, in the shape the app reads.
 *
 * A statement that selects columns answers rows, `UPDATE … RETURNING` included;
 * any other answers the rows it touched. PostgreSQL hands no generated key
 * back without `RETURNING`.
 */
function toQueryReturn(result: pg.QueryResult): QueryReturnType {
  if (result.fields.length > 0) {
    return result.rows as ResultRow[];
  }

  return { affectedRows: result.rowCount ?? 0, insertId: null };
}

/** The columns of a result, as the renderer reads them, each table named from its OID. */
function toResultFields(
  fields: PostgresField[],
  tables: ReadonlyMap<number, string | null>
): ResultField[] {
  return fields.map((field) => ({
    name: field.name,
    table: tables.get(field.tableID) ?? null,
    kind: toFieldKind(field.dataTypeID),
  }));
}

/** A statement the server refused carries a SQLSTATE `code`, and `pg` builds it as a `DatabaseError`. */
function asServerError(error: unknown): unknown {
  if (!(error instanceof pg.DatabaseError) || error.code === undefined) {
    return error;
  }

  return asSqlError(error, { code: error.code, sqlState: error.code });
}

/**
 * The connection timeout, which `pg` throws with a message and no `code`:
 * given the code a network timeout has, it is classified as one.
 */
function asTimeout(error: unknown): unknown {
  if (
    error instanceof Error &&
    !('code' in error) &&
    /timeout/i.test(error.message)
  ) {
    return Object.assign(error, { code: 'ETIMEDOUT' });
  }

  return error;
}

/**
 * Whether `pg` refused a query for want of a socket, which it only says in a message.
 * Measured: `… is not queryable` once the server or the app ended it, `Connection terminated` mid-query.
 */
function isConnectionLost(error: unknown): boolean {
  return (
    error instanceof Error &&
    /is not queryable|Connection terminated/.test(error.message)
  );
}

/**
 * The types `pg` decodes, each into what the app reads it as: the rest stays as the server spells it.
 *
 * A boolean, a number, a date as a `Date`, JSON as an object and bytes as a `Buffer`,
 * as mysql2 answers them. `pg` would also decode an array, an interval or a point into
 * objects that no editor can write back: `{math,poetry}` is what PostgreSQL reads.
 */
const DECODED: ReadonlySet<number> = new Set(
  (
    [
      'BOOL',
      'INT2',
      'INT4',
      'OID',
      'FLOAT4',
      'FLOAT8',
      'DATE',
      'TIMESTAMP',
      'TIMESTAMPTZ',
      'JSON',
      'JSONB',
      'BYTEA',
    ] as const
  ).map((name) => pg.types.builtins[name])
);

const types = {
  getTypeParser: ((oid: number, format?: 'text' | 'binary') =>
    DECODED.has(oid)
      ? pg.types.getTypeParser(oid, format)
      : (value: string) => value) as typeof pg.types.getTypeParser,
};

/** The TLS options of each mode: `true` is Node's own check, of the chain and of the host name. */
const SSL_OPTIONS: Readonly<Record<SslMode, pg.ClientConfig['ssl']>> = {
  [SslMode.Disable]: false,
  [SslMode.Require]: { rejectUnauthorized: false },
  [SslMode.VerifyFull]: true,
};

export const postgresDriver: Driver = {
  async connect(params, options) {
    // a PostgreSQL connection opens one database, and browses its schemas
    invariant(params.database, 'A PostgreSQL connection names a database');

    const client = new pg.Client({
      host: params.host,
      port: params.port,
      user: params.user,
      password: params.password,
      database: params.database,
      ssl: SSL_OPTIONS[params.ssl],
      connectionTimeoutMillis: options.connectTimeoutMs,
      types,
    });

    try {
      await client.connect();
    } catch (error) {
      throw asTimeout(error);
    }

    client.on('end', options.onClosed);

    const tablesOf = relationNames(async (oids) => {
      const { rows } = await client.query({
        text: 'SELECT oid, relname FROM pg_catalog.pg_class WHERE oid = ANY ($1)',
        values: [oids],
      });

      return rows;
    });

    client.on('error', (error) => {
      log.error(error);

      // end it here: the `end` event that follows is what makes the stack open
      // a fresh connection on the next query
      client.end();
    });

    return {
      query: async (statement) => {
        const { text, values } =
          statement.values === undefined
            ? { text: statement.sql, values: undefined }
            : toPositional(statement.sql, statement.values);

        // `queryMode` is missing from `@types/pg`, which types `rowMode` as required when given
        const config: pg.QueryConfig<SqlBoundValue[]> & {
          rowMode?: 'array';
          queryMode: 'extended';
        } = {
          text,
          values,
          rowMode: statement.rowsAsArray ? 'array' : undefined,
          // the simple protocol would run `SELECT 1; DROP …` as two statements:
          // the extended one refuses it, as mysql2 does without `multipleStatements`
          queryMode: 'extended',
        };

        try {
          const result = await client.query(config);
          const tables = await tablesOf(
            result.fields.map((field) => field.tableID)
          );

          return [toQueryReturn(result), toResultFields(result.fields, tables)];
        } catch (error) {
          throw asServerError(error);
        }
      },

      end: () => client.end(),

      isConnectionLost,
    };
  },
};

export const testables = {
  SSL_OPTIONS,
  asServerError,
  asTimeout,
  isConnectionLost,
  toQueryReturn,
  toResultFields,
  types,
};
