import { useCallback } from 'react';
import { Select } from 'antd';
import { useDatabaseContext } from '../../contexts/DatabaseContext';
import type { ShowDatabasesResult } from '../../sql/types';

export default function DatabaseSelector({
  databaseList,
}: {
  databaseList: ShowDatabasesResult;
}) {
  const { database, setDatabase } = useDatabaseContext();

  const handleChange = useCallback(
    (database: string) => {
      setDatabase(database);
    },
    [setDatabase]
  );

  return (
    <Select
      popupMatchSelectWidth={false}
      onChange={handleChange}
      value={database || undefined}
      fieldNames={{ label: 'Database', value: 'Database' }}
      options={databaseList}
      style={{ width: '100%' }}
    />
  );
}
