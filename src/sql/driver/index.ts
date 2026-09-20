import invariant from 'tiny-invariant';
import { DatabaseEngine } from '../engine';
import type { QueryResult, QueryReturnType, SqlBoundValues } from '../types';

/**
 * What a server needs to be reached. Named one by one rather than spread from
 * the stored connection: the configuration holds fields no driver should see,
 * and a new one must not start reaching it by accident.
 */
interface ConnectionParams {
  host: string;
  port: number;
  user: string;
  /** in clear — the only thing that reads back what the configuration stores */
  password: string;
}

interface ConnectOptions {
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
  query<T extends QueryReturnType>(statement: DriverQuery): QueryResult<T>;
  end(): Promise<void>;

  /**
   * Whether the error says this socket is gone, so that one retry on a fresh
   * connection is worth it. On the connection rather than on the driver: only a
   * query sent down an open one can lose it.
   */
  isConnectionLost(error: unknown): boolean;
}

export interface Driver {
  connect(
    params: ConnectionParams,
    options: ConnectOptions
  ): Promise<DriverConnection>;
}

const IMPORTS: Record<DatabaseEngine, () => Promise<Driver>> = {
  [DatabaseEngine.MySQL]: () =>
    import('./mysql/index').then((m) => m.mysqlDriver),
};

const loaded = new Map<DatabaseEngine, Promise<Driver>>();

/**
 * The driver of an engine, imported the first time a connection to it opens.
 *
 * Lazily, so that neither driver weighs on app startup, and memoised so that
 * parallel handshakes share one import.
 */
export function loadDriver(engine: DatabaseEngine): Promise<Driver> {
  const pending = loaded.get(engine);

  if (pending) {
    return pending;
  }

  const load = IMPORTS[engine];

  // nothing validates the configuration file, so an unknown engine reaches here
  invariant(load, `No driver for engine "${engine}"`);

  const driver = load();

  loaded.set(engine, driver);

  return driver;
}
