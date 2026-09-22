import { useMemo } from 'react';
import { useAllColumnsContext } from '../../../contexts/AllColumnsContext';
import { useDatabaseContext } from '../../../contexts/DatabaseContext';
import { useTableListContext } from '../../../contexts/TableListContext';
import { QuerySchema } from './queryAnalysis';

/** what the editor knows of the current database, indexed for lookups */
export default function useQuerySchema(): QuerySchema {
  const { database } = useDatabaseContext();
  const tableList = useTableListContext();
  const allColumns = useAllColumnsContext();

  return useMemo(() => {
    const columns = new Map<string, Set<string>>();

    for (const { table, name } of allColumns.getAllColumns()) {
      const tableColumns = columns.get(table) ?? new Set<string>();

      // MySQL ignores the case of column names
      tableColumns.add(name.toLowerCase());
      columns.set(table, tableColumns);
    }

    return {
      database,
      tables: new Set(tableList),
      columns,
    };
  }, [allColumns, database, tableList]);
}
