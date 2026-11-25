import { queryOptions, skipToken, useQuery } from '@tanstack/react-query';
import { useConnectionContext } from '../../../contexts/ConnectionContext';
import { useDatabaseContext } from '../../../contexts/DatabaseContext';
import type { QueryHistoryContent } from '../../../sql/history/recordedStatement';
import { queryKeys } from '../../queryKeys';

function queryHistoryQuery<T>(
  connectionSlug: string | null,
  database: string | null,
  select: (content: QueryHistoryContent) => T
) {
  return queryOptions({
    queryKey: queryKeys.queryHistory(connectionSlug ?? '', database ?? ''),
    queryFn:
      connectionSlug && database
        ? () => window.queryHistory.load(connectionSlug, database)
        : skipToken,
    select,
  });
}

/**
 * What the history of the current database tells through `select`, `undefined` until it is loaded.
 * `select` is a function of a module, so that it runs once per answer.
 */
export default function useQueryHistory<T>(
  select: (content: QueryHistoryContent) => T
): T | undefined {
  const { currentConnectionSlug } = useConnectionContext();
  const { database } = useDatabaseContext();

  return useQuery(queryHistoryQuery(currentConnectionSlug, database, select))
    .data;
}
