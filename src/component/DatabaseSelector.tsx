import {
  ConnectionContext,
  DatabaseContext,
  useConfiguration,
} from '../Contexts';
import { useContext, useEffect, useState } from 'react';
import { Select } from 'antd';

interface DatabaseRow {
  Database: string;
}

export default function DatabaseSelector() {
  const { currentConnectionName } = useContext(ConnectionContext);
  const { updateConnectionState, configuration } = useConfiguration();

  const [databaseList, setDatabaseList] = useState<DatabaseRow[]>([]);

  const { database, setDatabase, executeQuery } = useContext(DatabaseContext);

  useEffect(() => {
    executeQuery('SHOW DATABASES;').then(([result]) => {
      if (result) {
        setDatabaseList(result);
        setDatabase(
          // TODO : add a helpen for appState ?
          configuration.connections[currentConnectionName]?.appState
            .activeDatabase ?? result[0].Database
        );
      }
    });
  }, [currentConnectionName, setDatabase]);

  // TODO migrate that into something that does only the side effect ?
  useEffect(() => {
    updateConnectionState(currentConnectionName, 'activeDatabase', database);
  }, [currentConnectionName, database]);

  return (
    <Select
      popupMatchSelectWidth={false}
      onChange={setDatabase}
      value={database || undefined}
      fieldNames={{ label: 'Database', value: 'Database' }}
      options={databaseList}
      style={{ width: '100%' }}
    />
  );
}
