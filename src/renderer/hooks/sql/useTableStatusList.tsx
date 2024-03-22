import { useEffect, useState } from 'react';
import { RowDataPacket } from 'mysql2';
import { useConnectionContext } from '../../../contexts/ConnectionContext';
import { useDatabaseContext } from '../../../contexts/DatabaseContext';

export interface TableStatusRow extends RowDataPacket {
  Name: string;
}
export function useTableStatusList(): TableStatusRow[] | null {
  const { currentConnectionSlug } = useConnectionContext();
  const { executeQuery, database } = useDatabaseContext();
  const [tableStatusList, setTableStatusList] = useState<
    TableStatusRow[] | null
  >(null);

  useEffect(() => {
    if (!currentConnectionSlug || !database) {
      return;
    }

    executeQuery<TableStatusRow[]>(
      `SHOW TABLE STATUS FROM \`${database}\`;`
    ).then(([result]) => {
      setTableStatusList(result);
    });
  }, [currentConnectionSlug, database, executeQuery]);

  return tableStatusList;
}
