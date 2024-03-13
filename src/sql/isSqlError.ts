import { SqlError } from './errorSerializer';

export function isSqlError(e: unknown): e is SqlError {
  return typeof e === 'object' && e !== null && 'code' in e && 'errno' in e;
}
