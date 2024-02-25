import { useConfiguration } from '../contexts/ConfigurationContext';
import { DatabaseContext } from '../contexts/DatabaseContext';
import { ConnectionContext } from '../contexts/ConnectionContext';
import { useCallback, useContext, useEffect, useState } from 'react';
import { Select } from 'antd';
import { useNavigate } from 'react-router';

interface DatabaseRow {
  Database: string;
}

export default function DatabaseSelector() {
  const { currentConnectionName } = useContext(ConnectionContext);
  const { updateConnectionState, configuration } = useConfiguration();
  const navigate = useNavigate();
  const [databaseList, setDatabaseList] = useState<DatabaseRow[]>([]);
  const { database, setDatabase, executeQuery } = useContext(DatabaseContext);

  useEffect(() => {
    executeQuery('SHOW DATABASES;').then(([result]) => {
      if (result) {
        setDatabaseList(result);

        // TODO : add a helper for appState ?
        const currentDatabase =
          configuration.connections[currentConnectionName]?.appState
            .activeDatabase ?? result[0].Database;

        setDatabase(currentDatabase);
      }
    });
  }, [currentConnectionName]);

  // TODO migrate that into something that does only the side effect ?
  useEffect(() => {
    updateConnectionState(currentConnectionName, 'activeDatabase', database);
  }, [currentConnectionName, database]);

  const handleChange = useCallback(
    (database: string) => {
      setDatabase(database);
    },
    [currentConnectionName, navigate]
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
