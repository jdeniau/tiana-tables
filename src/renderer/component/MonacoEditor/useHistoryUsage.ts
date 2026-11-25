import { queryOptions, skipToken, useQuery } from '@tanstack/react-query';
import { useConnectionContext } from '../../../contexts/ConnectionContext';
import { useDatabaseContext } from '../../../contexts/DatabaseContext';
import { HistoryUsage } from '../../../sql/history/HistoryUsage';
import type { QueryHistoryContent } from '../../../sql/history/recordedStatement';
import { queryKeys } from '../../queryKeys';

const NO_USAGE = new HistoryUsage([]);

/** a function of the module, so that the query computes it once per answer */
function toUsage({ blocks }: QueryHistoryContent): HistoryUsage {
  return new HistoryUsage(blocks);
}

function historyUsageQuery(
  connectionSlug: string | null,
  database: string | null
) {
  return queryOptions({
    queryKey: queryKeys.queryHistory(connectionSlug ?? '', database ?? ''),
    queryFn:
      connectionSlug && database
        ? () => window.queryHistory.load(connectionSlug, database)
        : skipToken,
    select: toUsage,
  });
}

/** what the history of the current database tells of its tables and columns, nothing until it is loaded */
export default function useHistoryUsage(): HistoryUsage {
  const { currentConnectionSlug } = useConnectionContext();
  const { database } = useDatabaseContext();
  const { data } = useQuery(historyUsageQuery(currentConnectionSlug, database));

  return data ?? NO_USAGE;
}
