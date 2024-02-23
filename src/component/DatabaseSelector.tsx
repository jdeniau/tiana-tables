import { ConnectionContext, DatabaseContext } from '../Contexts';
import { useContext, useEffect, useState } from 'react';
import { Select } from 'antd';

interface DatabaseRow {
  Database: string;
}

export default function DatabaseSelector() {
  const { currentConnectionName } = useContext(ConnectionContext);

  const [databaseList, setDatabaseList] = useState<DatabaseRow[]>([]);

  const { database, setDatabase, executeQuery } = useContext(DatabaseContext);

  useEffect(() => {
    executeQuery('SHOW DATABASES;').then(([result]) => {
      if (result) {
        setDatabaseList(result);
        setDatabase(result[0].Database);
      }
    });
  }, [currentConnectionName, setDatabase]);

  return (
    <Select
      popupMatchSelectWidth={false}
      onChange={setDatabase}
      value={database || undefined}
      fieldNames={{ label: 'Database', value: 'Database' }}
      options={databaseList}
    />
  );
}
