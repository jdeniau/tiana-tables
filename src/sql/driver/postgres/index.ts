import log from 'electron-log';
import pg from 'pg';
import invariant from 'tiny-invariant';
import type { Driver } from '..';
import type { ResultField } from '../../resultField';
import { asSqlError } from '../../sqlError';
import type { QueryReturnType, ResultRow, SqlBoundValue } from '../../types';
import { toFieldKind } from './fieldKind';
import { toPositional } from './namedPlaceholders';

/** The two fields read of a `pg` column, of the seven it ships. */
type PostgresField = Pick<pg.FieldDef, 'name' | 'dataTypeID'>;

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

/**
 * The columns of a result, as the renderer reads them.
 * `table` stays `null` until the relation OID `pg` gives is resolved to a name.
 */
function toResultFields(fields: PostgresField[]): ResultField[] {
  return fields.map((field) => ({
    name: field.name,
    table: null,
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

/** An interval kept as the server spells it, `1 day 02:00:00`, rather than as `pg`'s object. */
const types = {
  getTypeParser: ((oid: number, format?: 'text' | 'binary') =>
    oid === pg.types.builtins.INTERVAL
      ? (value: string) => value
      : pg.types.getTypeParser(oid, format)) as typeof pg.types.getTypeParser,
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
      connectionTimeoutMillis: options.connectTimeoutMs,
      types,
    });

    try {
      await client.connect();
    } catch (error) {
      throw asTimeout(error);
    }

    client.on('end', options.onClosed);

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

          return [toQueryReturn(result), toResultFields(result.fields)];
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
  asServerError,
  asTimeout,
  isConnectionLost,
  toQueryReturn,
  toResultFields,
};
