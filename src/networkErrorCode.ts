/** The `code`s Node gives a failed connection, which the SSH tunnel and the PostgreSQL driver give theirs too. */
export enum NetworkErrorCode {
  TimedOut = 'ETIMEDOUT',
  Refused = 'ECONNREFUSED',
  NotFound = 'ENOTFOUND',
  DnsTryAgain = 'EAI_AGAIN',
  Reset = 'ECONNRESET',
}
