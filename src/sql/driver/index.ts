import type { Duplex } from 'node:stream';
import invariant from 'tiny-invariant';
import { DatabaseEngine } from '../engine';
import type { SslMode } from '../sslMode';
import type { QueryResult, SqlBoundValues } from '../types';

/**
 * What a server needs to be reached. Named one by one rather than spread from
 * the stored connection: the configuration holds fields no driver should see,
 * and a new one must not start reaching it by accident.
 */
export interface ServerConnectionParams {
  host: string;
  port: number;
  user: string;
  /** in clear — the only thing that reads back what the configuration stores */
  password: string;
  /** the database a PostgreSQL connection opens; MySQL switches with `USE` instead */
  database?: string;
  ssl: SslMode;
  /** a tunnel already open to the server: `host` and `port` are then only the names TLS checks */
  stream?: Duplex;
}

/** What SQLite needs: the file it opens, which is never created. */
export interface FileConnectionParams {
  file: string;
}

export interface ConnectOptions {
  connectTimeoutMs: number;
  /** the socket is gone, so the stack can forget the connection */
  onClosed(): void;
}

interface DriverQuery {
  sql: string;
  /** the parameters by name; absent means the SQL is the user's own and travels as written */
  values?: SqlBoundValues;
  rowsAsArray: boolean;
}

export interface DriverConnection {
  /** Whatever the server answered: narrowing it is the caller's claim, never a driver's. */
  query(statement: DriverQuery): QueryResult;
  end(): Promise<void>;

  /**
   * Whether the error says this socket is gone, so that one retry on a fresh
   * connection is worth it. On the connection rather than on the driver: only a
   * query sent down an open one can lose it.
   */
  isConnectionLost(error: unknown): boolean;
}

export interface Driver<Params> {
  connect(params: Params, options: ConnectOptions): Promise<DriverConnection>;
}

/** What the driver of each engine is given to connect. */
interface ParamsByEngine {
  [DatabaseEngine.MySQL]: ServerConnectionParams;
  [DatabaseEngine.PostgreSQL]: ServerConnectionParams;
  [DatabaseEngine.SQLite]: FileConnectionParams;
}

type DriverOf<Engine extends DatabaseEngine> = Driver<ParamsByEngine[Engine]>;

/** An import run the first time it is asked for, so that parallel handshakes share it. */
function once<Value>(load: () => Promise<Value>): () => Promise<Value> {
  let pending: Promise<Value> | undefined;

  return () => (pending ??= load());
}

const IMPORTS: {
  [Engine in DatabaseEngine]: () => Promise<DriverOf<Engine>>;
} = {
  [DatabaseEngine.MySQL]: once(() =>
    import('./mysql/index').then((m) => m.mysqlDriver)
  ),
  [DatabaseEngine.PostgreSQL]: once(() =>
    import('./postgres/index').then((m) => m.postgresDriver)
  ),
  [DatabaseEngine.SQLite]: once(() =>
    import('./sqlite/index').then((m) => m.sqliteDriver)
  ),
};

/**
 * The driver of an engine, imported the first time a connection to it opens,
 * so that no driver weighs on app startup.
 */
export function loadDriver<Engine extends DatabaseEngine>(
  engine: Engine
): Promise<DriverOf<Engine>> {
  const load = IMPORTS[engine];

  // nothing validates the configuration file, so an unknown engine reaches here
  invariant(load, `No driver for engine "${engine}"`);

  return load();
}
