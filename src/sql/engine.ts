/**
 * The server family a connection talks to: a driver and a dialect, not a product.
 *
 * MariaDB is `MySQL` here — same wire protocol, same driver, same quoting. What
 * does set the two apart (`JSON` is only a `LONGTEXT` alias on MariaDB) the
 * server declares itself, so it is never asked of the user.
 */
export enum DatabaseEngine {
  MySQL = 'mysql',
}
